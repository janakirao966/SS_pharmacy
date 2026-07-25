-- ==========================================
-- S.S. PHARMACY — MIGRATION 10: GST INVOICE, TAX, CREDIT NOTE & SECURE PDF SYSTEM
-- ==========================================

-- 1. Create business_tax_settings table
CREATE TABLE IF NOT EXISTS public.business_tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_mode TEXT NOT NULL DEFAULT 'UNCONFIGURED' CHECK (tax_mode IN ('UNCONFIGURED', 'GST_REGISTERED', 'COMPOSITION', 'NON_GST')),
  configuration_status TEXT NOT NULL DEFAULT 'UNCONFIGURED' CHECK (configuration_status IN ('UNCONFIGURED', 'DRAFT', 'VERIFIED')),
  legal_business_name TEXT,
  trade_name TEXT DEFAULT 'S.S. PHARMACY',
  gstin TEXT,
  registered_address_line1 TEXT,
  registered_address_line2 TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  invoice_prefix TEXT DEFAULT 'SSP',
  credit_note_prefix TEXT DEFAULT 'CN',
  pricing_tax_mode TEXT CHECK (pricing_tax_mode IN ('TAX_INCLUSIVE', 'TAX_EXCLUSIVE')),
  default_hsn_code TEXT,
  default_gst_rate NUMERIC(5,2),
  delivery_gst_rate NUMERIC(5,2),
  invoice_terms TEXT,
  support_email TEXT DEFAULT 'support@sspharmacy.in',
  support_phone TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed initial unconfigured row if empty
INSERT INTO public.business_tax_settings (tax_mode, configuration_status)
SELECT 'UNCONFIGURED', 'UNCONFIGURED'
WHERE NOT EXISTS (SELECT 1 FROM public.business_tax_settings);

-- 2. Add Tax Columns to Products Table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2);

-- 3. Product Tax Profiles (Historical Tax Versioning)
CREATE TABLE IF NOT EXISTS public.product_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate >= 0),
  taxability TEXT NOT NULL DEFAULT 'TAXABLE' CHECK (taxability IN ('TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST')),
  effective_from TIMESTAMPTZ DEFAULT now(),
  effective_to TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_tax_profiles_product ON public.product_tax_profiles(product_id);

-- 4. Gapless Financial Year Sequence Allocator
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  financial_year TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_sequence BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (financial_year, prefix)
);

-- 5. Invoices Snapshot Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE CHECK (length(invoice_number) <= 16),
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('TAX_INVOICE', 'BILL_OF_SUPPLY')),
  financial_year TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier_legal_name TEXT,
  supplier_trade_name TEXT,
  supplier_gstin TEXT,
  supplier_address JSONB NOT NULL,
  supplier_state TEXT,
  supplier_state_code TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_gstin TEXT,
  billing_address JSONB NOT NULL,
  shipping_address JSONB NOT NULL,
  place_of_supply TEXT NOT NULL,
  place_of_supply_code TEXT NOT NULL,
  tax_treatment TEXT NOT NULL CHECK (tax_treatment IN ('INTRA_STATE', 'INTER_STATE', 'NONE')),
  reverse_charge BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(10,2) NOT NULL,
  discount_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  taxable_value NUMERIC(10,2) NOT NULL,
  cgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  igst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cess_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  payment_status_snapshot TEXT NOT NULL,
  invoice_status TEXT NOT NULL DEFAULT 'issued' CHECK (invoice_status IN ('issued', 'credited', 'cancelled')),
  pdf_status TEXT NOT NULL DEFAULT 'pending' CHECK (pdf_status IN ('pending', 'generating', 'generated', 'failed')),
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  issued_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT invoices_order_id_key UNIQUE (order_id),
  CONSTRAINT invoices_financial_seq_key UNIQUE (financial_year, invoice_type, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- 6. Invoice Items Snapshot Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  hsn_code TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'Pcs',
  unit_price NUMERIC(10,2) NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  taxable_value NUMERIC(10,2) NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- 7. Credit Notes Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  refund_id UUID REFERENCES public.refunds(id) ON DELETE SET NULL,
  credit_note_number TEXT NOT NULL UNIQUE CHECK (length(credit_note_number) <= 16),
  financial_year TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  credit_note_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  taxable_value NUMERIC(10,2) NOT NULL,
  cgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  igst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled')),
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT credit_notes_financial_seq_key UNIQUE (financial_year, sequence_number)
);

