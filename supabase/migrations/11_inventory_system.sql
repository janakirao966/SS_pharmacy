-- ==========================================
-- S.S. PHARMACY — MIGRATION 11: PRODUCTION INVENTORY, STOCK RESERVATION & OVERSELLING PREVENTION SYSTEM
-- ==========================================

-- 1. Create Inventory Master Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  allow_backorder BOOLEAN NOT NULL DEFAULT false,
  inventory_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT chk_reserved_lte_on_hand CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);

-- 2. Create Append-Only Inventory Movements Ledger Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('INITIAL_STOCK', 'MANUAL_ADJUSTMENT', 'RESERVATION_CREATED', 'RESERVATION_RELEASED', 'SALE_COMMITTED', 'CANCELLATION_RESTOCK', 'RETURN_RESTOCK', 'DAMAGE', 'EXPIRED', 'STOCK_CORRECTION')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(order_id);

-- 3. Create Stock Reservations Table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  CONSTRAINT idx_inv_res_order_prod UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON public.inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status_expires ON public.inventory_reservations(status, expires_at);

-- Seed initial stock for existing products if inventory is empty
INSERT INTO public.inventory (product_id, sku, quantity_on_hand, quantity_reserved, reorder_level)
VALUES 
  ('dr-lion-pain-cream', 'SKU-CREAM-500G', 50, 0, 5),
  ('dr-lion-pain-pills', 'SKU-PILLS-60CT', 50, 0, 5),
  ('moon-light-cream', 'SKU-MOON-50G', 50, 0, 5)
ON CONFLICT (product_id) DO NOTHING;

-- Initial Stock Ledger Entries
INSERT INTO public.inventory_movements (product_id, movement_type, quantity_change, quantity_before, quantity_after, reason)
SELECT product_id, 'INITIAL_STOCK', quantity_on_hand, 0, quantity_on_hand, 'Initial System Seed'
FROM public.inventory
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_movements WHERE reason = 'Initial System Seed');

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
DROP POLICY IF EXISTS "Admins manage inventory" ON public.inventory;
CREATE POLICY "Admins manage inventory" ON public.inventory
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view movements" ON public.inventory_movements;
CREATE POLICY "Admins view movements" ON public.inventory_movements
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view reservations" ON public.inventory_reservations;
CREATE POLICY "Admins view reservations" ON public.inventory_reservations
  FOR SELECT TO authenticated USING (public.is_admin());

-- Direct client INSERT/UPDATE/DELETE DENIED for all inventory tables.


-- 4. Server-Authoritative Reserve Stock RPC with Deterministic Sorting
CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_order_id UUID,
  p_items JSONB, -- Array of {product_id: string, quantity: number}
  p_expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes')
) RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_inv RECORD;
  v_prod_ids TEXT[];
  v_prod_id TEXT;
  v_qty INT;
  v_available INT;
  v_actor_id UUID := auth.uid();
