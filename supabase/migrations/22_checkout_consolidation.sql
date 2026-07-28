-- ============================================================================
-- S.S. PHARMACY — MIGRATION 22: CHECKOUT CONSOLIDATION & SECURITY HARDENING
-- Features: Drop legacy checkout overloads, unified canonical creation RPC,
--           orders constraints & RLS inserts denial, commit stock by Razorpay ID,
--           restrict EXECUTE to service_role, and notification constraints update.
-- ============================================================================

-- 1. Preflight Assertions: Fail migration if duplicates exist in existing rows
DO $$
DECLARE
  v_dup_checkout INT;
  v_dup_rzp INT;
BEGIN
  -- Check for duplicates on checkout_attempt_id
  SELECT COUNT(*) INTO v_dup_checkout
  FROM (
    SELECT checkout_attempt_id
    FROM public.orders
    WHERE checkout_attempt_id IS NOT NULL AND checkout_attempt_id <> ''
    GROUP BY checkout_attempt_id
    HAVING COUNT(*) > 1
  ) as dups;

  -- Check for duplicates on razorpay_order_id
  SELECT COUNT(*) INTO v_dup_rzp
  FROM (
    SELECT razorpay_order_id
    FROM public.orders
    WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id <> ''
    GROUP BY razorpay_order_id
    HAVING COUNT(*) > 1
  ) as dups;

  IF v_dup_checkout > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Duplicate non-null values found in orders.checkout_attempt_id. Run preflight query check.';
  END IF;

  IF v_dup_rzp > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Duplicate non-null values found in orders.razorpay_order_id. Run preflight query check.';
  END IF;
END $$;

-- 2. Drop conflicting legacy overloaded functions
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID);

-- 3. Enforce Unique Constraints on order identifiers
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_checkout_attempt_id_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_checkout_attempt_id_key UNIQUE (checkout_attempt_id);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_razorpay_order_id_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_razorpay_order_id_key UNIQUE (razorpay_order_id);

-- 4. Correct event_type check constraint in customer_notifications
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_event_type_check;
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_event_type_check 
CHECK (event_type IN (
  'ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_PACKED',
  'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
  'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED',
  'REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_PROCESSED', 'REFUND_FAILED',
  'INVOICE_ISSUED'
));

-- 5. Create Canonical Checkout Function
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
    -- Check Product Existence
    SELECT name, mrp INTO v_prod FROM public.products WHERE id = v_item.id;
    IF v_prod IS NULL THEN
      RAISE EXCEPTION 'Product % not found in database', v_item.id;
    END IF;

    -- Validate Quantity Limits
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 OR v_item.quantity > 999 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.id;
    END IF;

    v_subtotal := v_subtotal + (v_prod.mrp * v_item.quantity);
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

  -- Snap items into order_items snapshotted pricing
  FOR v_item IN SELECT (item->>'id') AS id, (item->>'quantity')::int AS quantity FROM jsonb_array_elements(p_items) AS item LOOP
    SELECT name, mrp FROM public.products WHERE id = v_item.id INTO v_prod;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (v_order_id, v_item.id, v_prod.name, v_item.quantity, v_prod.mrp, (v_prod.mrp * v_item.quantity));
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

  -- Queue Placement Notification event
  PERFORM public.queue_customer_notification(v_order_id, 'ORDER_PLACED', 'email');

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

-- 6. Configure Privileges for create_checkout_order Function (Signature-Specific)
-- Direct client execution is disabled. The checkout Edge Function runs with service_role.
REVOKE ALL ON FUNCTION public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO service_role;

-- Harden RLS Policies (DENY Direct Client inserts)
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Deny client insert on orders" ON public.orders FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client insert on order_items" ON public.order_items FOR INSERT WITH CHECK (false);

-- 7. Create commit_order_stock_by_rzp Function
CREATE OR REPLACE FUNCTION public.commit_order_stock_by_rzp(
  p_rzp_order_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_res JSONB;
BEGIN
  IF p_rzp_order_id IS NULL OR trim(p_rzp_order_id) = '' THEN
    RAISE EXCEPTION 'Razorpay order ID is required';
  END IF;

  -- Lock the order FOR UPDATE to serialize concurrent handlers (verification vs webhook)
  SELECT id, payment_status INTO v_order
  FROM public.orders
  WHERE razorpay_order_id = p_rzp_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found for Razorpay Order ID %', p_rzp_order_id;
  END IF;

  -- Call the underlying idempotent commit_order_stock function
  v_res := public.commit_order_stock(v_order.id);
  RETURN v_res;
END;
$$;

-- 8. Restrict commit_order_stock_by_rzp to service_role Only (Signature-Specific)
REVOKE ALL ON FUNCTION public.commit_order_stock_by_rzp(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_order_stock_by_rzp(TEXT) TO service_role;
