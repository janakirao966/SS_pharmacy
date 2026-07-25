-- ============================================================================
-- S.S. PHARMACY — PHASE 13: PRODUCTION SECURITY HARDENING, PRIVACY, ABUSE PREVENTION,
-- AUTHENTICATION SECURITY, DATABASE PROTECTION & DISASTER RECOVERY AUDIT TRAIL
-- Migration: 18_security_privacy_hardening.sql
-- ============================================================================

-- 1. SANITIZED SECURITY EVENTS LOG TABLE (NO PII / SECRETS)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  entity_type TEXT,
  entity_id TEXT,
  ip_hash TEXT,
  user_agent_summary TEXT,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON public.security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_actor ON public.security_events(actor_user_id);

-- 2. ATOMIC CONCURRENCY-SAFE RATE LIMIT BUCKET TABLE
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  tokens_remaining INTEGER NOT NULL,
  last_replenished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FORMAL CUSTOMER PRIVACY DELETION STATE MACHINE TABLE
CREATE TABLE IF NOT EXISTS public.privacy_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN ('REQUESTED', 'IDENTITY_VERIFIED', 'RETENTION_CHECK', 'ANONYMIZATION_PENDING', 'ANONYMIZED', 'AUTH_ACCOUNT_REMOVED')
  ),
  retention_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON public.privacy_deletion_requests(user_id);

-- ENABLE RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view security events" ON public.security_events;
CREATE POLICY "Admin view security events" ON public.security_events FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin view rate limit buckets" ON public.rate_limit_buckets;
CREATE POLICY "Admin view rate limit buckets" ON public.rate_limit_buckets FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "User view own privacy requests" ON public.privacy_deletion_requests;
CREATE POLICY "User view own privacy requests" ON public.privacy_deletion_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- 4. ATOMIC CONCURRENCY-SAFE RATE LIMIT CHECK RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key TEXT,
  p_max_tokens INT,
  p_replenish_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_remaining INT;
  v_last_replenished TIMESTAMPTZ;
  v_elapsed_seconds INT;
  v_replenished_tokens INT;
BEGIN
  -- Atomic upsert & row lock
  INSERT INTO public.rate_limit_buckets (bucket_key, tokens_remaining, last_replenished_at)
  VALUES (p_bucket_key, p_max_tokens - 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    tokens_remaining = CASE
      WHEN (EXTRACT(EPOCH FROM (v_now - rate_limit_buckets.last_replenished_at))::INT / p_replenish_seconds) > 0
      THEN LEAST(p_max_tokens, rate_limit_buckets.tokens_remaining + ((EXTRACT(EPOCH FROM (v_now - rate_limit_buckets.last_replenished_at))::INT / p_replenish_seconds) * p_max_tokens)) - 1
      ELSE rate_limit_buckets.tokens_remaining - 1
    END,
    last_replenished_at = CASE
      WHEN (EXTRACT(EPOCH FROM (v_now - rate_limit_buckets.last_replenished_at))::INT / p_replenish_seconds) > 0
      THEN v_now
      ELSE rate_limit_buckets.last_replenished_at
    END
  RETURNING tokens_remaining INTO v_remaining;

  IF v_remaining < 0 THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;

  RETURN TRUE; -- Allowed
END;
$$;

-- 5. PII ANONYMIZATION WORKFLOW RPC (PRESERVES 8-YEAR GST TAX INVOICES)
CREATE OR REPLACE FUNCTION public.anonymize_user_profile(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id UUID;
BEGIN
  IF NOT (public.is_admin() OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Access denied. You can only anonymize your own profile or require admin privileges.';
  END IF;

  -- 1. Create or update deletion request state machine to ANONYMIZED
  INSERT INTO public.privacy_deletion_requests (user_id, status, retention_notes)
  VALUES (p_user_id, 'ANONYMIZED', 'PII scrubbed from profile. GST Tax Invoices retained for 8-year statutory compliance under Section 36 of CGST Act 2017.')
  RETURNING id INTO v_req_id;

  -- 2. Anonymize PII in public.profiles table (do NOT delete row to preserve order foreign keys)
  UPDATE public.profiles
  SET
    full_name = 'Anonymized Customer',
    email = 'deleted_user_' || md5(p_user_id::text) || '@sspharmacy.invalid',
    phone = NULL,
    updated_at = now()
  WHERE id = p_user_id;

  -- 3. Log security audit event (no PII in metadata)
  INSERT INTO public.security_events (event_type, severity, actor_user_id, entity_type, entity_id, metadata)
  VALUES (
    'CUSTOMER_ACCOUNT_ANONYMIZED', 'info', auth.uid(), 'profile', p_user_id::text,
    jsonb_build_object('request_id', v_req_id, 'statutory_tax_retention', '8_years_cgst_act')
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'status', 'ANONYMIZED',
    'tax_records_retained', true
  );
END;
$$;

-- 6. STRICT RPC EXECUTE PERMISSION HARDENING
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Public Guest Capabilities (anon, authenticated, service_role)
GRANT EXECUTE ON FUNCTION public.track_guest_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_order_receipt TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon, authenticated, service_role;

-- Authenticated Customer Capabilities
GRANT EXECUTE ON FUNCTION public.create_checkout_order TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.anonymize_user_profile TO authenticated, service_role;

-- Admin-Only Capabilities
GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_order_invoice TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_goods_receipt TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_product_recall TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_executive_dashboard_kpis TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.export_report_dataset TO authenticated, service_role;