BEGIN
  -- Extract sorted array of product_ids to lock in deterministic ASC order (prevents deadlocks)
  SELECT ARRAY_AGG(DISTINCT (item->>'product_id')) INTO v_prod_ids
  FROM jsonb_array_elements(p_items) AS item;

  -- Lock rows in deterministic ORDER BY product_id ASC FOR UPDATE
  PERFORM 1
  FROM public.inventory
  WHERE product_id = ANY(v_prod_ids)
  ORDER BY product_id ASC FOR UPDATE;

  -- Loop and validate every requested product stock
  FOR v_item IN SELECT (item->>'product_id') AS product_id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    v_prod_id := v_item.product_id;
    v_qty := v_item.quantity;

    SELECT * FROM public.inventory WHERE product_id = v_prod_id INTO v_inv;

    IF v_inv IS NULL THEN
      -- Create row if missing
      INSERT INTO public.inventory (product_id, quantity_on_hand) VALUES (v_prod_id, 0) RETURNING * INTO v_inv;
    END IF;

    IF NOT v_inv.inventory_enabled THEN
      RAISE EXCEPTION 'Item % is currently inactive or unavailable for purchase.', v_prod_id;
    END IF;

    v_available := v_inv.quantity_on_hand - v_inv.quantity_reserved;

    IF v_qty > v_available AND NOT v_inv.allow_backorder THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Requested: %, Available: %.', v_prod_id, v_qty, v_available;
    END IF;
  END LOOP;

  -- Execution phase: Create reservations and update quantity_reserved
  FOR v_item IN SELECT (item->>'product_id') AS product_id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    v_prod_id := v_item.product_id;
    v_qty := v_item.quantity;

    SELECT * FROM public.inventory WHERE product_id = v_prod_id INTO v_inv;

    -- Increase reserved stock
    UPDATE public.inventory
    SET quantity_reserved = quantity_reserved + v_qty,
        updated_at = now()
    WHERE product_id = v_prod_id;

    -- Insert active reservation record
    INSERT INTO public.inventory_reservations (order_id, product_id, quantity, status, expires_at)
    VALUES (p_order_id, v_prod_id, v_qty, 'active', p_expires_at)
    ON CONFLICT (order_id, product_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, status = 'active', expires_at = EXCLUDED.expires_at;

    -- Record append-only movement
    INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
    VALUES (v_prod_id, p_order_id, 'RESERVATION_CREATED', v_qty, v_inv.quantity_reserved, v_inv.quantity_reserved + v_qty, 'Checkout Stock Reservation Created', v_actor_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Server-Authoritative Commit Stock RPC (Payment Success / COD Packed)
CREATE OR REPLACE FUNCTION public.commit_order_stock(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_res RECORD;
  v_inv RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  -- Lock reservations associated with order
  FOR v_res IN SELECT * FROM public.inventory_reservations WHERE order_id = p_order_id FOR UPDATE LOOP
    SELECT * FROM public.inventory WHERE product_id = v_res.product_id INTO v_inv FOR UPDATE;

    IF v_res.status = 'committed' THEN
      -- Already committed idempotently
      CONTINUE;
    ELSIF v_res.status = 'active' THEN
      -- Standard Active Commitment
      UPDATE public.inventory
      SET quantity_on_hand = quantity_on_hand - v_res.quantity,
          quantity_reserved = GREATEST(0, quantity_reserved - v_res.quantity),
          updated_at = now()
      WHERE product_id = v_res.product_id;

      UPDATE public.inventory_reservations
      SET status = 'committed', committed_at = now()
      WHERE id = v_res.id;

      INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
      VALUES (v_res.product_id, p_order_id, 'SALE_COMMITTED', -v_res.quantity, v_inv.quantity_on_hand, v_inv.quantity_on_hand - v_res.quantity, 'Sale Committed on Payment/Pack', v_actor_id);

    ELSIF v_res.status = 'expired' OR v_res.status = 'released' THEN
      -- Payment-After-Expiry Race Condition Handling
      IF v_inv.quantity_on_hand >= v_res.quantity THEN
        -- Stock still available: Commit stock from on_hand directly
        UPDATE public.inventory
        SET quantity_on_hand = quantity_on_hand - v_res.quantity,
            updated_at = now()
        WHERE product_id = v_res.product_id;

        UPDATE public.inventory_reservations
        SET status = 'committed', committed_at = now()
        WHERE id = v_res.id;

        INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
        VALUES (v_res.product_id, p_order_id, 'SALE_COMMITTED', -v_res.quantity, v_inv.quantity_on_hand, v_inv.quantity_on_hand - v_res.quantity, 'Sale Committed After Reservation Expiry', v_actor_id);
      ELSE
        -- Stock no longer available: Flag PAID_ORDER_STOCK_EXCEPTION alert without creating negative stock
        INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
        VALUES (
          v_actor_id,
          'PAID_ORDER_STOCK_EXCEPTION',
          'orders',
          p_order_id,
          jsonb_build_object(
            'message', 'Order paid after reservation expired and stock was reallocated.',
            'product_id', v_res.product_id,
            'required_quantity', v_res.quantity,
            'available_on_hand', v_inv.quantity_on_hand
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Server-Authoritative Release Order Stock RPC (Cancellation / Timeout)
CREATE OR REPLACE FUNCTION public.release_order_stock(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order Cancelled'
) RETURNS JSONB AS $$
DECLARE
  v_res RECORD;
  v_inv RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  FOR v_res IN SELECT * FROM public.inventory_reservations WHERE order_id = p_order_id AND status = 'active' FOR UPDATE LOOP
    SELECT * FROM public.inventory WHERE product_id = v_res.product_id INTO v_inv FOR UPDATE;

    UPDATE public.inventory
    SET quantity_reserved = GREATEST(0, quantity_reserved - v_res.quantity),
        updated_at = now()
    WHERE product_id = v_res.product_id;

    UPDATE public.inventory_reservations
    SET status = 'released', released_at = now()
    WHERE id = v_res.id;

    INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
    VALUES (v_res.product_id, p_order_id, 'RESERVATION_RELEASED', -v_res.quantity, v_inv.quantity_reserved, GREATEST(0, v_inv.quantity_reserved - v_res.quantity), p_reason, v_actor_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Reservation Expiry Worker RPC
CREATE OR REPLACE FUNCTION public.expire_inventory_reservations()
RETURNS JSONB AS $$
DECLARE
  v_res RECORD;
  v_count INT := 0;
BEGIN
  FOR v_res IN SELECT * FROM public.inventory_reservations WHERE status = 'active' AND expires_at <= now() LOOP
    PERFORM public.release_order_stock(v_res.order_id, 'Reservation Expired Timeout');
    UPDATE public.inventory_reservations SET status = 'expired' WHERE id = v_res.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Admin Manual Inventory Adjustment RPC with Safety Constraint
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_product_id TEXT,
  p_quantity_delta INT,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
  v_new_on_hand INT;
  v_actor_id UUID := auth.uid();
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Adjustment reason is mandatory.';
  END IF;

  SELECT * FROM public.inventory WHERE product_id = p_product_id INTO v_inv FOR UPDATE;
  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Product % not found in inventory.', p_product_id;
  END IF;

  v_new_on_hand := v_inv.quantity_on_hand + p_quantity_delta;

  IF v_new_on_hand < 0 THEN
    RAISE EXCEPTION 'Stock on hand cannot be negative. Current: %, Delta: %.', v_inv.quantity_on_hand, p_quantity_delta;
  END IF;

  -- Safety Constraint: Stock on hand cannot fall below active reserved stock
  IF v_new_on_hand < v_inv.quantity_reserved THEN
    RAISE EXCEPTION 'Cannot reduce stock on hand below current active reservations (% units reserved).', v_inv.quantity_reserved;
  END IF;

  UPDATE public.inventory
  SET quantity_on_hand = v_new_on_hand,
      updated_at = now(),
      updated_by = v_actor_id
  WHERE product_id = p_product_id;

  INSERT INTO public.inventory_movements (product_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
  VALUES (p_product_id, 'MANUAL_ADJUSTMENT', p_quantity_delta, v_inv.quantity_on_hand, v_new_on_hand, p_reason, v_actor_id);

  INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_actor_id, 'STOCK_ADJUSTED', 'inventory', v_inv.id::text, jsonb_build_object('product_id', p_product_id, 'delta', p_quantity_delta, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'new_quantity_on_hand', v_new_on_hand);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Customer-Safe Product Availability RPC
CREATE OR REPLACE FUNCTION public.get_product_availability(
  p_product_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
  v_avail INT;
  v_badge TEXT;
BEGIN
  SELECT * FROM public.inventory WHERE product_id = p_product_id INTO v_inv;

  IF v_inv IS NULL OR NOT v_inv.inventory_enabled THEN
    RETURN jsonb_build_object('status', 'OUT_OF_STOCK', 'badge', 'Out of Stock', 'is_available', false);
  END IF;

  v_avail := v_inv.quantity_on_hand - v_inv.quantity_reserved;

  IF v_avail <= 0 THEN
    v_badge := 'Out of Stock';
  ELSIF v_avail <= v_inv.reorder_level THEN
    v_badge := 'Low Stock';
  ELSE
    v_badge := 'In Stock';
  END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_avail <= 0 THEN 'OUT_OF_STOCK' WHEN v_avail <= v_inv.reorder_level THEN 'LOW_STOCK' ELSE 'IN_STOCK' END,
    'badge', v_badge,
    'is_available', (v_avail > 0 OR v_inv.allow_backorder)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. Inventory Reconciliation RPC
CREATE OR REPLACE FUNCTION public.audit_inventory_integrity()
RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
  v_calc_res INT;
  v_issues JSONB := '[]'::jsonb;
BEGIN
  FOR v_inv IN SELECT * FROM public.inventory LOOP
    -- Calculate actual active reservations sum
    SELECT COALESCE(SUM(quantity), 0) INTO v_calc_res
    FROM public.inventory_reservations
    WHERE product_id = v_inv.product_id AND status = 'active';

    IF v_inv.quantity_reserved != v_calc_res THEN
      v_issues := v_issues || jsonb_build_object(
        'product_id', v_inv.product_id,
        'type', 'RESERVATION_SUM_MISMATCH',
        'inventory_table_reserved', v_inv.quantity_reserved,
        'actual_active_sum', v_calc_res
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'discrepancies', v_issues, 'issue_count', jsonb_array_length(v_issues));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. Integration: Update create_checkout_order to reserve stock atomically
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_pincode TEXT,
  p_payment_method TEXT,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL,
  p_checkout_attempt_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_existing_order_id UUID;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_delivery NUMERIC(10, 2) := 50.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_item RECORD;
  v_prod RECORD;
  v_receipt_token TEXT;
  v_month INT;
  v_year INT;
  v_seq INT;
BEGIN
  -- Idempotency Check
  IF p_checkout_attempt_id IS NOT NULL AND p_checkout_attempt_id != '' THEN
    SELECT id, order_number INTO v_existing_order_id, v_order_number
    FROM public.orders
    WHERE checkout_attempt_id = p_checkout_attempt_id;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order_id,
        'order_number', v_order_number,
        'receipt_token', (SELECT receipt_token FROM public.orders WHERE id = v_existing_order_id),
        'already_exists', true
      );
    END IF;
  END IF;

  -- Compute subtotal
  FOR v_item IN SELECT (item->>'id') AS id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT mrp FROM public.products WHERE id = v_item.id INTO v_prod;
    IF v_prod IS NULL THEN
      RAISE EXCEPTION 'Product % not found.', v_item.id;
    END IF;
    v_subtotal := v_subtotal + (v_prod.mrp * v_item.quantity);
  END LOOP;

  IF v_subtotal >= 999.00 OR v_subtotal = 0.00 THEN
    v_delivery := 0.00;
  END IF;

  v_total := v_subtotal + v_delivery;

  v_month := extract(month from now());
  v_year := extract(year from now());
  v_seq := floor(random() * 900000 + 100000);
  v_order_number := 'SSP-' || lpad(v_month::text, 2, '0') || (v_year % 100)::text || '-' || v_seq::text;
  v_receipt_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_phone, customer_email,
    shipping_address, city, state, pincode, subtotal, delivery_charge,
    total_amount, payment_method, payment_status, order_status, checkout_attempt_id, receipt_token
  ) VALUES (
    v_order_number, p_user_id, p_customer_name, p_customer_phone, p_customer_email,
    p_shipping_address, p_city, p_state, p_pincode, v_subtotal, v_delivery,
    v_total, p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'cod_pending' ELSE 'pending' END,
    'new', p_checkout_attempt_id, v_receipt_token
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT (item->>'id') AS id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT name, mrp FROM public.products WHERE id = v_item.id INTO v_prod;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (v_order_id, v_item.id, v_prod.name, v_item.quantity, v_prod.mrp, (v_prod.mrp * v_item.quantity));
  END LOOP;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, source, note)
  VALUES (v_order_id, 'none', 'new', 'customer', 'Order created via checkout');

  -- Atomically reserve stock for checkout items (15m window)
  PERFORM public.reserve_order_stock(
    v_order_id,
    (SELECT jsonb_agg(jsonb_build_object('product_id', item->>'id', 'quantity', (item->>'quantity')::int)) FROM jsonb_array_elements(p_items) AS item),
    now() + interval '15 minutes'
  );

  -- Transactionally Queue Notification Event ORDER_PLACED
  PERFORM public.queue_customer_notification(v_order_id, 'ORDER_PLACED', 'email');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_token', v_receipt_token,
    'already_exists', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
