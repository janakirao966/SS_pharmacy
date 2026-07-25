-- ==========================================
-- S.S. PHARMACY — MIGRATION 09: NOTIFICATION SYSTEM TRANSACTIONAL INTEGRATIONS
-- ==========================================

-- 1. Integrate ORDER_CONFIRMED, ORDER_PROCESSING, ORDER_PACKED into update_order_status
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
  v_event_type TEXT;
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

  -- Transactionally Queue Notification Event
  v_event_type := 'ORDER_' || upper(p_new_status);
  PERFORM public.queue_customer_notification(p_order_id, v_event_type, 'email');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Integrate ORDER_SHIPPED into mark_order_shipped
CREATE OR REPLACE FUNCTION public.mark_order_shipped(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_shipment RECORD;
  v_order RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status != 'packed' THEN
    RAISE EXCEPTION 'Cannot mark order as shipped. Order status must be packed (current: %).', v_order.order_status;
  END IF;

  SELECT * INTO v_shipment FROM public.shipments WHERE order_id = p_order_id;
  IF v_shipment IS NULL OR v_shipment.carrier IS NULL OR v_shipment.tracking_number IS NULL THEN
    RAISE EXCEPTION 'Shipping details (Carrier & Tracking Number) must be saved before marking order as shipped.';
  END IF;

  UPDATE public.shipments
  SET shipment_status = 'shipped',
      shipped_at = COALESCE(shipped_at, v_now),
      updated_at = v_now
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET order_status = 'shipped',
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, source, created_by, created_at)
  VALUES (p_order_id, 'packed', 'shipped', 'admin', auth.uid(), v_now);

  INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'MARK_SHIPPED', 'orders', p_order_id, jsonb_build_object('carrier', v_shipment.carrier, 'tracking_number', v_shipment.tracking_number));

  -- Queue Notification
  PERFORM public.queue_customer_notification(p_order_id, 'ORDER_SHIPPED', 'email');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'shipped');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Integrate ORDER_OUT_FOR_DELIVERY into mark_order_out_for_delivery
CREATE OR REPLACE FUNCTION public.mark_order_out_for_delivery(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status != 'shipped' THEN
    RAISE EXCEPTION 'Cannot mark out for delivery. Order status must be shipped (current: %).', v_order.order_status;
  END IF;

  UPDATE public.shipments
  SET shipment_status = 'out_for_delivery',
      out_for_delivery_at = COALESCE(out_for_delivery_at, v_now),
      updated_at = v_now
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET order_status = 'out_for_delivery',
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, source, created_by, created_at)
  VALUES (p_order_id, 'shipped', 'out_for_delivery', 'admin', auth.uid(), v_now);

  INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'MARK_OUT_FOR_DELIVERY', 'orders', p_order_id, jsonb_build_object('status', 'out_for_delivery'));

  -- Queue Notification
  PERFORM public.queue_customer_notification(p_order_id, 'ORDER_OUT_FOR_DELIVERY', 'email');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'out_for_delivery');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Integrate ORDER_DELIVERED into mark_order_delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status != 'out_for_delivery' THEN
    RAISE EXCEPTION 'Cannot mark delivered. Order status must be out_for_delivery (current: %).', v_order.order_status;
  END IF;

  UPDATE public.shipments
  SET shipment_status = 'delivered',
      delivered_at = COALESCE(delivered_at, v_now),
      updated_at = v_now
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET order_status = 'delivered',
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, source, created_by, created_at)
  VALUES (p_order_id, 'out_for_delivery', 'delivered', 'admin', auth.uid(), v_now);

  INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'MARK_DELIVERED', 'orders', p_order_id, jsonb_build_object('status', 'delivered'));

  -- Queue Notification
  PERFORM public.queue_customer_notification(p_order_id, 'ORDER_DELIVERED', 'email');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'delivered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Integrate ORDER_CANCELLED & REFUND_REQUESTED into cancel_order_with_refund_check
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund_check(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_refund_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Cancellation reason (at least 10 characters) is required.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel an order that is already %.', v_order.order_status;
  END IF;

  IF v_order.order_status NOT IN ('new', 'confirmed', 'processing') THEN
    RAISE EXCEPTION 'Cannot cancel an order in % status. Pre-dispatch cancellation is only permitted for new, confirmed, or processing orders.', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET order_status = 'cancelled',
      updated_at = v_now
  WHERE id = p_order_id;

  IF v_order.payment_status = 'paid' AND v_order.razorpay_payment_id IS NOT NULL THEN
    INSERT INTO public.refunds (
      order_id, razorpay_payment_id, amount, refund_type, status, reason, requested_by, created_at, updated_at
    ) VALUES (
      p_order_id, v_order.razorpay_payment_id, v_order.total_amount, 'full', 'requested', trim(p_reason), auth.uid(), v_now, v_now
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id INTO v_refund_id;

    -- Queue Refund Requested Notification
    PERFORM public.queue_customer_notification(p_order_id, 'REFUND_REQUESTED', 'email');
  END IF;

  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source, note, created_by, created_at
  ) VALUES (
    p_order_id, v_order.order_status, 'cancelled', 'admin', trim(p_reason), auth.uid(), v_now
  );

  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(), 'CANCEL_ORDER', 'orders', p_order_id,
    jsonb_build_object('reason', trim(p_reason), 'previous_status', v_order.order_status, 'payment_status', v_order.payment_status, 'refund_required', (v_order.payment_status = 'paid'))
  );

  -- Queue Cancelled Notification
  PERFORM public.queue_customer_notification(p_order_id, 'ORDER_CANCELLED', 'email');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', 'cancelled', 'refund_required', (v_order.payment_status = 'paid'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Integrate REFUND_PROCESSING, REFUND_PROCESSED, REFUND_FAILED into reconcile_refund_state
CREATE OR REPLACE FUNCTION public.reconcile_refund_state(
  p_order_id UUID,
  p_razorpay_refund_id TEXT,
  p_new_status TEXT,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_refund RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_refund FROM public.refunds WHERE order_id = p_order_id FOR UPDATE;

  IF v_refund IS NULL THEN
    RAISE EXCEPTION 'Refund record not found for order.';
  END IF;

  IF p_new_status = 'processed' THEN
    UPDATE public.refunds
    SET status = 'processed', razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id), processed_at = v_now, updated_at = v_now
    WHERE id = v_refund.id;

    UPDATE public.orders SET payment_status = 'refunded', updated_at = v_now WHERE id = p_order_id;

    PERFORM public.queue_customer_notification(p_order_id, 'REFUND_PROCESSED', 'email');
  ELSIF p_new_status = 'failed' THEN
    UPDATE public.refunds
    SET status = 'failed', razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id), failure_code = p_failure_code, failure_description = p_failure_description, updated_at = v_now
    WHERE id = v_refund.id;

    PERFORM public.queue_customer_notification(p_order_id, 'REFUND_FAILED', 'email');
  ELSIF p_new_status = 'processing' THEN
    UPDATE public.refunds
    SET status = 'processing', razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id), updated_at = v_now
    WHERE id = v_refund.id;

    PERFORM public.queue_customer_notification(p_order_id, 'REFUND_PROCESSING', 'email');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
