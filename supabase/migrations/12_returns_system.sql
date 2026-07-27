-- ==========================================
-- S.S. PHARMACY — MIGRATION 12: PRODUCTION RETURNS, RTO, REVERSE LOGISTICS & INVENTORY RECOVERY SYSTEM
-- ==========================================

-- 1. Ensure system_settings table and return_window_days key exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to system_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Allow public read access to system_settings'
  ) THEN
    CREATE POLICY "Allow public read access to system_settings" ON public.system_settings
      FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO public.system_settings (key, value, description)
VALUES ('return_window_days', NULL, 'Return window duration in days. NULL means unconfigured.')
ON CONFLICT (key) DO NOTHING;

-- 2. Create Returns Master Table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'in_transit', 'received', 'inspection', 'inspection_completed', 'refund_pending', 'completed', 'cancelled')),
  resolution TEXT NOT NULL DEFAULT 'refund' CHECK (resolution IN ('refund', 'replacement')),
  reason_code TEXT NOT NULL CHECK (reason_code IN ('DAMAGED_ITEM', 'WRONG_ITEM', 'DEFECTIVE_PRODUCT', 'EXPIRED_PRODUCT', 'PACKAGE_LEAKAGE', 'NOT_AS_DESCRIBED', 'OTHER')),
  customer_reason TEXT NOT NULL,
  admin_note TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  inspected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);

-- 3. Create Return Items Table
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason_code TEXT NOT NULL,
  condition_status TEXT CHECK (condition_status IN ('UNOPENED', 'OPENED', 'DAMAGED', 'EXPIRED', 'LEAKING', 'TAMPERED')),
  inspection_note TEXT,
  inventory_disposition TEXT NOT NULL DEFAULT 'pending_inspection' CHECK (inventory_disposition IN ('pending_inspection', 'restock', 'damaged', 'expired', 'quarantine', 'discard')),
  unit_price_snapshot NUMERIC(10, 2) NOT NULL,
  refund_eligible_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON public.return_items(order_item_id);

-- 4. Create Append-Only Return Status History Table
CREATE TABLE IF NOT EXISTS public.return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'customer', 'system')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_status_history_return ON public.return_status_history(return_id);

-- 5. Create Reverse Logistics Return Shipments Table
CREATE TABLE IF NOT EXISTS public.return_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID UNIQUE NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  tracking_url TEXT CHECK (tracking_url IS NULL OR tracking_url ~* '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/.*)?$'),
  pickup_scheduled_at TIMESTAMPTZ,
  pickup_completed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create RTO Shipments Table
CREATE TABLE IF NOT EXISTS public.rto_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  rto_reason TEXT NOT NULL,
  rto_carrier TEXT NOT NULL,
  rto_tracking_number TEXT NOT NULL,
  rto_status TEXT NOT NULL DEFAULT 'rto_initiated' CHECK (rto_status IN ('rto_initiated', 'rto_in_transit', 'rto_received', 'rto_inspected', 'rto_completed')),
  rto_initiated_at TIMESTAMPTZ DEFAULT now(),
  rto_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Dedicated COD Payouts Table
CREATE TABLE IF NOT EXISTS public.cod_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('BANK_TRANSFER', 'UPI')),
  beneficiary_name TEXT NOT NULL,
  account_number_last4 TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reference_number TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cod_payouts_return ON public.cod_payouts(return_id);

