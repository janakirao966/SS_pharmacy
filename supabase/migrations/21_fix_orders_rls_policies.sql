-- ============================================================================
-- S.S. PHARMACY — MIGRATION 21: FIX ORDERS & ORDER_ITEMS RLS POLICIES
-- Migration: 21_fix_orders_rls_policies.sql
-- Description: Allow authenticated customers and guests to insert their orders into orders table
-- ============================================================================

-- 1. Update RLS Insert policy for orders table
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders 
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
  );

-- 2. Update RLS Insert policy for order_items table
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- 3. Ensure SELECT policies allow users to view their own orders
DROP POLICY IF EXISTS "Customers and Admins view orders" ON public.orders;
CREATE POLICY "Customers and Admins view orders" ON public.orders 
  FOR SELECT USING (
    user_id = auth.uid() OR receipt_token IS NOT NULL OR public.is_admin()
  );

-- 4. Re-grant privileges to authenticated, anon, and service_role
GRANT INSERT, SELECT ON public.orders TO anon, authenticated, service_role;
GRANT INSERT, SELECT ON public.order_items TO anon, authenticated, service_role;
