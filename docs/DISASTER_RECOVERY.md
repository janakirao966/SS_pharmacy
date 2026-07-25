# S.S. PHARMACY — PRODUCTION DISASTER RECOVERY RUNBOOK

**Document Version:** 1.0.0  
**Last Updated:** July 26, 2026  
**Target RPO (Recovery Point Objective):** < 1 Hour  
**Target RTO (Recovery Time Objective):** < 4 Hours  

---

## 📌 Emergency Contact & Incident Escalation
1. **Lead Systems Administrator:** Admin Team (`admin@sspharmacy.com`)
2. **Database & Infrastructure Provider:** Supabase Cloud Support
3. **Payment Processor:** Razorpay India Enterprise Support
4. **Transactional Email Provider:** Resend Support

---

## 🛠️ Step-by-Step Production Disaster Recovery Protocol

### Phase 1: Initial Containment & Status Declaration
1. Declare production incident and mark status page.
2. Freeze all pending background workers and webhook endpoints if corruption or database failure is detected.

### Phase 2: Database Restoration (PostgreSQL PITR)
1. Navigate to Supabase Dashboard → Project Settings → Infrastructure → Backups.
2. Select **Point-in-Time Recovery (PITR)** and choose timestamp $T_{\text{target}}$ (1 minute prior to incident).
3. Trigger Point-in-Time Database Restore.
4. Verify database schema integrity once restore completes.

### Phase 3: Supabase Storage Restoration
1. Verify private storage buckets: `invoices`, `support-attachments`, `analytics-exports`.
2. Sync multi-region replica objects if storage corruption occurred.

### Phase 4: Environment Credentials & Secrets Verification
1. Verify production environment secrets in Supabase Dashboard → Edge Functions → Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `RESEND_API_KEY`

### Phase 5: Edge Functions & Webhook Redeployment
1. Deploy Edge Functions via Supabase CLI:
   ```bash
   npx supabase functions deploy checkout --no-verify-jwt
   npx supabase functions deploy verify-payment
   npx supabase functions deploy razorpay-webhook
   npx supabase functions deploy process-refund
   npx supabase functions deploy operations-worker
   npx supabase functions deploy send-notification
   npx supabase functions deploy generate-invoice-pdf
   ```
2. Re-register Razorpay Webhook URL: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`.

### Phase 6: Post-Restore Reconciliation & Audit Validation
1. Trigger Phase 8 System Reconciliation RPCs via SQL Editor or Admin Operations Portal (`/admin/operations`):
   ```sql
   SELECT public.reconcile_order_state();
   SELECT public.reconcile_refund_state();
   SELECT public.reconcile_shipment_state();
   SELECT public.reconcile_inventory_state();
   SELECT public.reconcile_batch_inventory();
   ```
2. Inspect `public.operational_exceptions` for any post-restore mismatches.

---

## 🧪 Restore Verification Log Protocol
Every restore test must record test verification details in `system_settings` or `security_events`:
- `last_restore_test_at`
- `restore_test_result` (`SUCCESS` / `FAILED`)
- `tested_by` (Admin User ID)
- `database_verified` (Boolean)
- `storage_verified` (Boolean)
- `reconciliation_verified` (Boolean)
