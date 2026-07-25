-- ====================================================================
-- S.S. PHARMACY — ORDER STATE MACHINE & HISTORY (05)
-- Features: Strict Fufillment States, History Timeline, Admin Logs, Secure Updates
-- ====================================================================

-- 1. Migrate existing orders and apply strict check constraint
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop existing check constraint dynamically
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%order_status%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

UPDATE public.orders SET order_status = 'processing' WHERE order_status = 'preparing';

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('new', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'));

-- 2. Create Audit Tables
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity ON public.admin_activity_logs(entity_type, entity_id);

-- 3. Backfill initial history for existing orders
INSERT INTO public.order_status_history (order_id, from_status, to_status, source, note)
SELECT id, NULL, order_status, 'system', 'current status imported'
FROM public.orders
WHERE id NOT IN (SELECT order_id FROM public.order_status_history);

-- 4. Enable RLS and Policies for new tables
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- No INSERT/UPDATE/DELETE policies, backend only

-- 5. Secure State Transition RPC
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_actor_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update order status.';
  END IF;

  -- Lock the order row to prevent concurrent updates
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- Terminal states cannot be changed
  IF v_order.order_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot update a % order.', v_order.order_status;
  END IF;

  -- Validate specific state transitions
  IF p_new_status = 'cancelled' THEN
    IF v_order.order_status NOT IN ('new', 'confirmed', 'processing') THEN
      RAISE EXCEPTION 'Cannot cancel an order from % status.', v_order.order_status;
    END IF;
  ELSIF p_new_status = 'confirmed' AND v_order.order_status != 'new' THEN
    RAISE EXCEPTION 'Invalid transition to confirmed from %.', v_order.order_status;
  ELSIF p_new_status = 'processing' AND v_order.order_status != 'confirmed' THEN
    RAISE EXCEPTION 'Invalid transition to processing from %.', v_order.order_status;
  ELSIF p_new_status = 'packed' AND v_order.order_status != 'processing' THEN
    RAISE EXCEPTION 'Invalid transition to packed from %.', v_order.order_status;
  ELSIF p_new_status = 'shipped' AND v_order.order_status != 'packed' THEN
    RAISE EXCEPTION 'Invalid transition to shipped from %.', v_order.order_status;
  ELSIF p_new_status = 'out_for_delivery' AND v_order.order_status != 'shipped' THEN
    RAISE EXCEPTION 'Invalid transition to out_for_delivery from %.', v_order.order_status;
  ELSIF p_new_status = 'delivered' AND v_order.order_status != 'out_for_delivery' THEN
    RAISE EXCEPTION 'Invalid transition to delivered from %.', v_order.order_status;
  ELSIF p_new_status NOT IN ('new', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Unknown status %.', p_new_status;
  END IF;

  -- Update order
  UPDATE public.orders SET order_status = p_new_status, updated_at = now() WHERE id = p_order_id;

  -- Insert history
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, source, note)
  VALUES (p_order_id, v_order.order_status, p_new_status, v_actor_id, 'admin', p_note);

  -- Insert audit log
  INSERT INTO public.admin_activity_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    v_actor_id,
    'order_status_changed',
    'orders',
    p_order_id,
    jsonb_build_object('order_status', v_order.order_status),
    jsonb_build_object('order_status', p_new_status)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Refactor create_checkout_order to inject initial history event
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
  p_checkout_attempt_id UUID DEFAULT NULL,
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_delivery NUMERIC(10, 2) := 50.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_item RECORD;
  v_product_mrp NUMERIC(10, 2);
  v_product_name TEXT;
  v_user_id UUID := p_user_id;
  v_receipt_token TEXT := NULL;
  v_existing_order JSONB;
BEGIN
  -- Idempotency Check: if checkout_attempt_id exists, return the existing order safely
  IF p_checkout_attempt_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'success', true,
      'order_id', id,
      'order_number', order_number,
      'total_amount', total_amount,
      'receipt_token', receipt_token,
      'razorpay_order_id', razorpay_order_id,
      'is_duplicate', true
    ) INTO v_existing_order
    FROM public.orders 
    WHERE checkout_attempt_id = p_checkout_attempt_id;

    IF v_existing_order IS NOT NULL THEN
      RETURN v_existing_order;
    END IF;
  END IF;

  -- Validate that items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Generate unique Order Number
  v_order_number := 'SSP-' || floor(100000 + random() * 900000)::TEXT;

  -- Generate receipt token for guests
  IF v_user_id IS NULL THEN
    v_receipt_token := encode(gen_random_bytes(16), 'hex');
  END IF;

  -- Verify prices and calculate subtotal
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (id TEXT, quantity INT)
  LOOP
    SELECT mrp, name INTO v_product_mrp, v_product_name 
    FROM public.products 
    WHERE id = v_item.id;
    
    IF v_product_mrp IS NULL THEN
      RAISE EXCEPTION 'Product with ID % not found in database', v_item.id;
    END IF;

    IF v_item.quantity <= 0 OR v_item.quantity > 999 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.id;
    END IF;

    v_subtotal := v_subtotal + (v_product_mrp * v_item.quantity);
  END LOOP;

  -- Apply shipping fee rule: Free if subtotal >= 999, else 50
  IF v_subtotal >= 999.00 THEN
    v_delivery := 0.00;
  END IF;
  v_total := v_subtotal + v_delivery;

  -- Insert order record
  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    city,
    state,
    pincode,
    subtotal,
    delivery_charge,
    total_amount,
    payment_method,
    payment_status,
    order_status,
    checkout_attempt_id,
    razorpay_order_id,
    receipt_token
  ) VALUES (
    v_order_number,
    v_user_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_shipping_address,
    p_city,
    p_state,
    p_pincode,
    v_subtotal,
    v_delivery,
    v_total,
    p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'cod_pending'::text ELSE 'pending'::text END,
    'new',
    p_checkout_attempt_id,
    p_razorpay_order_id,
    v_receipt_token
  ) RETURNING id INTO v_order_id;

  -- Insert items associated with this order
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (id TEXT, quantity INT)
  LOOP
    SELECT mrp, name INTO v_product_mrp, v_product_name 
    FROM public.products 
    WHERE id = v_item.id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_item.id,
      v_product_name,
      v_item.quantity,
      v_product_mrp,
      v_product_mrp * v_item.quantity
    );
  END LOOP;

  -- Initial History insertion
  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source
  ) VALUES (
    v_order_id, NULL, 'new', 'system'
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total,
    'receipt_token', v_receipt_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Update get_guest_order_receipt to include timeline
CREATE OR REPLACE FUNCTION public.get_guest_order_receipt(p_order_number TEXT, p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_timeline JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Invalid receipt token';
  END IF;

  SELECT id, order_number, subtotal, delivery_charge, total_amount, payment_method, payment_status, order_status, city, state, pincode, created_at, customer_name, customer_email, customer_phone, shipping_address
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number AND receipt_token = p_token AND user_id IS NULL;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'quantity', quantity,
      'unit_price', unit_price,
      'total_price', total_price
    )
  ) INTO v_items
  FROM public.order_items
  WHERE order_id = v_order.id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'from_status', from_status,
      'to_status', to_status,
      'source', source,
      'created_at', created_at
    ) ORDER BY created_at ASC
  ) INTO v_timeline
  FROM public.order_status_history
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'subtotal', v_order.subtotal,
    'delivery_charge', v_order.delivery_charge,
    'total_amount', v_order.total_amount,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'destination', v_order.city || ', ' || v_order.state || ' - ' || v_order.pincode,
    'created_at', v_order.created_at,
    'items', v_items,
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Update track_guest_order to include timeline
CREATE OR REPLACE FUNCTION public.track_guest_order(p_order_number TEXT, p_customer_phone TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_timeline JSONB;
BEGIN
  IF p_order_number IS NULL OR p_customer_phone IS NULL THEN
    RAISE EXCEPTION 'Order number and phone required';
  END IF;

  SELECT id, order_number, order_status, payment_status, created_at, city, state, pincode
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number AND customer_phone = p_customer_phone;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found matching provided details';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'from_status', from_status,
      'to_status', to_status,
      'source', source,
      'created_at', created_at
    ) ORDER BY created_at ASC
  ) INTO v_timeline
  FROM public.order_status_history
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'destination', v_order.city || ', ' || v_order.state || ' - ' || v_order.pincode,
    'timeline', COALESCE(v_timeline, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
