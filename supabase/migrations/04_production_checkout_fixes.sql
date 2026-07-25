-- ====================================================================
-- S.S. PHARMACY — PRODUCTION CHECKOUT FIXES (04)
-- Features: Idempotency, Atomic Online Payments, Guest Receipt Auth
-- ====================================================================

-- 1. Add idempotency and guest receipt columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS checkout_attempt_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS receipt_token TEXT;

-- 2. Refactor create_checkout_order to be fully atomic and idempotent
DROP FUNCTION IF EXISTS public.create_checkout_order(text, text, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_checkout_order(text, text, text, text, text, text, text, text, jsonb, uuid, text);

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
  p_checkout_attempt_id UUID DEFAULT NULL,
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_delivery NUMERIC(10, 2) := 50.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_item RECORD;
  v_product_mrp NUMERIC(10, 2);
  v_product_name TEXT;
  v_user_id UUID := p_user_id;
  v_receipt_token TEXT := NULL;
  v_existing_order JSONB;
BEGIN
  -- Idempotency Check: if checkout_attempt_id exists, return the existing order safely
  IF p_checkout_attempt_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'success', true,
      'order_id', id,
      'order_number', order_number,
      'total_amount', total_amount,
      'receipt_token', receipt_token,
      'razorpay_order_id', razorpay_order_id,
      'is_duplicate', true
    ) INTO v_existing_order
    FROM public.orders 
    WHERE checkout_attempt_id = p_checkout_attempt_id;

    IF v_existing_order IS NOT NULL THEN
      RETURN v_existing_order;
    END IF;
  END IF;

  -- Validate that items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Generate unique Order Number
  v_order_number := 'SSP-' || floor(100000 + random() * 900000)::TEXT;

  -- Generate receipt token for guests
  IF v_user_id IS NULL THEN
    v_receipt_token := encode(gen_random_bytes(16), 'hex');
  END IF;

  -- Verify prices and calculate subtotal
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (id TEXT, quantity INT)
  LOOP
    SELECT mrp, name INTO v_product_mrp, v_product_name 
    FROM public.products 
    WHERE id = v_item.id;
    
    IF v_product_mrp IS NULL THEN
      RAISE EXCEPTION 'Product with ID % not found in database', v_item.id;
    END IF;

    IF v_item.quantity <= 0 OR v_item.quantity > 999 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.id;
    END IF;

    v_subtotal := v_subtotal + (v_product_mrp * v_item.quantity);
  END LOOP;

  -- Apply shipping fee rule: Free if subtotal >= 999, else 50
  IF v_subtotal >= 999.00 THEN
    v_delivery := 0.00;
  END IF;
  v_total := v_subtotal + v_delivery;

  -- Insert order record
  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    city,
    state,
    pincode,
    subtotal,
    delivery_charge,
    total_amount,
    payment_method,
    payment_status,
    order_status,
    checkout_attempt_id,
    razorpay_order_id,
    receipt_token
  ) VALUES (
    v_order_number,
    v_user_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_shipping_address,
    p_city,
    p_state,
    p_pincode,
    v_subtotal,
    v_delivery,
    v_total,
    p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'cod_pending'::text ELSE 'pending'::text END,
    'new',
    p_checkout_attempt_id,
    p_razorpay_order_id,
    v_receipt_token
  ) RETURNING id INTO v_order_id;

  -- Insert items associated with this order
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (id TEXT, quantity INT)
  LOOP
    SELECT mrp, name INTO v_product_mrp, v_product_name 
    FROM public.products 
    WHERE id = v_item.id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_item.id,
      v_product_name,
      v_item.quantity,
      v_product_mrp,
      v_product_mrp * v_item.quantity
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total,
    'receipt_token', v_receipt_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Secure Guest Order Receipt function
CREATE OR REPLACE FUNCTION public.get_guest_order_receipt(p_order_number TEXT, p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  -- Strict validation of token
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Invalid receipt token';
  END IF;

  SELECT id, order_number, subtotal, delivery_charge, total_amount, payment_method, payment_status, order_status, city, state, pincode, created_at, customer_name, customer_email, customer_phone, shipping_address
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number AND receipt_token = p_token AND user_id IS NULL;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'quantity', quantity,
      'unit_price', unit_price,
      'total_price', total_price
    )
  ) INTO v_items
  FROM public.order_items
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'subtotal', v_order.subtotal,
    'delivery_charge', v_order.delivery_charge,
    'total_amount', v_order.total_amount,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'destination', v_order.city || ', ' || v_order.state || ' - ' || v_order.pincode,
    'created_at', v_order.created_at,
    'items', v_items,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Secure Public Tracking function
CREATE OR REPLACE FUNCTION public.track_guest_order(p_order_number TEXT, p_customer_phone TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF p_order_number IS NULL OR p_customer_phone IS NULL THEN
    RAISE EXCEPTION 'Order number and phone required';
  END IF;

  SELECT order_number, order_status, payment_status, created_at, city, state, pincode
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number AND customer_phone = p_customer_phone;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found matching provided details';
  END IF;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'destination', v_order.city || ', ' || v_order.state || ' - ' || v_order.pincode
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