-- 8. Configure RLS Policies
ALTER TABLE public.business_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tax settings" ON public.business_tax_settings;
CREATE POLICY "Admins can manage tax settings" ON public.business_tax_settings
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view tax profiles" ON public.product_tax_profiles;
CREATE POLICY "Admins can view tax profiles" ON public.product_tax_profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view invoices" ON public.invoices;
CREATE POLICY "Admins can view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
CREATE POLICY "Customers can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view invoice items" ON public.invoice_items;
CREATE POLICY "Admins can view invoice items" ON public.invoice_items
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own invoice items" ON public.invoice_items;
CREATE POLICY "Customers can view own invoice items" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    )
  );

-- Direct client mutations DENIED.

-- 9. Server-Authoritative Invoice Issuance RPC
CREATE OR REPLACE FUNCTION public.issue_order_invoice(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_settings RECORD;
  v_existing_inv RECORD;
  v_fin_year TEXT;
  v_seq BIGINT;
  v_inv_num TEXT;
  v_inv_id UUID;
  v_inv_type TEXT;
  v_tax_treatment TEXT;
  v_now TIMESTAMPTZ := now();
  v_month INT;
  v_year INT;
  v_subtotal NUMERIC(10,2) := 0.00;
  v_taxable_total NUMERIC(10,2) := 0.00;
  v_cgst_total NUMERIC(10,2) := 0.00;
  v_sgst_total NUMERIC(10,2) := 0.00;
  v_igst_total NUMERIC(10,2) := 0.00;
  v_item_taxable NUMERIC(10,2);
  v_item_tax NUMERIC(10,2);
  v_item_cgst NUMERIC(10,2);
  v_item_sgst NUMERIC(10,2);
  v_item_igst NUMERIC(10,2);
  v_item_rate NUMERIC(5,2);
  v_hsn TEXT;
  v_actor_id UUID := auth.uid();
BEGIN
  -- 1. Idempotency Check: Return existing invoice if already issued
  SELECT * FROM public.invoices WHERE order_id = p_order_id INTO v_existing_inv;
  IF v_existing_inv IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_issued', true,
      'invoice_id', v_existing_inv.id,
      'invoice_number', v_existing_inv.invoice_number
    );
  END IF;

  -- 2. Lock Order row
  SELECT * FROM public.orders WHERE id = p_order_id INTO v_order FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- 3. Load Business Tax Settings
  SELECT * FROM public.business_tax_settings LIMIT 1 INTO v_settings;
  IF v_settings IS NULL OR v_settings.configuration_status != 'VERIFIED' THEN
    RAISE EXCEPTION 'Tax configuration is incomplete. Configure and verify GST settings before issuing invoices.';
  END IF;

  -- 4. Calculate Financial Year
  v_month := extract(month from v_now);
  v_year := extract(year from v_now);
  IF v_month >= 4 THEN
    v_fin_year := (v_year % 100)::text || '-' || ((v_year + 1) % 100)::text;
  ELSE
    v_fin_year := ((v_year - 1) % 100)::text || '-' || (v_year % 100)::text;
  END IF;

  -- 5. Determine Document Type & Tax Treatment
  v_inv_type := CASE WHEN v_settings.tax_mode = 'GST_REGISTERED' THEN 'TAX_INVOICE' ELSE 'BILL_OF_SUPPLY' END;

  IF v_settings.tax_mode = 'GST_REGISTERED' THEN
    IF COALESCE(v_settings.state_code, '37') = COALESCE(v_order.state, '37') THEN
      v_tax_treatment := 'INTRA_STATE';
    ELSE
      v_tax_treatment := 'INTER_STATE';
    END IF;
  ELSE
    v_tax_treatment := 'NONE';
  END IF;

  -- 6. Concurrency-Safe Gapless Sequence Allocation
  INSERT INTO public.invoice_sequences (financial_year, prefix, current_sequence)
  VALUES (v_fin_year, COALESCE(v_settings.invoice_prefix, 'SSP'), 1)
  ON CONFLICT (financial_year, prefix)
  DO UPDATE SET current_sequence = invoice_sequences.current_sequence + 1
  RETURNING current_sequence INTO v_seq;

  v_inv_num := COALESCE(v_settings.invoice_prefix, 'SSP') || '/' || v_fin_year || '/' || lpad(v_seq::text, 6, '0');

  -- 7. Create Main Invoice Record
  INSERT INTO public.invoices (
    order_id,
    invoice_number,
    invoice_type,
    financial_year,
    sequence_number,
    invoice_date,
    supplier_legal_name,
    supplier_trade_name,
    supplier_gstin,
    supplier_address,
    supplier_state,
    supplier_state_code,
    customer_name,
    customer_email,
    customer_phone,
    billing_address,
    shipping_address,
    place_of_supply,
    place_of_supply_code,
    tax_treatment,
    subtotal,
    delivery_charge,
    taxable_value,
    cgst_total,
    sgst_total,
    igst_total,
    grand_total,
    payment_method,
    payment_status_snapshot,
    invoice_status,
    pdf_status,
    created_at,
    issued_at
  ) VALUES (
    p_order_id,
    v_inv_num,
    v_inv_type,
    v_fin_year,
    v_seq,
    v_now,
    v_settings.legal_business_name,
    v_settings.trade_name,
    v_settings.gstin,
    jsonb_build_object(
      'line1', v_settings.registered_address_line1,
      'line2', v_settings.registered_address_line2,
      'city', v_settings.city,
      'state', v_settings.state,
      'pincode', v_settings.postal_code
    ),
    v_settings.state,
    v_settings.state_code,
    v_order.customer_name,
    v_order.customer_email,
    v_order.customer_phone,
    jsonb_build_object('address', v_order.shipping_address, 'city', v_order.city, 'pincode', v_order.pincode, 'state', v_order.state),
    jsonb_build_object('address', v_order.shipping_address, 'city', v_order.city, 'pincode', v_order.pincode, 'state', v_order.state),
    v_order.state,
    COALESCE(v_settings.state_code, '37'),
    v_tax_treatment,
    v_order.subtotal,
    v_order.delivery_charge,
    v_order.subtotal,
    0.00, 0.00, 0.00,
    v_order.total_amount,
    v_order.payment_method,
    v_order.payment_status,
    'issued',
    'pending',
    v_now,
    v_now
  )
  RETURNING id INTO v_inv_id;

  -- 8. Create Invoice Items Snapshots
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    v_item_rate := COALESCE(v_settings.default_gst_rate, 12.00);
    v_hsn := COALESCE(v_settings.default_hsn_code, '3004');

    IF v_tax_treatment = 'INTRA_STATE' THEN
      v_item_taxable := round(v_item.total_price / (1 + (v_item_rate / 100)), 2);
      v_item_tax := v_item.total_price - v_item_taxable;
      v_item_cgst := round(v_item_tax / 2, 2);
      v_item_sgst := v_item_tax - v_item_cgst;
      v_item_igst := 0.00;
    ELSIF v_tax_treatment = 'INTER_STATE' THEN
      v_item_taxable := round(v_item.total_price / (1 + (v_item_rate / 100)), 2);
      v_item_tax := v_item.total_price - v_item_taxable;
      v_item_cgst := 0.00;
      v_item_sgst := 0.00;
      v_item_igst := v_item_tax;
    ELSE
      v_item_taxable := v_item.total_price;
      v_item_cgst := 0.00;
      v_item_sgst := 0.00;
      v_item_igst := 0.00;
    END IF;

    v_taxable_total := v_taxable_total + v_item_taxable;
    v_cgst_total := v_cgst_total + v_item_cgst;
    v_sgst_total := v_sgst_total + v_item_sgst;
    v_igst_total := v_igst_total + v_item_igst;

    INSERT INTO public.invoice_items (
      invoice_id, order_item_id, product_id, product_name, hsn_code, quantity, unit_price, gross_amount, taxable_value, gst_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
    ) VALUES (
      v_inv_id, v_item.id, v_item.product_id, v_item.product_name, v_hsn, v_item.quantity, v_item.unit_price, v_item.total_price, v_item_taxable, v_item_rate, (v_item_rate / 2), v_item_cgst, (v_item_rate / 2), v_item_sgst, v_item_rate, v_item_igst, v_item.total_price
    );
  END LOOP;

  -- 9. Update Totals on Invoice
  UPDATE public.invoices
  SET taxable_value = v_taxable_total,
      cgst_total = v_cgst_total,
      sgst_total = v_sgst_total,
      igst_total = v_igst_total
  WHERE id = v_inv_id;

  -- 10. Audit Log
  INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_actor_id, 'INVOICE_ISSUED', 'invoices', v_inv_id, jsonb_build_object('invoice_number', v_inv_num, 'order_id', p_order_id, 'grand_total', v_order.total_amount));

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_inv_id,
    'invoice_number', v_inv_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. Guest Invoice PDF Access RPC
CREATE OR REPLACE FUNCTION public.get_guest_invoice_pdf(
  p_order_number TEXT,
  p_token TEXT
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_inv RECORD;
BEGIN
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE order_number = upper(trim(p_order_number))
    AND receipt_token = p_token;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Invalid order number or receipt token.';
  END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE order_id = v_order_id;
  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('has_invoice', false);
  END IF;

  RETURN jsonb_build_object(
    'has_invoice', true,
    'invoice_number', v_inv.invoice_number,
    'invoice_date', v_inv.invoice_date,
    'pdf_status', v_inv.pdf_status,
    'pdf_storage_path', v_inv.pdf_storage_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
