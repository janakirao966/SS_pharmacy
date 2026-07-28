-- ====================================================================
-- S.S. PHARMACY — PRODUCT CATALOG & SNAPSHOT EXTENSIONS (24)
-- Features: selling_price, is_active, order_items snapshots
-- ====================================================================

-- 1. Add columns to public.products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Backfill existing products so selling_price matches mrp
UPDATE public.products SET selling_price = mrp WHERE selling_price IS NULL;

-- 3. Set columns as NOT NULL and add check constraints
ALTER TABLE public.products ALTER COLUMN selling_price SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN is_active SET NOT NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_mrp;
ALTER TABLE public.products ADD CONSTRAINT chk_products_mrp CHECK (mrp > 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_selling_price;
ALTER TABLE public.products ADD CONSTRAINT chk_products_selling_price CHECK (selling_price > 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_price_relation;
ALTER TABLE public.products ADD CONSTRAINT chk_products_price_relation CHECK (selling_price <= mrp);

-- 4. Add snapshot columns to public.order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS mrp_snapshot NUMERIC(10, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS pack_size_snapshot TEXT;

-- 5. Backfill existing order items snapshots using current product values
UPDATE public.order_items oi
SET mrp_snapshot = COALESCE((SELECT mrp FROM public.products p WHERE p.id = oi.product_id), oi.unit_price),
    pack_size_snapshot = COALESCE((SELECT pack_size FROM public.products p WHERE p.id = oi.product_id), '50 gms')
WHERE mrp_snapshot IS NULL OR pack_size_snapshot IS NULL;

ALTER TABLE public.order_items ALTER COLUMN mrp_snapshot SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN pack_size_snapshot SET NOT NULL;

-- 6. Recreate consolidated create_checkout_order function to use selling_price and record snapshots
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_pincode TEXT,
  p_payment_method TEXT,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL,
  p_checkout_attempt_id TEXT DEFAULT NULL,
  p_razorpay_order_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_existing_order RECORD;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_delivery NUMERIC(10, 2) := 50.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_item RECORD;
  v_prod RECORD;
  v_receipt_token TEXT;
  v_user_id UUID;
  v_month INT;
  v_year INT;
  v_seq INT;
BEGIN
  -- Validate Input Parameters
  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF p_customer_phone IS NULL OR trim(p_customer_phone) = '' OR length(trim(p_customer_phone)) < 10 THEN
    RAISE EXCEPTION 'Valid 10-digit customer phone is required';
  END IF;
  IF p_shipping_address IS NULL OR trim(p_shipping_address) = '' THEN
    RAISE EXCEPTION 'Shipping address is required';
  END IF;
  IF p_pincode IS NULL OR NOT (p_pincode ~ '^\d{6}$') THEN
    RAISE EXCEPTION 'Valid 6-digit pin code is required';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'online_razorpay') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Validate Ownership (Do Not Trust p_user_id)
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Authentication mismatch: Cannot checkout on behalf of another user';
    END IF;
    v_user_id := auth.uid();
  ELSE
    IF p_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Guest checkout cannot specify a user ID';
    END IF;
    v_user_id := NULL;
  END IF;

  -- Compute subtotal & Validate Products
  FOR v_item IN SELECT (item->>'id') AS id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    -- Check Product Existence and Active Status
    SELECT name, mrp, selling_price, pack_size, is_active INTO v_prod FROM public.products WHERE id = v_item.id;
    IF v_prod IS NULL THEN
      RAISE EXCEPTION 'Product % not found in database', v_item.id;
    END IF;
    
    IF NOT v_prod.is_active THEN
      RAISE EXCEPTION 'Product % is currently inactive and cannot be purchased', v_prod.name;
    END IF;

    -- Validate Quantity Limits
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 OR v_item.quantity > 999 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.id;
    END IF;

    v_subtotal := v_subtotal + (v_prod.selling_price * v_item.quantity);
  END LOOP;

  -- Apply shipping rule: Free if subtotal >= 999
  IF v_subtotal >= 999.00 THEN
    v_delivery := 0.00;
  END IF;
  v_total := v_subtotal + v_delivery;

  -- Select-Before-Insert Idempotency Check with Ownership Protection
  IF p_checkout_attempt_id IS NOT NULL AND p_checkout_attempt_id <> '' THEN
    SELECT id, user_id, customer_name, customer_phone, customer_email, 
           shipping_address, city, state, pincode, payment_method, total_amount,
           order_number, receipt_token, razorpay_order_id INTO v_existing_order
     FROM public.orders
     WHERE checkout_attempt_id = p_checkout_attempt_id;

    IF FOUND THEN
      -- Validate Ownership on existing order
      IF auth.uid() IS NOT NULL THEN
        -- Registered User ownership check
        IF v_existing_order.user_id IS NULL OR v_existing_order.user_id <> auth.uid() THEN
          RAISE EXCEPTION 'Ownership mismatch: Checkout attempt belongs to another session or user';
        END IF;
      ELSE
        -- Guest User ownership check: verify that all critical parameters match the original checkout
        IF v_existing_order.user_id IS NOT NULL THEN
          RAISE EXCEPTION 'Ownership mismatch: Guest session cannot retrieve authenticated order details';
        END IF;
        
        IF v_existing_order.customer_name <> p_customer_name OR
           v_existing_order.customer_phone <> p_customer_phone OR
           COALESCE(v_existing_order.customer_email, '') <> COALESCE(p_customer_email, '') OR
           v_existing_order.shipping_address <> p_shipping_address OR
           v_existing_order.city <> p_city OR
           v_existing_order.state <> p_state OR
           v_existing_order.pincode <> p_pincode OR
           v_existing_order.payment_method <> p_payment_method OR
           v_existing_order.total_amount <> v_total THEN
          RAISE EXCEPTION 'Ownership mismatch: Guest checkout parameters do not match original attempt';
        END IF;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'receipt_token', v_existing_order.receipt_token,
        'razorpay_order_id', v_existing_order.razorpay_order_id,
        'already_exists', true
      );
    END IF;
  END IF;

  -- Generate order details
  v_month := extract(month from now());
  v_year := extract(year from now());
  v_seq := floor(random() * 900000 + 100000);
  v_order_number := 'SSP-' || lpad(v_month::text, 2, '0') || (v_year % 100)::text || '-' || v_seq::text;
  v_receipt_token := encode(gen_random_bytes(16), 'hex');

  -- INSERT Order wrapping unique_violation to trap race conditions
  BEGIN
    INSERT INTO public.orders (
      order_number, user_id, customer_name, customer_phone, customer_email,
      shipping_address, city, state, pincode, subtotal, delivery_charge,
      total_amount, payment_method, payment_status, order_status, checkout_attempt_id,
      razorpay_order_id, receipt_token
    ) VALUES (
      v_order_number, v_user_id, p_customer_name, p_customer_phone, p_customer_email,
      p_shipping_address, p_city, p_state, p_pincode, v_subtotal, v_delivery,
      v_total, p_payment_method,
      CASE WHEN p_payment_method = 'cod' THEN 'cod_pending' ELSE 'pending' END,
      'new', p_checkout_attempt_id, p_razorpay_order_id, v_receipt_token
    ) RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
    DECLARE
      v_constraint_name TEXT;
    BEGIN
      -- Extract violated constraint name using PostgreSQL diagnostics
      GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
      IF v_constraint_name = 'orders_checkout_attempt_id_key' THEN
        -- Safely fetch and return the order created by the concurrent thread
        SELECT id, user_id, customer_name, customer_phone, customer_email, 
               shipping_address, city, state, pincode, payment_method, total_amount,
               order_number, receipt_token, razorpay_order_id INTO v_existing_order
        FROM public.orders
        WHERE checkout_attempt_id = p_checkout_attempt_id;

        IF FOUND THEN
          -- Validate Ownership on concurrent retrieval
          IF auth.uid() IS NOT NULL THEN
            IF v_existing_order.user_id IS NULL OR v_existing_order.user_id <> auth.uid() THEN
              RAISE EXCEPTION 'Ownership mismatch: Checkout attempt belongs to another session or user';
            END IF;
          ELSE
            IF v_existing_order.user_id IS NOT NULL THEN
              RAISE EXCEPTION 'Ownership mismatch: Guest session cannot retrieve authenticated order details';
            END IF;
            
            IF v_existing_order.customer_name <> p_customer_name OR
               v_existing_order.customer_phone <> p_customer_phone OR
               COALESCE(v_existing_order.customer_email, '') <> COALESCE(p_customer_email, '') OR
               v_existing_order.shipping_address <> p_shipping_address OR
               v_existing_order.city <> p_city OR
               v_existing_order.state <> p_state OR
               v_existing_order.pincode <> p_pincode OR
               v_existing_order.payment_method <> p_payment_method OR
               v_existing_order.total_amount <> v_total THEN
              RAISE EXCEPTION 'Ownership mismatch: Guest checkout parameters do not match original attempt';
            END IF;
          END IF;

          RETURN jsonb_build_object(
            'success', true,
            'order_id', v_existing_order.id,
            'order_number', v_existing_order.order_number,
            'receipt_token', v_existing_order.receipt_token,
            'razorpay_order_id', v_existing_order.razorpay_order_id,
            'already_exists', true
          );
        ELSE
          RAISE;
        END IF;
      ELSE
        -- Re-raise other unique violations (e.g. orders_order_number_key or orders_razorpay_order_id_key)
        RAISE;
      END IF;
    END;
  END;

  -- Snap items into order_items snapshotted pricing and details
  FOR v_item IN SELECT (item->>'id') AS id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT name, mrp, selling_price, pack_size FROM public.products WHERE id = v_item.id INTO v_prod;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price, mrp_snapshot, pack_size_snapshot)
    VALUES (v_order_id, v_item.id, v_prod.name, v_item.quantity, v_prod.selling_price, (v_prod.selling_price * v_item.quantity), v_prod.mrp, v_prod.pack_size);
  END LOOP;

  -- Record status history
  INSERT INTO public.order_status_history (order_id, from_status, to_status, source, note)
  VALUES (v_order_id, 'none', 'new', 'customer', 'Order created via checkout');

  -- Atomically reserve stock (Fails transaction if reservation fails due to insufficient stock or inactive status)
  PERFORM public.reserve_order_stock(
    v_order_id,
    (SELECT jsonb_agg(jsonb_build_object('product_id', item->>'id', 'quantity', (item->>'quantity')::int)) FROM jsonb_array_elements(p_items) AS item),
    now() + interval '15 minutes'
  );

  -- If COD, commit the stock immediately so it does not expire
  IF p_payment_method = 'cod' THEN
    PERFORM public.commit_order_stock(v_order_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_token', v_receipt_token,
    'razorpay_order_id', p_razorpay_order_id,
    'already_exists', false
  );
END;
$$;

-- Configure Privileges for consolidated Function
REVOKE ALL ON FUNCTION public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO service_role;
