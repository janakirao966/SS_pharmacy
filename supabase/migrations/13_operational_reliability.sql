-- ============================================================================
-- S.S. PHARMACY — PHASE 8: PRODUCTION RELIABILITY, RECONCILIATION & EXCEPTION SYSTEM
-- Migration: 13_operational_reliability.sql
-- ============================================================================

-- 1. SEED CONFIGURABLE RELIABILITY SETTINGS
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('job_lock_timeout_minutes', '15', 'Timeout in minutes after which an active job lock is considered stale and recoverable'),
  ('payment_pending_threshold_minutes', '30', 'Timeout in minutes for pending online payments before flagging for reconciliation'),
  ('log_retention_days', '90', 'Retention period in days for completed background jobs and raw webhook payloads')
ON CONFLICT (key) DO NOTHING;

-- 2. OPERATIONAL EXCEPTIONS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.operational_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  source TEXT,
  error_code TEXT,
  fingerprint TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_detected_at TIMESTAMPTZ DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PARTIAL UNIQUE INDEX FOR ACTIVE INCIDENTS (Life cycle vs recurring condition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exceptions_active_fingerprint
ON public.operational_exceptions (fingerprint)
WHERE status IN ('open', 'investigating');

CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON public.operational_exceptions (severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON public.operational_exceptions (status);
CREATE INDEX IF NOT EXISTS idx_exceptions_order_id ON public.operational_exceptions (order_id);

-- 3. BACKGROUND JOBS DURABLE TABLE
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'retry_scheduled', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 10,
  payload JSONB DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_jobs_claim ON public.background_jobs (status, scheduled_at, priority);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_order_id ON public.background_jobs (order_id);

-- 4. WEBHOOK EVENTS LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'queued', 'processed', 'failed', 'ignored')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT idx_webhook_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events (processing_status);

-- 5. SYSTEM HEALTH CHECKS TABLE
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical', 'unknown')),
  last_check_at TIMESTAMPTZ DEFAULT now(),
  latency_ms INTEGER,
  details JSONB DEFAULT '{}'::jsonb
);

-- Seed baseline health components
INSERT INTO public.system_health_checks (component, status, details)
VALUES
  ('database', 'healthy', '{"message": "PostgreSQL operational"}'::jsonb),
  ('razorpay_webhook', 'healthy', '{"message": "Signature verification & event ledger active"}'::jsonb),
  ('resend_email', 'healthy', '{"message": "Transactional email queue active"}'::jsonb),
  ('inventory_engine', 'healthy', '{"message": "Ledger & reservation deadlock isolation active"}'::jsonb),
  ('job_worker', 'healthy', '{"message": "SKIP LOCKED worker pool active"}'::jsonb)
ON CONFLICT (component) DO NOTHING;

-- 6. ENABLE RLS & DENY PUBLIC ACCESS
ALTER TABLE public.operational_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public exceptions" ON public.operational_exceptions;
CREATE POLICY "Deny public exceptions" ON public.operational_exceptions FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Admin select exceptions" ON public.operational_exceptions;
CREATE POLICY "Admin select exceptions" ON public.operational_exceptions FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Deny public jobs" ON public.background_jobs;
CREATE POLICY "Deny public jobs" ON public.background_jobs FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Admin select jobs" ON public.background_jobs;
CREATE POLICY "Admin select jobs" ON public.background_jobs FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Deny public webhooks" ON public.webhook_events;
CREATE POLICY "Deny public webhooks" ON public.webhook_events FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Admin select webhooks" ON public.webhook_events;
CREATE POLICY "Admin select webhooks" ON public.webhook_events FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Deny public health" ON public.system_health_checks;
CREATE POLICY "Deny public health" ON public.system_health_checks FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Admin select health" ON public.system_health_checks;
CREATE POLICY "Admin select health" ON public.system_health_checks FOR SELECT TO authenticated USING (public.is_admin());

