-- ============================================================================
-- S.S. PHARMACY — MIGRATION 20: FIX IS_ADMIN FUNCTION EXECUTION PERMISSIONS
-- Migration: 20_fix_is_admin_permissions.sql
-- Description: Ensures is_admin() helper function has SECURITY DEFINER and execute privileges
-- ============================================================================

-- 1. Ensure is_admin function exists with SECURITY DEFINER and search_path set
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Explicitly grant execute permission to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