-- Enable RLS on Return Tables
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rto_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cod_payouts ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
DROP POLICY IF EXISTS "Customers and Admins view returns" ON public.returns;
CREATE POLICY "Customers and Admins view returns" ON public.returns
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage returns" ON public.returns;
CREATE POLICY "Admins manage returns" ON public.returns
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Return items viewable by order owner or admin" ON public.return_items;
CREATE POLICY "Return items viewable by order owner or admin" ON public.return_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE returns.id = return_items.return_id
      AND (returns.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Direct client INSERT/UPDATE/DELETE DENIED for returns tables except via SECURITY DEFINER RPCs.


-- 8. Server-Authoritative Return Eligibility RPC
CREATE OR REPLACE FUNCTION public.check_return_eligibility(
  p_order_id UUID,
  p_order_item_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_window_days INT;
  v_setting_val TEXT;
  v_returned_qty INT := 0;
  v_remaining_qty INT := 0;
BEGIN
  -- 1. Fetch server setting for return_window_days
  SELECT value INTO v_setting_val FROM public.system_settings WHERE key = 'return_window_days';
  IF v_setting_val IS NULL OR trim(v_setting_val) = '' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Return policy is currently unconfigured. Contact support for assistance.');
  END IF;

  v_window_days := v_setting_val::int;

  -- 2. Fetch Order and verify status
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Order not found.');
  END IF;

  IF v_order.order_status != 'delivered' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Only delivered orders are eligible for return.');
  END IF;

  -- 3. Check delivery timestamp window
  IF v_order.updated_at + (v_window_days || ' days')::interval < now() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Return window has expired.');
  END IF;

  -- 4. If item requested, check remaining returnable quantity
  IF p_order_item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM public.order_items WHERE id = p_order_item_id AND order_id = p_order_id;
    IF v_item IS NULL THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'Order item not found.');
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned_qty
    FROM public.return_items ri
    JOIN public.returns r ON r.id = ri.return_id
    WHERE ri.order_item_id = p_order_item_id
    AND r.status NOT IN ('rejected', 'cancelled');

    v_remaining_qty := v_item.quantity - v_returned_qty;

    IF v_remaining_qty <= 0 THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'All purchased units for this item have already been returned or requested.');
    END IF;

    RETURN jsonb_build_object('eligible', true, 'remaining_quantity', v_remaining_qty);
  END IF;

  RETURN jsonb_build_object('eligible', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Server-Authoritative Create Return Request RPC
CREATE OR REPLACE FUNCTION public.create_return_request(
  p_order_id UUID,
  p_items JSONB, -- Array of {order_item_id: string, product_id: string, quantity: number, reason_code: string}
  p_reason_code TEXT,
  p_customer_reason TEXT,
  p_receipt_token TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_ret_item RECORD;
  v_return_id UUID;
  v_return_number TEXT;
  v_seq INT;
  v_month INT;
  v_year INT;
  v_returned_qty INT;
  v_remaining_qty INT;
  v_actor_id UUID := auth.uid();
  v_user_id UUID;
  v_eligibility JSONB;
BEGIN
  -- Verify Order ownership or guest receipt token
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_actor_id IS NOT NULL THEN
    v_user_id := v_actor_id;
    IF v_order.user_id IS NOT NULL AND v_order.user_id != v_actor_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Order does not belong to user.';
    END IF;
  ELSE
    IF p_receipt_token IS NULL OR v_order.receipt_token != p_receipt_token THEN
      RAISE EXCEPTION 'Unauthorized: Invalid guest receipt token.';
    END IF;
    v_user_id := v_order.user_id;
  END IF;

  -- Verify overall return eligibility
  v_eligibility := public.check_return_eligibility(p_order_id);
  IF NOT (v_eligibility->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', (v_eligibility->>'reason');
  END IF;

  -- Lock order_items rows and validate requested quantities
  FOR v_ret_item IN SELECT (item->>'order_item_id')::uuid AS order_item_id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT * INTO v_item FROM public.order_items WHERE id = v_ret_item.order_item_id AND order_id = p_order_id FOR UPDATE;
    IF v_item IS NULL THEN
      RAISE EXCEPTION 'Order item % not found.', v_ret_item.order_item_id;
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned_qty
    FROM public.return_items ri
    JOIN public.returns r ON r.id = ri.return_id
    WHERE ri.order_item_id = v_ret_item.order_item_id
    AND r.status NOT IN ('rejected', 'cancelled');

    v_remaining_qty := v_item.quantity - v_returned_qty;
    IF v_ret_item.quantity > v_remaining_qty THEN
      RAISE EXCEPTION 'Requested return quantity (%) exceeds remaining returnable quantity (%) for product %.', v_ret_item.quantity, v_remaining_qty, v_item.product_name;
    END IF;
  END LOOP;

  -- Generate return number (RET/26-27/XXXXXX)
  v_month := extract(month from now());
  v_year := extract(year from now());
  v_seq := floor(random() * 900000 + 100000);
  v_return_number := 'RET/' || (v_year % 100)::text || '-' || ((v_year + 1) % 100)::text || '/' || v_seq::text;

  -- Insert Return Record
  INSERT INTO public.returns (
    return_number, order_id, user_id, status, resolution, reason_code, customer_reason
  ) VALUES (
    v_return_number, p_order_id, v_user_id, 'requested', 'refund', p_reason_code, p_customer_reason
  ) RETURNING id INTO v_return_id;

  -- Insert Return Items
  FOR v_ret_item IN SELECT (item->>'order_item_id')::uuid AS order_item_id, (item->>'product_id') AS product_id, (item->>'quantity')::int AS quantity, (item->>'reason_code') AS item_reason FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT unit_price INTO v_item FROM public.order_items WHERE id = v_ret_item.order_item_id;
    
    INSERT INTO public.return_items (
      return_id, order_item_id, product_id, quantity, reason_code, unit_price_snapshot, refund_eligible_amount
    ) VALUES (
      v_return_id, v_ret_item.order_item_id, v_ret_item.product_id, v_ret_item.quantity, COALESCE(v_ret_item.item_reason, p_reason_code), v_item.unit_price, (v_item.unit_price * v_ret_item.quantity)
    );
  END LOOP;

  -- Record History
  INSERT INTO public.return_status_history (return_id, from_status, to_status, source, note)
  VALUES (v_return_id, 'none', 'requested', CASE WHEN v_actor_id IS NOT NULL THEN 'customer' ELSE 'system' END, 'Return request submitted');

  -- Transactionally Queue Notification RETURN_REQUESTED
  PERFORM public.queue_customer_notification(p_order_id, 'RETURN_REQUESTED', 'email');

  RETURN jsonb_build_object('success', true, 'return_id', v_return_id, 'return_number', v_return_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. Complete Return Inspection RPC with Physical Inventory Disposition
CREATE OR REPLACE FUNCTION public.complete_return_inspection(
  p_return_id UUID,
  p_dispositions JSONB -- Array of {return_item_id: string, condition_status: string, inventory_disposition: string, inspection_note: string}
) RETURNS JSONB AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_disp RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can complete return inspection.';
  END IF;

  SELECT * INTO v_return FROM public.returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN
    RAISE EXCEPTION 'Return not found.';
  END IF;

  IF v_return.status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Cannot inspect return in % status.', v_return.status;
  END IF;

  -- Process item physical dispositions
  FOR v_disp IN SELECT (item->>'return_item_id')::uuid AS return_item_id, (item->>'condition_status') AS condition_status, (item->>'inventory_disposition') AS inventory_disposition, (item->>'inspection_note') AS inspection_note FROM jsonb_array_elements(p_dispositions) AS item LOOP
    SELECT * INTO v_item FROM public.return_items WHERE id = v_disp.return_item_id AND return_id = p_return_id FOR UPDATE;
    IF v_item IS NULL THEN
      RAISE EXCEPTION 'Return item % not found.', v_disp.return_item_id;
    END IF;

    UPDATE public.return_items
    SET condition_status = v_disp.condition_status,
        inventory_disposition = v_disp.inventory_disposition,
        inspection_note = v_disp.inspection_note
    WHERE id = v_disp.return_item_id;

    -- If disposition is restock, increase sellable stock in Phase 6 inventory ledger
    IF v_disp.inventory_disposition = 'restock' THEN
      PERFORM public.adjust_inventory(v_item.product_id, v_item.quantity, 'Returned Merchandise Passed Inspection - Restocked');
    ELSE
      -- Log inventory movement for non-sellable return (damaged/expired/quarantine)
      INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
      VALUES (v_item.product_id, v_return.order_id, 'RETURN_DAMAGED', 0, (SELECT quantity_on_hand FROM public.inventory WHERE product_id = v_item.product_id), (SELECT quantity_on_hand FROM public.inventory WHERE product_id = v_item.product_id), 'Returned Item Non-Sellable: ' || v_disp.inventory_disposition, v_actor_id);
    END IF;
  END LOOP;

  -- Update return status to inspection_completed / refund_pending
  UPDATE public.returns
  SET status = 'inspection_completed',
      inspected_at = now(),
      updated_at = now()
  WHERE id = p_return_id;

  INSERT INTO public.return_status_history (return_id, from_status, to_status, changed_by, source, note)
  VALUES (p_return_id, v_return.status, 'inspection_completed', v_actor_id, 'admin', 'Physical inspection completed. Financial refund pending.');

  RETURN jsonb_build_object('success', true, 'return_id', p_return_id, 'status', 'inspection_completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. Complete RTO Inspection RPC
CREATE OR REPLACE FUNCTION public.complete_rto_inspection(
  p_rto_id UUID,
  p_dispositions JSONB -- Array of {product_id: string, quantity: number, disposition: string}
) RETURNS JSONB AS $$
DECLARE
  v_rto RECORD;
  v_disp RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required.';
  END IF;

  SELECT * INTO v_rto FROM public.rto_shipments WHERE id = p_rto_id FOR UPDATE;
  IF v_rto IS NULL THEN
    RAISE EXCEPTION 'RTO shipment not found.';
  END IF;

  IF v_rto.rto_status = 'rto_completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  FOR v_disp IN SELECT (item->>'product_id') AS product_id, (item->>'quantity')::int AS quantity, (item->>'disposition') AS disposition FROM jsonb_array_elements(p_dispositions) AS item LOOP
    IF v_disp.disposition = 'restock' THEN
      PERFORM public.adjust_inventory(v_disp.product_id, v_disp.quantity, 'RTO Shipment Restocked');
    ELSE
      INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
      VALUES (v_disp.product_id, v_rto.order_id, 'RTO_DAMAGED', 0, (SELECT quantity_on_hand FROM public.inventory WHERE product_id = v_disp.product_id), (SELECT quantity_on_hand FROM public.inventory WHERE product_id = v_disp.product_id), 'RTO Item Damaged: ' || v_disp.disposition, v_actor_id);
    END IF;
  END LOOP;

  UPDATE public.rto_shipments
  SET rto_status = 'rto_completed',
      rto_received_at = COALESCE(rto_received_at, now())
  WHERE id = p_rto_id;

  RETURN jsonb_build_object('success', true, 'rto_id', p_rto_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 12. Complete Return RPC (Invoked AFTER Financial Refund & GST Credit Note succeed)
CREATE OR REPLACE FUNCTION public.complete_return(
  p_return_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_return RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required.';
  END IF;

  SELECT * INTO v_return FROM public.returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN
    RAISE EXCEPTION 'Return not found.';
  END IF;

  IF v_return.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  UPDATE public.returns
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_return_id;

  INSERT INTO public.return_status_history (return_id, from_status, to_status, changed_by, source, note)
  VALUES (p_return_id, v_return.status, 'completed', v_actor_id, 'admin', 'Return completed following financial refund and credit note issuance.');

  -- Transactionally Queue Notification RETURN_COMPLETED
  PERFORM public.queue_customer_notification(v_return.order_id, 'RETURN_COMPLETED', 'email');

  RETURN jsonb_build_object('success', true, 'return_id', p_return_id, 'status', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
