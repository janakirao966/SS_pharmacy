-- ============================================================================
-- S.S. PHARMACY — PHASE 10: PRODUCTION CUSTOMER SUPPORT & SERVICE DESK SYSTEM
-- Migration: 15_customer_support_system.sql
-- ============================================================================

-- 1. SUPPORT TICKET SEQUENCES TABLE
CREATE TABLE IF NOT EXISTS public.support_ticket_sequences (
  year INTEGER PRIMARY KEY,
  current_val INTEGER NOT NULL DEFAULT 0
);

-- 2. CENTRALIZED SUPPORT SLA SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.support_sla_settings (
  priority TEXT PRIMARY KEY CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  first_response_hours INTEGER NOT NULL,
  resolution_hours INTEGER NOT NULL
);

INSERT INTO public.support_sla_settings (priority, first_response_hours, resolution_hours)
VALUES
  ('urgent', 1, 12),
  ('high', 4, 24),
  ('normal', 12, 48),
  ('low', 24, 72)
ON CONFLICT (priority) DO NOTHING;

-- 3. SUPPORT TICKETS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
  refund_id UUID REFERENCES public.refunds(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'ORDER', 'PAYMENT', 'DELIVERY', 'RETURN', 'REFUND', 'PRODUCT', 
    'DAMAGED_PRODUCT', 'WRONG_PRODUCT', 'MISSING_ITEM', 'QUALITY_CONCERN', 
    'SAFETY_CONCERN', 'ACCOUNT', 'INVOICE', 'GENERAL', 'OTHER'
  )),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'waiting_for_customer', 'waiting_for_internal', 'resolved', 'closed')),
  source TEXT NOT NULL DEFAULT 'contact_form' CHECK (source IN ('customer_account', 'guest_tracking', 'contact_form', 'admin', 'system')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_safety_review BOOLEAN NOT NULL DEFAULT false,
  first_response_at TIMESTAMPTZ,
  first_response_due_at TIMESTAMPTZ,
  resolution_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON public.support_tickets (order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_safety ON public.support_tickets (requires_safety_review);

-- 4. SUPPORT MESSAGES THREAD TABLE
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages (ticket_id);

-- 5. SUPPORT ATTACHMENTS METADATA TABLE
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket ON public.support_attachments (ticket_id);

-- 6. SUPPORT STATUS HISTORY APPEND-ONLY TABLE
CREATE TABLE IF NOT EXISTS public.support_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_history_ticket ON public.support_status_history (ticket_id);

-- 7. RLS POLICIES (EXPLICIT CUSTOMER READ OWN, ADMIN ALL, DIRECT MUTATIONS DENIED)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public tickets" ON public.support_tickets;
CREATE POLICY "Deny public tickets" ON public.support_tickets FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Customer read own tickets" ON public.support_tickets;
CREATE POLICY "Customer read own tickets" ON public.support_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Deny public messages" ON public.support_messages;
CREATE POLICY "Deny public messages" ON public.support_messages FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Customer read own customer messages" ON public.support_messages;
CREATE POLICY "Customer read own customer messages" ON public.support_messages FOR SELECT TO authenticated
USING (
  visibility = 'customer' AND (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Deny public attachments" ON public.support_attachments;
CREATE POLICY "Deny public attachments" ON public.support_attachments FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Customer read own attachments" ON public.support_attachments;
CREATE POLICY "Customer read own attachments" ON public.support_attachments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  OR public.is_admin()
);

-- 8. LEGACY CONTACT ENQUIRIES DATA MIGRATION
DO $$
DECLARE
  r RECORD;
  v_ticket_num TEXT;
  v_seq INT;
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_ticket_id UUID;
BEGIN
  INSERT INTO public.support_ticket_sequences (year, current_val)
  VALUES (v_current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  FOR r IN
    SELECT * FROM public.distributor_applications
    WHERE company_name LIKE 'Enquiry:%' OR company_name = 'General Contact Enquiry'
  LOOP
    UPDATE public.support_ticket_sequences
    SET current_val = current_val + 1
    WHERE year = v_current_year
    RETURNING current_val INTO v_seq;

    v_ticket_num := 'SSP-TKT-' || v_current_year::text || '-' || lpad(v_seq::text, 6, '0');

    INSERT INTO public.support_tickets (
      ticket_number, customer_name, customer_email, customer_phone,
      category, subject, description, priority, status, source, created_at
    ) VALUES (
      v_ticket_num, r.contact_person, r.email, r.phone,
      'GENERAL', 'General Contact Enquiry', COALESCE(r.notes, 'Migrated enquiry'), 'normal',
      CASE WHEN r.status = 'approved' THEN 'resolved' ELSE 'open' END, 'contact_form', r.created_at
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO public.support_messages (ticket_id, sender_type, message, visibility, created_at)
    VALUES (v_ticket_id, 'customer', COALESCE(r.notes, 'Migrated enquiry'), 'customer', r.created_at);
  END LOOP;
END;
$$;

-- 9. SERVER-AUTHORITATIVE RPCs

-- CREATE SUPPORT TICKET RPC
CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_category TEXT,
  p_subject TEXT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_receipt_token TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_source TEXT DEFAULT 'contact_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_seq INT;
  v_ticket_num TEXT;
  v_ticket_id UUID;
  v_safety_review BOOLEAN := false;
  v_first_due TIMESTAMPTZ;
  v_res_due TIMESTAMPTZ;
  v_resp_hours INT := 12;
  v_res_hours INT := 48;
  v_desc_lower TEXT := lower(p_description);
BEGIN
  -- 1. Validate Guest Access if order_id is provided without user_id
  IF p_order_id IS NOT NULL AND v_user_id IS NULL THEN
    IF p_receipt_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.orders WHERE id = p_order_id AND receipt_token = p_receipt_token
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Invalid guest order verification token.';
    END IF;
  END IF;

  -- 2. Detect Pharmaceutical Safety Keywords
  IF v_desc_lower LIKE '%side effect%' OR v_desc_lower LIKE '%reaction%' OR
     v_desc_lower LIKE '%allergy%' OR v_desc_lower LIKE '%hospital%' OR
     v_desc_lower LIKE '%expired%' OR v_desc_lower LIKE '%damaged packaging%' OR
     p_category = 'SAFETY_CONCERN' THEN
    v_safety_review := true;
  END IF;

  -- 3. Calculate Centralized SLA Due Timestamps
  SELECT first_response_hours, resolution_hours INTO v_resp_hours, v_res_hours
  FROM public.support_sla_settings WHERE priority = p_priority;

  v_first_due := now() + (COALESCE(v_resp_hours, 12) * interval '1 hour');
  v_res_due := now() + (COALESCE(v_res_hours, 48) * interval '1 hour');

  -- 4. Generate Ticket Number Transactionally
  INSERT INTO public.support_ticket_sequences (year, current_val)
  VALUES (v_current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.support_ticket_sequences
  SET current_val = current_val + 1
  WHERE year = v_current_year
  RETURNING current_val INTO v_seq;

  v_ticket_num := 'SSP-TKT-' || v_current_year::text || '-' || lpad(v_seq::text, 6, '0');

  -- 5. Insert Ticket Master
  INSERT INTO public.support_tickets (
    ticket_number, user_id, order_id, product_id, customer_name, customer_email,
    customer_phone, category, subject, description, priority, status, source,
    requires_safety_review, first_response_due_at, resolution_due_at
  ) VALUES (
    v_ticket_num, v_user_id, p_order_id, p_product_id, p_customer_name, p_customer_email,
    p_customer_phone, p_category, p_subject, p_description, p_priority, 'open', p_source,
    v_safety_review, v_first_due, v_res_due
  ) RETURNING id INTO v_ticket_id;

  -- 6. Insert Initial Message & History
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, message, visibility)
  VALUES (v_ticket_id, 'customer', v_user_id, p_description, 'customer');

  INSERT INTO public.support_status_history (ticket_id, from_status, to_status, changed_by, source, note)
  VALUES (v_ticket_id, 'none', 'open', v_user_id, p_source, 'Support ticket created');

  -- 7. Queue Customer Notification
  INSERT INTO public.customer_notifications (order_id, event_type, recipient_email, recipient_phone, payload)
  VALUES (p_order_id, 'SUPPORT_TICKET_CREATED', p_customer_email, p_customer_phone, jsonb_build_object(
    'ticket_number', v_ticket_num,
    'subject', p_subject,
    'customer_name', p_customer_name
  ));

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_num, 'ticket_id', v_ticket_id);
END;
$$;

-- REPLY SUPPORT TICKET RPC
CREATE OR REPLACE FUNCTION public.reply_support_ticket(
  p_ticket_id UUID,
  p_message TEXT,
  p_sender_type TEXT DEFAULT 'customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  v_new_status := CASE WHEN p_sender_type = 'admin' THEN 'waiting_for_customer' ELSE 'waiting_for_internal' END;

  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, message, visibility)
  VALUES (p_ticket_id, p_sender_type, auth.uid(), p_message, 'customer');

  UPDATE public.support_tickets
  SET status = v_new_status,
      first_response_at = CASE WHEN p_sender_type = 'admin' AND first_response_at IS NULL THEN now() ELSE first_response_at END,
      updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.support_status_history (ticket_id, from_status, to_status, changed_by, source, note)
  VALUES (p_ticket_id, v_ticket.status, v_new_status, auth.uid(), p_sender_type, 'Reply submitted');

  IF p_sender_type = 'admin' AND v_ticket.customer_email IS NOT NULL THEN
    INSERT INTO public.customer_notifications (order_id, event_type, recipient_email, payload)
    VALUES (v_ticket.order_id, 'SUPPORT_ADMIN_REPLIED', v_ticket.customer_email, jsonb_build_object(
      'ticket_number', v_ticket.ticket_number,
      'message', p_message
    ));
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ADD SUPPORT INTERNAL NOTE RPC (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.add_support_internal_note(
  p_ticket_id UUID,
  p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, message, visibility)
  VALUES (p_ticket_id, 'admin', auth.uid(), p_note, 'internal');

  INSERT INTO public.admin_activity_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'ADD_SUPPORT_INTERNAL_NOTE', 'support_ticket', p_ticket_id, jsonb_build_object('ticket_id', p_ticket_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- UPDATE SUPPORT SAFETY REVIEW OVERRIDE RPC
CREATE OR REPLACE FUNCTION public.update_support_safety_review(
  p_ticket_id UUID,
  p_requires_safety BOOLEAN,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE public.support_tickets
  SET requires_safety_review = p_requires_safety,
      updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.admin_activity_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'UPDATE_SUPPORT_SAFETY_REVIEW', 'support_ticket', p_ticket_id, jsonb_build_object('requires_safety', p_requires_safety, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- GUEST SUPPORT TICKET RETRIEVAL & REPLY RPCs
CREATE OR REPLACE FUNCTION public.get_guest_support_ticket(
  p_ticket_number TEXT,
  p_receipt_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_messages JSONB;
BEGIN
  SELECT t.* INTO v_ticket
  FROM public.support_tickets t
  JOIN public.orders o ON o.id = t.order_id
  WHERE t.ticket_number = p_ticket_number AND o.receipt_token = p_receipt_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid ticket number or receipt token');
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'sender_type', sender_type,
    'message', message,
    'created_at', created_at
  )) INTO v_messages
  FROM public.support_messages
  WHERE ticket_id = v_ticket.id AND visibility = 'customer';

  RETURN jsonb_build_object(
    'success', true,
    'ticket', jsonb_build_object(
      'ticket_number', v_ticket.ticket_number,
      'category', v_ticket.category,
      'subject', v_ticket.subject,
      'status', v_ticket.status,
      'created_at', v_ticket.created_at
    ),
    'messages', COALESCE(v_messages, '[]'::jsonb)
  );
END;
$$;

-- RECONCILE SUPPORT SLA BREACHES RPC (PHASE 8 INTEGRATION)
CREATE OR REPLACE FUNCTION public.reconcile_support_sla()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, ticket_number, priority, first_response_due_at
    FROM public.support_tickets
    WHERE status IN ('open', 'assigned')
      AND first_response_at IS NULL
      AND first_response_due_at < now()
  LOOP
    PERFORM public.upsert_operational_exception(
      'SUPPORT_SLA_BREACH',
      'high',
      'support_ticket',
      r.id,
      NULL,
      'Support Ticket SLA Response Breach',
      'Ticket ' || r.ticket_number || ' (' || r.priority || ') breached first response SLA target.',
      'reconcile_support_sla',
      'SLA_BREACH',
      'tkt_sla_' || r.id::text,
      jsonb_build_object('priority', r.priority)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
