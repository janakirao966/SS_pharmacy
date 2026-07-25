-- ==========================================
-- S.S. PHARMACY — MIGRATION 08: NOTIFICATION & COMMUNICATION SYSTEM
-- ==========================================

-- 1. Create customer_notifications table
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_PACKED',
      'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
      'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED',
      'REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_PROCESSED', 'REFUND_FAILED'
    )
  ),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'sent', 'failed', 'retry_scheduled', 'cancelled')
  ),
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  resend_of_notification_id UUID REFERENCES public.customer_notifications(id) ON DELETE SET NULL,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_notifications_order ON public.customer_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_user ON public.customer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_status ON public.customer_notifications(status);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_event ON public.customer_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_retry ON public.customer_notifications(next_retry_at) WHERE status = 'retry_scheduled';

-- 2. Configure RLS Policies
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view notifications" ON public.customer_notifications;
CREATE POLICY "Admins can view notifications" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own notifications" ON public.customer_notifications;
CREATE POLICY "Customers can view own notifications" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- Direct client mutations (INSERT/UPDATE/DELETE) disabled. RPC & Service Role Edge Functions handle mutations.

-- 3. Queue Notification Helper RPC
CREATE OR REPLACE FUNCTION public.queue_customer_notification(
  p_order_id UUID,
  p_event_type TEXT,
  p_channel TEXT DEFAULT 'email'
) RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_idempotency_key TEXT;
  v_notif_id UUID;
BEGIN
  SELECT id, user_id, customer_email, customer_name FROM public.orders WHERE id = p_order_id INTO v_order;
  IF v_order IS NULL OR v_order.customer_email IS NULL THEN
    RETURN NULL;
  END IF;

  v_idempotency_key := p_order_id || '_' || p_event_type || '_' || p_channel;

  INSERT INTO public.customer_notifications (
    order_id,
    user_id,
    event_type,
    channel,
    recipient,
    status,
    idempotency_key,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    v_order.user_id,
    p_event_type,
    p_channel,
    v_order.customer_email,
    'queued',
    v_idempotency_key,
    now(),
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Admin Resend Notification RPC (Creates new delivery identity & logs audit event)
CREATE OR REPLACE FUNCTION public.admin_resend_notification(
  p_notification_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_orig RECORD;
  v_new_key TEXT;
  v_new_id UUID;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * FROM public.customer_notifications WHERE id = p_notification_id INTO v_orig;
  IF v_orig IS NULL THEN
    RAISE EXCEPTION 'Original notification record not found.';
  END IF;

  v_new_key := v_orig.order_id || '_' || v_orig.event_type || '_resend_' || gen_random_uuid();

  INSERT INTO public.customer_notifications (
    order_id,
    user_id,
    event_type,
    channel,
    recipient,
    status,
    idempotency_key,
    resend_of_notification_id,
    initiated_by,
    created_at,
    updated_at
  ) VALUES (
    v_orig.order_id,
    v_orig.user_id,
    v_orig.event_type,
    v_orig.channel,
    v_orig.recipient,
    'queued',
    v_new_key,
    p_notification_id,
    v_actor_id,
    now(),
    now()
  )
  RETURNING id INTO v_new_id;

  -- Admin Activity Log
  INSERT INTO public.admin_activity_logs (
    admin_id, action, target_type, target_id, details
  ) VALUES (
    v_actor_id, 'RESEND_NOTIFICATION', 'customer_notifications', v_new_id,
    jsonb_build_object(
      'original_notification_id', p_notification_id,
      'order_id', v_orig.order_id,
      'event_type', v_orig.event_type,
      'recipient', v_orig.recipient
    )
  );

  RETURN jsonb_build_object('success', true, 'new_notification_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Safe Guest Notification History RPC
CREATE OR REPLACE FUNCTION public.get_guest_notifications(
  p_order_number TEXT,
  p_token TEXT
) RETURNS TABLE (
  event_type TEXT,
  channel TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
) AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE order_number = upper(trim(p_order_number))
    AND receipt_token = p_token;

  IF v_order_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cn.event_type, cn.channel, cn.status, cn.created_at, cn.sent_at
  FROM public.customer_notifications cn
  WHERE cn.order_id = v_order_id
  ORDER BY cn.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