-- 7. ATOMIC JOB CLAIMING RPC (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_background_jobs(
  p_worker_id TEXT,
  p_batch_size INT DEFAULT 5
)
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.background_jobs
    WHERE status IN ('queued', 'retry_scheduled')
      AND scheduled_at <= now()
    ORDER BY priority ASC, scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.background_jobs j
  SET status = 'processing',
      started_at = now(),
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = j.attempt_count + 1,
      updated_at = now()
  FROM claimed
  WHERE j.id = claimed.id
  RETURNING j.*;
END;
$$;

-- 8. JOB LIFECYCLE RPCs (COMPLETE, FAIL, STALE RECOVERY)
CREATE OR REPLACE FUNCTION public.complete_background_job(
  p_job_id UUID,
  p_result JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.background_jobs
  SET status = 'completed',
      completed_at = now(),
      payload = payload || jsonb_build_object('result', p_result),
      updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- UPSERT OPERATIONAL EXCEPTION RPC
CREATE OR REPLACE FUNCTION public.upsert_operational_exception(
  p_exception_type TEXT,
  p_severity TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_order_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_source TEXT,
  p_error_code TEXT,
  p_fingerprint TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM public.operational_exceptions
  WHERE fingerprint = p_fingerprint
    AND status IN ('open', 'investigating')
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.operational_exceptions
    SET occurrence_count = occurrence_count + 1,
        last_detected_at = now(),
        description = p_description,
        metadata = p_metadata,
        updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.operational_exceptions (
      exception_type, severity, entity_type, entity_id, order_id,
      title, description, source, error_code, fingerprint, metadata
    ) VALUES (
      p_exception_type, p_severity, p_entity_type, p_entity_id, p_order_id,
      p_title, p_description, p_source, p_error_code, p_fingerprint, p_metadata
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- FAIL BACKGROUND JOB RPC WITH EXPONENTIAL BACKOFF & DEAD-LETTER ESCALATION
CREATE OR REPLACE FUNCTION public.fail_background_job(
  p_job_id UUID,
  p_error_code TEXT,
  p_error_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.background_jobs%ROWTYPE;
  v_next_retry TIMESTAMPTZ;
  v_backoff_minutes INT;
BEGIN
  SELECT * INTO v_job FROM public.background_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  IF v_job.attempt_count >= v_job.max_attempts THEN
    -- Permanent Failure (Dead-Letter Escalation)
    UPDATE public.background_jobs
    SET status = 'failed',
        last_error_code = p_error_code,
        last_error_message = p_error_message,
        updated_at = now()
    WHERE id = p_job_id;

    -- Create/Update Operational Exception
    PERFORM public.upsert_operational_exception(
      'JOB_EXHAUSTED_FAILED',
      'high',
      v_job.entity_type,
      v_job.entity_id,
      v_job.order_id,
      'Background Job Permanently Failed',
      p_error_message,
      'background_jobs',
      p_error_code,
      'job_fail_' || v_job.id::text,
      jsonb_build_object('job_type', v_job.job_type, 'attempts', v_job.attempt_count)
    );
  ELSE
    -- Retry Scheduled with Exponential Backoff (1m, 4m, 9m, 16m...)
    v_backoff_minutes := (v_job.attempt_count ^ 2);
    v_next_retry := now() + (v_backoff_minutes * interval '1 minute');

    UPDATE public.background_jobs
    SET status = 'retry_scheduled',
        scheduled_at = v_next_retry,
        last_error_code = p_error_code,
        last_error_message = p_error_message,
        updated_at = now()
    WHERE id = p_job_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RECOVER STALE JOBS RPC (Configurable lease duration from system_settings)
CREATE OR REPLACE FUNCTION public.recover_stale_jobs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timeout_minutes INT;
  v_count INT := 0;
BEGIN
  SELECT COALESCE(value::INT, 15) INTO v_timeout_minutes
  FROM public.system_settings
  WHERE key = 'job_lock_timeout_minutes';

  WITH stale AS (
    SELECT id FROM public.background_jobs
    WHERE status = 'processing'
      AND locked_at < (now() - (v_timeout_minutes * interval '1 minute'))
  )
  UPDATE public.background_jobs j
  SET status = 'retry_scheduled',
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  FROM stale
  WHERE j.id = stale.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 9. COMPLETE 8-PART RECONCILIATION SUITE RPCs

-- A. Payment State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_payment_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, order_number, total_amount, payment_status, created_at
    FROM public.orders
    WHERE payment_method = 'online'
      AND payment_status = 'pending'
      AND created_at < (now() - interval '30 minutes')
  LOOP
    PERFORM public.upsert_operational_exception(
      'UNRECONCILED_PAYMENT_PENDING',
      'warning',
      'order',
      r.id,
      r.id,
      'Online Payment Pending Timeout',
      'Order #' || r.order_number || ' online payment remained pending > 30m.',
      'reconcile_payment_state',
      'PAYMENT_TIMEOUT',
      'pay_pending_' || r.id::text,
      jsonb_build_object('total_amount', r.total_amount)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- B. Refund State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_refund_state_suite()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, order_id, status, created_at
    FROM public.refunds
    WHERE status = 'processing'
      AND created_at < (now() - interval '1 hour')
  LOOP
    PERFORM public.upsert_operational_exception(
      'STUCK_REFUND_PROCESSING',
      'high',
      'refund',
      r.id,
      r.order_id,
      'Refund Processing Timeout',
      'Refund #' || r.id::text || ' stuck in processing state for > 1h.',
      'reconcile_refund_state',
      'REFUND_STUCK',
      'ref_stuck_' || r.id::text,
      jsonb_build_object('refund_id', r.id)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- C. Order State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_order_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT o.id, o.order_number, o.order_status
    FROM public.orders o
    LEFT JOIN public.shipments s ON s.order_id = o.id
    WHERE o.order_status IN ('shipped', 'delivered')
      AND s.id IS NULL
  LOOP
    PERFORM public.upsert_operational_exception(
      'INVALID_ORDER_SHIPMENT_MISMATCH',
      'critical',
      'order',
      r.id,
      r.id,
      'Order Shipped Without Shipment Record',
      'Order #' || r.order_number || ' status is ' || r.order_status || ' but missing shipment row.',
      'reconcile_order_state',
      'MISSING_SHIPMENT',
      'ord_ship_miss_' || r.id::text,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- D. Shipment State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_shipment_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, order_id, tracking_number
    FROM public.shipments
    WHERE tracking_number IS NULL OR tracking_number = ''
  LOOP
    PERFORM public.upsert_operational_exception(
      'SHIPMENT_MISSING_TRACKING',
      'warning',
      'shipment',
      r.id,
      r.order_id,
      'Shipment Missing Tracking AWB',
      'Shipment #' || r.id::text || ' has empty tracking number.',
      'reconcile_shipment_state',
      'NO_TRACKING',
      'ship_track_miss_' || r.id::text,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- E. Notification State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_notification_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, order_id, event_type
    FROM public.customer_notifications
    WHERE status = 'failed'
      AND attempt_count >= max_attempts
  LOOP
    PERFORM public.upsert_operational_exception(
      'NOTIFICATION_EXHAUSTED_FAILED',
      'warning',
      'notification',
      r.id,
      r.order_id,
      'Notification Delivery Exhausted',
      'Customer notification for event ' || r.event_type || ' failed completely.',
      'reconcile_notification_state',
      'NOTIF_FAILED',
      'notif_fail_' || r.id::text,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- F. Inventory State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_inventory_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, product_id, quantity_on_hand, quantity_reserved
    FROM public.inventory
    WHERE quantity_reserved > quantity_on_hand
       OR quantity_on_hand < 0
  LOOP
    PERFORM public.upsert_operational_exception(
      'INVENTORY_INVARIANT_VIOLATION',
      'critical',
      'inventory',
      r.id,
      NULL,
      'Inventory Stock Invariant Violation',
      'Product ' || r.product_id || ' reserved stock (' || r.quantity_reserved || ') exceeds on-hand stock (' || r.quantity_on_hand || ').',
      'reconcile_inventory_state',
      'STOCK_INVARIANT_FAIL',
      'inv_inv_fail_' || r.id::text,
      jsonb_build_object('on_hand', r.quantity_on_hand, 'reserved', r.quantity_reserved)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- G. Invoice State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_invoice_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT o.id, o.order_number
    FROM public.orders o
    LEFT JOIN public.invoices i ON i.order_id = o.id
    WHERE o.order_status IN ('shipped', 'delivered')
      AND i.id IS NULL
  LOOP
    PERFORM public.upsert_operational_exception(
      'SHIPPED_ORDER_MISSING_INVOICE',
      'high',
      'order',
      r.id,
      r.id,
      'Shipped Order Missing Tax Invoice',
      'Order #' || r.order_number || ' shipped but no GST invoice generated.',
      'reconcile_invoice_state',
      'MISSING_INVOICE',
      'inv_miss_' || r.id::text,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- H. Return & RTO State Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_return_rto_state()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, order_id, return_number, status
    FROM public.returns
    WHERE status = 'received'
      AND created_at < (now() - interval '48 hours')
  LOOP
    PERFORM public.upsert_operational_exception(
      'RETURN_INSPECTION_DELAYED',
      'warning',
      'return',
      r.id,
      r.order_id,
      'Return Received Inspection Delayed',
      'Return #' || r.return_number || ' received at warehouse but uninspected > 48h.',
      'reconcile_return_rto_state',
      'INSPECTION_DELAY',
      'ret_insp_delay_' || r.id::text,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 10. SAFE ADMIN RETRY & REPLAY RPCs WITH AUDIT LOGGING
CREATE OR REPLACE FUNCTION public.retry_failed_job(
  p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE public.background_jobs
  SET status = 'queued',
      attempt_count = 0,
      scheduled_at = now(),
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.admin_activity_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'RETRY_BACKGROUND_JOB', 'background_job', p_job_id, jsonb_build_object('job_id', p_job_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_webhook_event(
  p_webhook_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_web public.webhook_events%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_web FROM public.webhook_events WHERE id = p_webhook_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webhook not found');
  END IF;

  INSERT INTO public.background_jobs (job_type, entity_type, payload, correlation_id)
  VALUES ('process_webhook', 'webhook_event', v_web.payload, v_web.correlation_id);

  UPDATE public.webhook_events
  SET processing_status = 'queued',
      updated_at = now()
  WHERE id = p_webhook_id;

  INSERT INTO public.admin_activity_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'REPLAY_WEBHOOK_EVENT', 'webhook_event', p_webhook_id, jsonb_build_object('provider', v_web.provider, 'event_id', v_web.event_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- DATA RETENTION CLEANUP RPC
CREATE OR REPLACE FUNCTION public.cleanup_expired_reliability_logs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retention_days INT;
  v_count INT := 0;
BEGIN
  SELECT COALESCE(value::INT, 90) INTO v_retention_days
  FROM public.system_settings
  WHERE key = 'log_retention_days';

  DELETE FROM public.background_jobs
  WHERE status IN ('completed', 'cancelled')
    AND completed_at < (now() - (v_retention_days * interval '1 day'));

  DELETE FROM public.webhook_events
  WHERE processing_status IN ('processed', 'ignored')
    AND processed_at < (now() - (v_retention_days * interval '1 day'));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
