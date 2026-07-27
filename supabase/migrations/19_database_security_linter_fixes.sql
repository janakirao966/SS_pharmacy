-- ============================================================================
-- S.S. PHARMACY — PHASE 14: DATABASE SECURITY HARDENING & LINTER REFINEMENTS
-- Migration: 19_database_security_linter_fixes.sql
-- ============================================================================

-- 1. SET SECURE search_path ON ALL FUNCTIONS TO PREVENT SEARCH PATH HIJACKING (WARN: 0011)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', r.nspname, r.proname, r.args);
  END LOOP;
END;
$$;

-- 2. HARDEN DEFAULT PRIVILEGES AND EXPLICIT PRIVILEGES (WARN: 0028)
-- Revoke execution permissions from PUBLIC, anon, and authenticated for all functions by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Re-grant execute permissions only to approved public guest and checkout functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_guest_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_order_receipt TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(text, text, text, text, text, text, text, text, jsonb, uuid, text) TO anon, authenticated, service_role;

-- Re-grant customer execution permissions
GRANT EXECUTE ON FUNCTION public.anonymize_user_profile TO authenticated, service_role;

-- Re-grant admin/system execution permissions (gated by is_admin() check internally; required for Admin Dashboard)
GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_order_invoice TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_goods_receipt TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_product_recall TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_executive_dashboard_kpis TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.export_report_dataset TO authenticated, service_role;

-- Re-grant strictly internal system / background worker functions ONLY to service_role (WARN 0029 prevention)
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reliability_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_background_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_background_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_background_job TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_stale_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.replay_webhook_event TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_failed_job TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_inventory_reservations TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_inventory_integrity TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_customer_notification TO service_role;

GRANT EXECUTE ON FUNCTION public.reconcile_shipment_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_notification_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_inventory_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_invoice_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_return_rto_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_order_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_refund_state_suite TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_refund_state TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_support_sla TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_batch_inventory TO service_role;

-- 3. REFINE PERMISSIVE RLS POLICY ON DISTRIBUTOR APPLICATIONS (WARN: 0024)
DROP POLICY IF EXISTS "Anyone can submit distributor application" ON public.distributor_applications;
CREATE POLICY "Anyone can submit distributor application" ON public.distributor_applications
  FOR INSERT WITH CHECK (
    company_name IS NOT NULL AND length(trim(company_name)) > 0 AND
    contact_person IS NOT NULL AND length(trim(contact_person)) > 0 AND
    email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
    phone IS NOT NULL AND length(trim(phone)) >= 10
  );

-- 4. EXPLICIT RLS POLICIES FOR INTERNAL TABLES (INFO: 0008)
DROP POLICY IF EXISTS "Admins full access" ON public.cod_payouts;
CREATE POLICY "Admins full access" ON public.cod_payouts FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.credit_notes;
CREATE POLICY "Admins full access" ON public.credit_notes FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.goods_receipt_items;
CREATE POLICY "Admins full access" ON public.goods_receipt_items FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.goods_receipt_sequences;
CREATE POLICY "Admins full access" ON public.goods_receipt_sequences FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.inventory_settings;
CREATE POLICY "Admins full access" ON public.inventory_settings FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.invoice_sequences;
CREATE POLICY "Admins full access" ON public.invoice_sequences FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.order_item_batch_allocations;
CREATE POLICY "Admins full access" ON public.order_item_batch_allocations FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.product_recalls;
CREATE POLICY "Admins full access" ON public.product_recalls FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.purchase_order_items;
CREATE POLICY "Admins full access" ON public.purchase_order_items FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.purchase_order_sequences;
CREATE POLICY "Admins full access" ON public.purchase_order_sequences FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.purchase_order_status_history;
CREATE POLICY "Admins full access" ON public.purchase_order_status_history FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.recall_batches;
CREATE POLICY "Admins full access" ON public.recall_batches FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.recall_sequences;
CREATE POLICY "Admins full access" ON public.recall_sequences FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.return_shipments;
CREATE POLICY "Admins full access" ON public.return_shipments FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.return_status_history;
CREATE POLICY "Admins full access" ON public.return_status_history FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.rto_shipments;
CREATE POLICY "Admins full access" ON public.rto_shipments FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.support_sla_settings;
CREATE POLICY "Admins full access" ON public.support_sla_settings FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.support_status_history;
CREATE POLICY "Admins full access" ON public.support_status_history FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access" ON public.support_ticket_sequences;
CREATE POLICY "Admins full access" ON public.support_ticket_sequences FOR ALL TO authenticated USING (public.is_admin());

-- 5. SET SECURITY INVOKER ON EXISTING VIEWS (ERROR: 0010)
ALTER VIEW public.vw_sales_analytics_daily SET (security_invoker = true);
ALTER VIEW public.vw_financial_summary_monthly SET (security_invoker = true);
ALTER VIEW public.vw_historical_cogs_monthly SET (security_invoker = true);
ALTER VIEW public.vw_gst_r1_prep_report SET (security_invoker = true);
ALTER VIEW public.vw_inventory_expiry_valuation SET (security_invoker = true);
ALTER VIEW public.vw_customer_cohorts_rfm SET (security_invoker = true);
