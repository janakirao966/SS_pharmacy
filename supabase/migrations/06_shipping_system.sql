-- ==========================================
-- S.S. PHARMACY — MIGRATION 06: SHIPPING & TRACKING SYSTEM
-- ==========================================

-- 1. Create shipments table with UNIQUE(order_id) constraint
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  service_name TEXT,
  awb_number TEXT,
  tracking_number TEXT NOT NULL,
  tracking_url TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'ready' CHECK (
    shipment_status IN ('pending', 'ready', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned', 'cancelled')
  ),
  admin_note TEXT,
  shipped_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT shipments_order_id_key UNIQUE (order_id)
);

-- Index for FK lookups and status queries
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(shipment_status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_by ON public.shipments(created_by);

-- 2. Configure RLS Policies
-- DIRECT MUTATIONS ARE FULLY DENIED. Mutations must occur via SECURITY DEFINER RPCs.
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view shipments" ON public.shipments;
CREATE POLICY "Admins can view shipments" ON public.shipments
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own shipments" ON public.shipments;
CREATE POLICY "Customers can view own shipments" ON public.shipments
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Direct INSERT/UPDATE/DELETE policies are omitted so direct mutations are blocked.


-- 3. Save / Update Order Shipment RPC (Pre-dispatch)
CREATE OR REPLACE FUNCTION public.save_order_shipment(
  p_order_id UUID,
  p_carrier TEXT,
  p_service_name TEXT DEFAULT NULL,
  p_awb_number TEXT DEFAULT NULL,
  p_tracking_number TEXT DEFAULT NULL,
  p_tracking_url TEXT DEFAULT NULL,
  p_admin_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_existing_shipment RECORD;
BEGIN
  -- Admin Authorization Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Lock order row
  SELECT id, order_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Input Validation
  IF p_carrier IS NULL OR length(trim(p_carrier)) = 0 OR length(p_carrier) > 100 THEN
    RAISE EXCEPTION 'Carrier name is required and must be under 100 characters';
  END IF;

  IF p_tracking_number IS NULL OR length(trim(p_tracking_number)) = 0 OR length(p_tracking_number) > 100 THEN
    RAISE EXCEPTION 'Tracking number is required and must be under 100 characters';
  END IF;

  IF p_tracking_url IS NOT NULL AND length(trim(p_tracking_url)) > 0 THEN
    IF length(p_tracking_url) > 500 THEN
      RAISE EXCEPTION 'Tracking URL exceeds maximum length of 500 characters';
    END IF;
    -- Authoritative Server-side Regex Check for HTTPS URL
    IF NOT p_tracking_url ~* '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/.*)?$' THEN
      RAISE EXCEPTION 'Tracking URL must be a valid HTTPS URL (e.g. https://courier.com/track/123)';
    END IF;
  END IF;

  IF p_admin_note IS NOT NULL AND length(p_admin_note) > 1000 THEN
    RAISE EXCEPTION 'Admin note exceeds 1000 characters';
  END IF;

  -- Lock existing shipment row
  SELECT id, shipment_status INTO v_existing_shipment
  FROM public.shipments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_existing_shipment IS NOT NULL THEN
    -- Normal edit allowed ONLY before dispatch
    IF v_order.order_status NOT IN ('packed', 'new', 'confirmed', 'processing') AND v_existing_shipment.shipment_status NOT IN ('pending', 'ready') THEN
      RAISE EXCEPTION 'Normal shipment edit is rejected after order dispatch. Use correct_order_shipment for audited corrections.';
    END IF;

    UPDATE public.shipments
    SET carrier = trim(p_carrier),
        service_name = NULLIF(trim(p_service_name), ''),
        awb_number = NULLIF(trim(p_awb_number), ''),
        tracking_number = trim(p_tracking_number),
        tracking_url = NULLIF(trim(p_tracking_url), ''),
        admin_note = NULLIF(trim(p_admin_note), ''),
        updated_at = now()
    WHERE id = v_existing_shipment.id;
  ELSE
    -- Initial creation permitted only when order status is packed
    IF v_order.order_status != 'packed' THEN
      RAISE EXCEPTION 'Initial shipment creation is permitted only when order status is packed';
    END IF;

    INSERT INTO public.shipments (
      order_id,
      carrier,
      service_name,
      awb_number,
      tracking_number,
      tracking_url,
      shipment_status,
      admin_note,
      created_by
    ) VALUES (
      p_order_id,
      trim(p_carrier),
      NULLIF(trim(p_service_name), ''),
      NULLIF(trim(p_awb_number), ''),
      trim(p_tracking_number),
      NULLIF(trim(p_tracking_url), ''),
      'ready',
      NULLIF(trim(p_admin_note), ''),
      auth.uid()
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Correct Shipment Details RPC (Post-dispatch audited correction path)
CREATE OR REPLACE FUNCTION public.correct_order_shipment(
  p_order_id UUID,
  p_new_carrier TEXT,
  p_new_service_name TEXT DEFAULT NULL,
  p_new_awb_number TEXT DEFAULT NULL,
  p_new_tracking_number TEXT DEFAULT NULL,
  p_new_tracking_url TEXT DEFAULT NULL,
  p_correction_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_shipment RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  IF p_correction_reason IS NULL OR length(trim(p_correction_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed correction reason (min 10 characters) is required for post-dispatch edits.';
  END IF;

  SELECT id, order_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  SELECT * INTO v_shipment
  FROM public.shipments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_shipment IS NULL THEN
    RAISE EXCEPTION 'No shipment record found for this order.';
  END IF;

  -- Validation
  IF p_new_carrier IS NULL OR length(trim(p_new_carrier)) = 0 THEN
    RAISE EXCEPTION 'Carrier name is required.';
  END IF;

  IF p_new_tracking_number IS NULL OR length(trim(p_new_tracking_number)) = 0 THEN
    RAISE EXCEPTION 'Tracking number is required.';
  END IF;

  IF p_new_tracking_url IS NOT NULL AND length(trim(p_new_tracking_url)) > 0 THEN
    IF NOT p_new_tracking_url ~* '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/.*)?$' THEN
      RAISE EXCEPTION 'Tracking URL must be a valid HTTPS URL.';
    END IF;
  END IF;

  UPDATE public.shipments
  SET carrier = trim(p_new_carrier),
      service_name = NULLIF(trim(p_new_service_name), ''),
      awb_number = NULLIF(trim(p_new_awb_number), ''),
      tracking_number = trim(p_new_tracking_number),
      tracking_url = NULLIF(trim(p_new_tracking_url), ''),
      updated_at = now()
  WHERE id = v_shipment.id;

  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(),
    'CORRECT_SHIPMENT_DETAILS',
    'orders',
    p_order_id,
    jsonb_build_object(
      'reason', trim(p_correction_reason),
      'old_values', jsonb_build_object(
        'carrier', v_shipment.carrier,
        'service_name', v_shipment.service_name,
        'awb_number', v_shipment.awb_number,
        'tracking_number', v_shipment.tracking_number,
        'tracking_url', v_shipment.tracking_url
      ),
      'new_values', jsonb_build_object(
        'carrier', trim(p_new_carrier),
        'service_name', trim(p_new_service_name),
        'awb_number', trim(p_new_awb_number),
        'tracking_number', trim(p_new_tracking_number),
        'tracking_url', trim(p_new_tracking_url)
      )
    )
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Mark Order Shipped RPC (packed -> shipped)
CREATE OR REPLACE FUNCTION public.mark_order_shipped(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_shipment RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Lock order row
  SELECT id, order_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_status != 'packed' THEN
    RAISE EXCEPTION 'Order must be in packed status to be marked as shipped. Current status: %', v_order.order_status;
  END IF;

  -- Lock shipment row
  SELECT * INTO v_shipment
  FROM public.shipments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_shipment IS NULL THEN
    RAISE EXCEPTION 'Shipment details must be created before marking order as shipped.';
  END IF;

  IF v_shipment.carrier IS NULL OR length(trim(v_shipment.carrier)) = 0 THEN
    RAISE EXCEPTION 'Incomplete shipment: Carrier is missing.';
  END IF;

  IF v_shipment.tracking_number IS NULL OR length(trim(v_shipment.tracking_number)) = 0 THEN
    RAISE EXCEPTION 'Incomplete shipment: Tracking number is missing.';
  END IF;

  -- 1. Update orders
  UPDATE public.orders
  SET order_status = 'shipped'
  WHERE id = p_order_id;

  -- 2. Update shipments
  UPDATE public.shipments
  SET shipment_status = 'shipped',
      shipped_at = v_now,
      updated_at = v_now
  WHERE id = v_shipment.id;

  -- 3. Insert history event
  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source, created_by, created_at
  ) VALUES (
    p_order_id, 'packed', 'shipped', 'admin', auth.uid(), v_now
  );

  -- 4. Insert admin activity log
  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(), 'MARK_ORDER_SHIPPED', 'orders', p_order_id,
    jsonb_build_object(
      'carrier', v_shipment.carrier,
      'tracking_number', v_shipment.tracking_number,
      'shipped_at', v_now
    )
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', 'shipped');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Mark Order Out for Delivery RPC (shipped -> out_for_delivery)
CREATE OR REPLACE FUNCTION public.mark_order_out_for_delivery(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_shipment RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT id, order_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_status != 'shipped' THEN
    RAISE EXCEPTION 'Order must be in shipped status to mark out for delivery. Current status: %', v_order.order_status;
  END IF;

  SELECT * INTO v_shipment
  FROM public.shipments
  WHERE order_id = p_order_id
  FOR UPDATE;

  UPDATE public.orders
  SET order_status = 'out_for_delivery'
  WHERE id = p_order_id;

  IF v_shipment IS NOT NULL THEN
    UPDATE public.shipments
    SET shipment_status = 'out_for_delivery',
        out_for_delivery_at = v_now,
        updated_at = v_now
    WHERE id = v_shipment.id;
  END IF;

  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source, created_by, created_at
  ) VALUES (
    p_order_id, 'shipped', 'out_for_delivery', 'admin', auth.uid(), v_now
  );

  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(), 'MARK_ORDER_OUT_FOR_DELIVERY', 'orders', p_order_id,
    jsonb_build_object('out_for_delivery_at', v_now)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', 'out_for_delivery');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Mark Order Delivered RPC (out_for_delivery -> delivered)
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_shipment RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT id, order_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_status != 'out_for_delivery' THEN
    RAISE EXCEPTION 'Order must be out for delivery before marking delivered. Current status: %', v_order.order_status;
  END IF;

  SELECT * INTO v_shipment
  FROM public.shipments
  WHERE order_id = p_order_id
  FOR UPDATE;

  UPDATE public.orders
  SET order_status = 'delivered'
  WHERE id = p_order_id;

  IF v_shipment IS NOT NULL THEN
    UPDATE public.shipments
    SET shipment_status = 'delivered',
        delivered_at = v_now,
        updated_at = v_now
    WHERE id = v_shipment.id;
  END IF;

  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source, created_by, created_at
  ) VALUES (
    p_order_id, 'out_for_delivery', 'delivered', 'admin', auth.uid(), v_now
  );

  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(), 'MARK_ORDER_DELIVERED', 'orders', p_order_id,
    jsonb_build_object('delivered_at', v_now)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', 'delivered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Update get_guest_order_receipt with customer-safe shipment data
CREATE OR REPLACE FUNCTION public.get_guest_order_receipt(p_order_number TEXT, p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_timeline JSONB;
  v_shipment JSONB;
BEGIN
  IF p_order_number IS NULL OR p_token IS NULL THEN
    RAISE EXCEPTION 'Order number and receipt token required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number AND receipt_token = p_token;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Receipt not found or token invalid';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'product_id', product_id,
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

  -- Safe Shipment Fields ONLY
  SELECT jsonb_build_object(
    'carrier', carrier,
    'service_name', service_name,
    'awb_number', awb_number,
    'tracking_number', tracking_number,
    'tracking_url', tracking_url,
    'shipment_status', shipment_status,
    'shipped_at', shipped_at,
    'out_for_delivery_at', out_for_delivery_at,
    'delivered_at', delivered_at
  ) INTO v_shipment
  FROM public.shipments
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
    'shipment', v_shipment,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Update track_guest_order with customer-safe shipment data
CREATE OR REPLACE FUNCTION public.track_guest_order(p_order_number TEXT, p_customer_phone TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_timeline JSONB;
  v_shipment JSONB;
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

  SELECT jsonb_build_object(
    'carrier', carrier,
    'service_name', service_name,
    'awb_number', awb_number,
    'tracking_number', tracking_number,
    'tracking_url', tracking_url,
    'shipment_status', shipment_status,
    'shipped_at', shipped_at,
    'out_for_delivery_at', out_for_delivery_at,
    'delivered_at', delivered_at
  ) INTO v_shipment
  FROM public.shipments
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'destination', v_order.city || ', ' || v_order.state || ' - ' || v_order.pincode,
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'shipment', v_shipment
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
