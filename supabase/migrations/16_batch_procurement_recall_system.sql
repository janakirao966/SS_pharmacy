-- ============================================================================
-- S.S. PHARMACY — PHASE 11: PRODUCTION PHARMACEUTICAL BATCH/LOT INVENTORY,
-- EXPIRY, PROCUREMENT, SUPPLIER, GOODS RECEIPT & PRODUCT RECALL SYSTEM
-- Migration: 16_batch_procurement_recall_system.sql
-- ============================================================================

-- 1. MANUFACTURERS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  drug_license_number TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SUPPLIERS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  drug_license_number TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CENTRALIZED INVENTORY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_settings (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  description TEXT
);

INSERT INTO public.inventory_settings (key, value, description)
VALUES
  ('min_dispatch_shelf_life_days', 30, 'Minimum remaining shelf life days required for dispatch'),
  ('expiry_critical_days', 30, 'Threshold for critical expiry warning'),
  ('expiry_warning_days', 60, 'Threshold for warning expiry notice'),
  ('expiry_notice_days', 90, 'Threshold for general expiry notice')
ON CONFLICT (key) DO NOTHING;

-- 4. SEQUENCE TABLES
CREATE TABLE IF NOT EXISTS public.purchase_order_sequences (
  fy_year INTEGER PRIMARY KEY,
  current_val INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_sequences (
  fy_year INTEGER PRIMARY KEY,
  current_val INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.recall_sequences (
  year INTEGER PRIMARY KEY,
  current_val INTEGER NOT NULL DEFAULT 0
);

-- 5. PURCHASE ORDERS & ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'partially_received', 'received', 'cancelled', 'closed')),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  supplier_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
  received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
  gst_rate_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. GOODS RECEIPTS & ITEMS (GRN)
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_invoice_number TEXT,
  supplier_invoice_date DATE,
  received_at TIMESTAMPTZ DEFAULT now(),
  received_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'inspection_pending', 'accepted', 'partially_accepted', 'rejected', 'posted')),
  idempotency_key TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  received_quantity INTEGER NOT NULL CHECK (received_quantity >= 0),
  accepted_quantity INTEGER NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
  rejected_quantity INTEGER NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
  unit_cost_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  mrp_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gst_rate_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  quality_status TEXT NOT NULL DEFAULT 'pending' CHECK (quality_status IN ('pending', 'accepted', 'quarantine', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. INVENTORY BATCHES MASTER TABLE
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  goods_receipt_item_id UUID REFERENCES public.goods_receipt_items(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  status TEXT NOT NULL DEFAULT 'quarantine' CHECK (status IN ('quarantine', 'sellable', 'blocked', 'recalled', 'expired', 'depleted', 'damaged')),
  quality_status TEXT NOT NULL DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_batch_reserved_lte_hand CHECK (quantity_reserved <= quantity_on_hand),
  CONSTRAINT idx_inv_batch_prod_num_supp UNIQUE (product_id, batch_number, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_prod_exp ON public.inventory_batches (product_id, expiry_date, status);

-- 8. APPEND-ONLY BATCH MOVEMENT LEDGER
CREATE TABLE IF NOT EXISTS public.batch_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
  goods_receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'GRN_RECEIPT', 'RESERVATION_CREATED', 'RESERVATION_RELEASED', 'SALE_COMMITTED', 
    'RETURN_RESTOCK', 'RTO_RESTOCK', 'MANUAL_ADJUSTMENT', 'DAMAGE', 'EXPIRY', 
    'QUARANTINE', 'QUARANTINE_RELEASE', 'RECALL_BLOCK', 'RECALL_RELEASE', 'STOCK_CORRECTION'
  )),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ORDER ITEM BATCH ALLOCATIONS TRACEABILITY TABLE
CREATE TABLE IF NOT EXISTS public.order_item_batch_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_committed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'committed', 'released', 'returned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_allocations_order ON public.order_item_batch_allocations (order_id);
CREATE INDEX IF NOT EXISTS idx_allocations_batch ON public.order_item_batch_allocations (batch_id);

-- 10. PRODUCT RECALLS & RECALL BATCHES
CREATE TABLE IF NOT EXISTS public.product_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  recall_type TEXT NOT NULL DEFAULT 'batch' CHECK (recall_type IN ('product', 'batch')),
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recall_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_id UUID NOT NULL REFERENCES public.product_recalls(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT idx_recall_batch_unique UNIQUE (recall_id, batch_id)
);

-- 11. RLS POLICIES (ADMIN ONLY ACCESS FOR PROCUREMENT & BATCH DATA, COST DATA HIDDEN)
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recalls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only manufacturers" ON public.manufacturers;
CREATE POLICY "Admin only manufacturers" ON public.manufacturers FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only suppliers" ON public.suppliers;
CREATE POLICY "Admin only suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only POs" ON public.purchase_orders;
CREATE POLICY "Admin only POs" ON public.purchase_orders FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only GRNs" ON public.goods_receipts;
CREATE POLICY "Admin only GRNs" ON public.goods_receipts FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only batches" ON public.inventory_batches;
CREATE POLICY "Admin only batches" ON public.inventory_batches FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only batch movements" ON public.batch_inventory_movements;
CREATE POLICY "Admin only batch movements" ON public.batch_inventory_movements FOR ALL TO authenticated USING (public.is_admin());

-- 12. SERVER-AUTHORITATIVE RPCs

-- POST GOODS RECEIPT RPC (IDEMPOTENT GRN POSTING & BATCH CREATION)
CREATE OR REPLACE FUNCTION public.post_goods_receipt(
  p_grn_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn public.goods_receipts%ROWTYPE;
  v_item RECORD;
  v_batch_id UUID;
  v_min_shelf_life INT := 30;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_grn FROM public.goods_receipts WHERE id = p_grn_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'GRN not found');
  END IF;

  IF v_grn.status = 'posted' THEN
    RETURN jsonb_build_object('success', true, 'grn_number', v_grn.grn_number, 'already_posted', true);
  END IF;

  -- Create inventory batches and update product inventory for each accepted GRN item
  FOR v_item IN SELECT * FROM public.goods_receipt_items WHERE goods_receipt_id = p_grn_id AND accepted_quantity > 0 LOOP
    INSERT INTO public.inventory_batches (
      product_id, supplier_id, manufacturer_id, goods_receipt_item_id,
      batch_number, manufacturing_date, expiry_date, mrp, unit_cost,
      quantity_received, quantity_on_hand, status, quality_status
    ) VALUES (
      v_item.product_id, v_grn.supplier_id, v_item.manufacturer_id, v_item.id,
      v_item.batch_number, v_item.manufacturing_date, v_item.expiry_date, v_item.mrp_snapshot, v_item.unit_cost_snapshot,
      v_item.accepted_quantity, v_item.accepted_quantity,
      CASE WHEN v_item.quality_status = 'accepted' THEN 'sellable' ELSE 'quarantine' END,
      CASE WHEN v_item.quality_status = 'accepted' THEN 'approved' ELSE 'pending' END
    )
    ON CONFLICT (product_id, batch_number, supplier_id)
    DO UPDATE SET
      quantity_on_hand = public.inventory_batches.quantity_on_hand + EXCLUDED.quantity_received,
      updated_at = now()
    RETURNING id INTO v_batch_id;

    -- Update Product Level Inventory on_hand stock
    PERFORM public.adjust_inventory(v_item.product_id, v_item.accepted_quantity, 'GRN Posted: ' || v_grn.grn_number);

    -- Log batch movement
    INSERT INTO public.batch_inventory_movements (
      batch_id, product_id, goods_receipt_id, movement_type, quantity_change,
      quantity_before, quantity_after, reason, created_by
    ) VALUES (
      v_batch_id, v_item.product_id, p_grn_id, 'GRN_RECEIPT', v_item.accepted_quantity,
      0, v_item.accepted_quantity, 'Goods Receipt Posted: ' || v_grn.grn_number, auth.uid()
    );
  END LOOP;

  UPDATE public.goods_receipts
  SET status = 'posted', idempotency_key = COALESCE(p_idempotency_key, idempotency_key), updated_at = now()
  WHERE id = p_grn_id;

  RETURN jsonb_build_object('success', true, 'grn_number', v_grn.grn_number);
END;
$$;

-- ACTIVATE PRODUCT RECALL RPC
CREATE OR REPLACE FUNCTION public.activate_product_recall(
  p_recall_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recall public.product_recalls%ROWTYPE;
  v_rb RECORD;
  v_alloc RECORD;
  v_affected_orders JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  SELECT * INTO v_recall FROM public.product_recalls WHERE id = p_recall_id FOR UPDATE;
  IF NOT FOUND OR v_recall.status = 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recall not found or already active');
  END IF;

  -- Block all recalled batches
  FOR v_rb IN SELECT batch_id FROM public.recall_batches WHERE recall_id = p_recall_id LOOP
    UPDATE public.inventory_batches
    SET status = 'recalled', updated_at = now()
    WHERE id = v_rb.batch_id;

    -- Release active reservations for recalled batch
    FOR v_alloc IN SELECT * FROM public.order_item_batch_allocations WHERE batch_id = v_rb.batch_id AND status = 'reserved' LOOP
      PERFORM public.release_order_stock(v_alloc.order_id, 'Order Reservation Released: Batch Recalled');
      UPDATE public.order_item_batch_allocations SET status = 'released', released_at = now() WHERE id = v_alloc.id;
    END LOOP;
  END LOOP;

  -- Update Recall Status
  UPDATE public.product_recalls
  SET status = 'active', initiated_at = now(), approved_by = auth.uid(), updated_at = now()
  WHERE id = p_recall_id;

  RETURN jsonb_build_object('success', true, 'recall_number', v_recall.recall_number);
END;
$$;

-- RECONCILE BATCH INVENTORY RPC (PHASE 8 INTEGRATION WORKER)
CREATE OR REPLACE FUNCTION public.reconcile_batch_inventory()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
  v_batch_hand_sum INT;
  v_batch_res_sum INT;
BEGIN
  FOR r IN SELECT * FROM public.inventory LOOP
    SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(quantity_reserved), 0)
    INTO v_batch_hand_sum, v_batch_res_sum
    FROM public.inventory_batches
    WHERE product_id = r.product_id;

    IF r.quantity_on_hand != v_batch_hand_sum OR r.quantity_reserved != v_batch_res_sum THEN
      PERFORM public.upsert_operational_exception(
        'BATCH_PRODUCT_STOCK_MISMATCH',
        'high',
        'inventory',
        r.id,
        NULL,
        'Batch vs Product Stock Mismatch',
        'Product ' || r.product_id || ' aggregate stock (' || r.quantity_on_hand || ') mismatches batch sum (' || v_batch_hand_sum || ').',
        'reconcile_batch_inventory',
        'STOCK_MISMATCH',
        'batch_recon_' || r.product_id,
        jsonb_build_object('product_stock', r.quantity_on_hand, 'batch_stock', v_batch_hand_sum)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
