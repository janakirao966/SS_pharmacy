-- ==========================================
-- S.S. PHARMACY — MIGRATION 07: CANCELLATION & RAZORPAY REFUND SYSTEM
-- ==========================================

-- 1. Create refunds table with UNIQUE(order_id) and UNIQUE(idempotency_key)
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_refund_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  refund_type TEXT NOT NULL DEFAULT 'full' CHECK (refund_type = 'full'),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'processed', 'failed')),
  reason TEXT,
  requested_by UUID REFERENCES auth.users(id),
  idempotency_key UUID NOT NULL DEFAULT gen_random_uuid(),
  failure_code TEXT,
  failure_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT refunds_order_id_key UNIQUE (order_id),
  CONSTRAINT refunds_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_rzp_refund_id ON public.refunds(razorpay_refund_id);

-- 2. Configure RLS Policies
-- DIRECT MUTATIONS ARE DENIED. Mutations must occur via SECURITY DEFINER RPCs or Service Role Edge Functions.
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view refunds" ON public.refunds;
CREATE POLICY "Admins can view refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own refunds" ON public.refunds;
CREATE POLICY "Customers can view own refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );


-- 3. Cancel Order with Refund Requirement Check RPC
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

  -- Lock order row
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel an order that is already %.', v_order.order_status;
  END IF;

  IF v_order.order_status NOT IN ('new', 'confirmed', 'processing') THEN
    RAISE EXCEPTION 'Cannot cancel an order in % status. Pre-dispatch cancellation is only permitted for new, confirmed, or processing orders.', v_order.order_status;
  END IF;

  -- Update order status
  UPDATE public.orders
  SET order_status = 'cancelled',
      updated_at = v_now
  WHERE id = p_order_id;

  -- If online paid, create refund requirement record if not exists
  IF v_order.payment_status = 'paid' AND v_order.razorpay_payment_id IS NOT NULL THEN
    INSERT INTO public.refunds (
      order_id,
      razorpay_payment_id,
      amount,
      refund_type,
      status,
      reason,
      requested_by,
      created_at,
      updated_at
    ) VALUES (
      p_order_id,
      v_order.razorpay_payment_id,
      v_order.total_amount,
      'full',
      'requested',
      trim(p_reason),
      auth.uid(),
      v_now,
      v_now
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id INTO v_refund_id;
  END IF;

  -- History log
  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, source, note, created_by, created_at
  ) VALUES (
    p_order_id, v_order.order_status, 'cancelled', 'admin', trim(p_reason), auth.uid(), v_now
  );

  -- Admin activity log
  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(), 'CANCEL_ORDER', 'orders', p_order_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'previous_status', v_order.order_status,
      'payment_status', v_order.payment_status,
      'refund_required', (v_order.payment_status = 'paid')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', 'cancelled',
    'refund_required', (v_order.payment_status = 'paid')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Reconcile Refund State RPC
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
  SELECT * INTO v_refund
  FROM public.refunds
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_refund IS NULL THEN
    RAISE EXCEPTION 'Refund record not found for order.';
  END IF;

  IF p_new_status = 'processed' THEN
    UPDATE public.refunds
    SET status = 'processed',
        razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id),
        processed_at = v_now,
        updated_at = v_now
    WHERE id = v_refund.id;

    UPDATE public.orders
    SET payment_status = 'refunded',
        updated_at = v_now
    WHERE id = p_order_id;
  ELSIF p_new_status = 'failed' THEN
    UPDATE public.refunds
    SET status = 'failed',
        razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id),
        failure_code = p_failure_code,
        failure_description = p_failure_description,
        updated_at = v_now
    WHERE id = v_refund.id;
  ELSIF p_new_status = 'processing' THEN
    UPDATE public.refunds
    SET status = 'processing',
        razorpay_refund_id = COALESCE(p_razorpay_refund_id, razorpay_refund_id),
        updated_at = v_now
    WHERE id = v_refund.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
