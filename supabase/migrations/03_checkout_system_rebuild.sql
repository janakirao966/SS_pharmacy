-- ====================================================================
-- S.S. PHARMACY — CHECKOUT REBUILD & ATOMIC RPC MIGRATION (03)
-- Features: public.products table, secure checkout RPC, hardened RLS
-- ====================================================================

-- 1. Create Products Table for server-authoritative pricing
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  mrp NUMERIC(10, 2) NOT NULL CHECK (mrp >= 0),
  pack_size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with static product data from products.ts
INSERT INTO public.products (id, name, category, mrp, pack_size) VALUES
('dr-lion-pain-cream', 'Dr. Lion Pain Cream', 'Ayurvedic External Pain Relief Cream', 2999.00, '500 gms'),
('dr-lion-pain-pills', 'Dr. Lion Pain Pills', 'Ayurvedic Proprietary Medicine', 2999.00, '60 Pills'),
('moon-light-cream', 'Moon Light Cream', 'Ayurvedic Skin Care Cream', 1499.00, '50 gms')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  mrp = EXCLUDED.mrp,
  pack_size = EXCLUDED.pack_size,
  updated_at = NOW();

-- Enable RLS on Products Table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products
  FOR SELECT USING (true);

-- Allow admins full access to products
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL USING (public.is_admin());

-- 2. Create the secure atomic checkout order transaction RPC function
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_shipping_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_pincode TEXT,
  p_payment_method TEXT,
  p_items JSONB -- Array of {id: string, quantity: number}
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
BEGIN
  -- Validate that items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Generate unique Order Number
  v_order_number := 'SSP-' || floor(100000 + random() * 900000)::TEXT;

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

  -- Insert order record (user_id is automatically bound to auth.uid() if authenticated)
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
    order_status
  ) VALUES (
    v_order_number,
    auth.uid(),
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
    'new'
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
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Harden Row Level Security on core tables
-- Revoke direct Insert privileges for public users since order creation must happen via the RPC function.
-- (Function executes as SECURITY DEFINER so it will bypass table RLS checks on insert)

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders 
  FOR INSERT WITH CHECK (false); -- Disable direct client inserts

DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (false); -- Disable direct client inserts
