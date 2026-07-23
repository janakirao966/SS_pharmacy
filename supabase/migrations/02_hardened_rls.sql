-- ====================================================================
-- S.S. PHARMACY — HARDENED PRODUCTION SECURITY & RLS MIGRATION (TASK 1)
-- Features: is_admin() SECURITY DEFINER, RLS Policies, B2B Applications
-- ====================================================================

-- 1. Create UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Profiles Table (Stores user roles & metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY DEFINER is_admin Helper Function
-- Prevents RLS infinite recursion when evaluating profile permissions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 5. PROFILES RLS POLICIES
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- 6. ORDERS RLS POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create order" ON public.orders';
    EXECUTE 'CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Customers and Admins view orders" ON public.orders';
    EXECUTE 'CREATE POLICY "Customers and Admins view orders" ON public.orders FOR SELECT USING (user_id = auth.uid() OR public.is_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "Only Admins can update orders" ON public.orders';
    EXECUTE 'CREATE POLICY "Only Admins can update orders" ON public.orders FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- 7. ORDER ITEMS RLS POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items';
    EXECUTE 'CREATE POLICY "Anyone insert order items" ON public.order_items FOR INSERT WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS "View order items if owner or admin" ON public.order_items';
    EXECUTE 'CREATE POLICY "View order items if owner or admin" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin())))';
  END IF;
END $$;

-- 8. DISTRIBUTOR APPLICATIONS TABLE & RLS (B2B Leads)
CREATE TABLE IF NOT EXISTS public.distributor_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  gstin TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  expected_monthly_volume TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'contacted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.distributor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit distributor application" ON public.distributor_applications;
CREATE POLICY "Anyone can submit distributor application" ON public.distributor_applications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage distributor applications" ON public.distributor_applications;
CREATE POLICY "Admins manage distributor applications" ON public.distributor_applications
  FOR ALL USING (public.is_admin());

-- 9. Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, is_admin)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'S.S. Pharmacy Customer'),
    new.email,
    new.raw_user_meta_data->>'phone',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
