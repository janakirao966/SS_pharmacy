-- ============================================================================
-- S.S. PHARMACY — MIGRATION 23: ADDRESSES SCHEMA & INVENTORY Lifecycles
-- Features: public.addresses table, constraints, partial unique default index,
--           set_default_address transaction safe RPC, metadata migration,
--           and order cancellation automatic restock trigger.
-- ============================================================================

-- 1. Create Addresses Table with check constraints for data integrity
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CONSTRAINT check_name_non_empty CHECK (trim(name) <> ''),
  phone TEXT NOT NULL CONSTRAINT check_phone_format CHECK (phone ~ '^\d{10}$'),
  address TEXT NOT NULL CONSTRAINT check_address_non_empty CHECK (trim(address) <> ''),
  city TEXT NOT NULL CONSTRAINT check_city_non_empty CHECK (trim(city) <> ''),
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh' CONSTRAINT check_state_non_empty CHECK (trim(state) <> ''),
  pincode TEXT NOT NULL CONSTRAINT check_pincode_format CHECK (pincode ~ '^\d{6}$'),
  tag TEXT NOT NULL CONSTRAINT check_allowed_tag CHECK (tag IN ('Home', 'Office', 'Other')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Prevent multiple default addresses per customer profile using partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS addresses_profile_id_is_default_idx 
ON public.addresses (profile_id) 
WHERE (is_default = true);

-- 3. Automate updated_at timestamp updates using trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS) on Addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 5. Establish Least-Privilege Policies (Admins do not write/view user address books)
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses" ON public.addresses
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "Users can insert own addresses" ON public.addresses
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses" ON public.addresses
  FOR UPDATE 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses" ON public.addresses
  FOR DELETE USING (auth.uid() = profile_id);

-- 6. Transaction-Safe Default Address RPC Handler
CREATE OR REPLACE FUNCTION public.set_default_address(
  p_address_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Verify caller ownership of the address
  SELECT profile_id INTO v_profile_id
  FROM public.addresses
  WHERE id = p_address_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  IF auth.uid() IS NULL OR v_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied. You can only modify your own addresses.';
  END IF;

  -- 1. Unset current default address for this user
  UPDATE public.addresses
  SET is_default = false
  WHERE profile_id = v_profile_id AND is_default = true;

  -- 2. Set selected address as default
  UPDATE public.addresses
  SET is_default = true
  WHERE id = p_address_id;

  RETURN jsonb_build_object('success', true, 'address_id', p_address_id);
END;
$$;

-- Restrict set_default_address privileges
REVOKE ALL ON FUNCTION public.set_default_address(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_address(UUID) TO authenticated;

-- 7. Automatic committed inventory restoration on order cancellation
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_restock()
RETURNS TRIGGER AS $$
DECLARE
  v_res RECORD;
  v_inv RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NEW.order_status = 'cancelled' AND OLD.order_status <> 'cancelled' THEN
    -- 1. Release active reservations (standard reservation release)
    PERFORM public.release_order_stock(NEW.id, 'Order Cancelled');

    -- 2. Restock committed reservations (cancellation restock)
    FOR v_res IN SELECT * FROM public.inventory_reservations WHERE order_id = NEW.id AND status = 'committed' FOR UPDATE LOOP
      SELECT * FROM public.inventory WHERE product_id = v_res.product_id INTO v_inv FOR UPDATE;

      UPDATE public.inventory
      SET quantity_on_hand = quantity_on_hand + v_res.quantity,
          updated_at = now()
      WHERE product_id = v_res.product_id;

      UPDATE public.inventory_reservations
      SET status = 'released', released_at = now()
      WHERE id = v_res.id;

      INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_by)
      VALUES (v_res.product_id, NEW.id, 'CANCELLATION_RESTOCK', v_res.quantity, v_inv.quantity_on_hand, v_inv.quantity_on_hand + v_res.quantity, 'Cancellation Restock', v_actor_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_order_cancellation_restock
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_cancellation_restock();

-- 8. Run Legacy metadata saved_addresses migration (Tolerate malformed records)
DO $$
DECLARE
  v_user RECORD;
  v_addr JSONB;
  v_addr_array JSONB;
  v_has_default BOOLEAN;
  v_name TEXT;
  v_phone TEXT;
  v_address TEXT;
  v_city TEXT;
  v_state TEXT;
  v_pincode TEXT;
  v_tag TEXT;
  v_is_default BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    FOR v_user IN SELECT id, raw_user_meta_data FROM auth.users LOOP
      v_addr_array := v_user.raw_user_meta_data->'saved_addresses';
      
      -- Validate that saved_addresses is not null and is a valid JSON array
      IF v_addr_array IS NOT NULL AND jsonb_typeof(v_addr_array) = 'array' THEN
        v_has_default := false;
        
        FOR v_addr IN SELECT * FROM jsonb_array_elements(v_addr_array) LOOP
          -- Extract and trim values safely
          v_name := trim(COALESCE(v_addr->>'name', ''));
          v_phone := trim(COALESCE(v_addr->>'phone', ''));
          v_address := trim(COALESCE(v_addr->>'address', ''));
          v_city := trim(COALESCE(v_addr->>'city', ''));
          v_state := trim(COALESCE(v_addr->>'state', 'Andhra Pradesh'));
          v_pincode := trim(COALESCE(v_addr->>'pincode', ''));
          v_tag := trim(COALESCE(v_addr->>'tag', 'Home'));
          
          -- Safely determine default state without crashing
          BEGIN
            v_is_default := COALESCE((v_addr->>'isDefault')::boolean, false);
          EXCEPTION WHEN OTHERS THEN
            v_is_default := false;
          END;

          -- Validate legacy entries before migrating
          IF v_name <> '' AND
             v_phone ~ '^\d{10}$' AND
             v_address <> '' AND
             v_city <> '' AND
             v_state <> '' AND
             v_pincode ~ '^\d{6}$' AND
             v_tag IN ('Home', 'Office', 'Other') THEN
             
            -- Ensure at most one address is marked default per profile during migration
            IF v_is_default THEN
              IF v_has_default THEN
                v_is_default := false; -- Demote subsequent defaults
              ELSE
                v_has_default := true;
              END IF;
            END IF;

            -- Prevent duplicate insertions
            IF NOT EXISTS (
              SELECT 1 FROM public.addresses 
              WHERE profile_id = v_user.id 
                AND name = v_name
                AND phone = v_phone
                AND address = v_address
            ) THEN
              INSERT INTO public.addresses (
                profile_id, name, phone, address, city, state, pincode, tag, is_default
              ) VALUES (
                v_user.id, v_name, v_phone, v_address, v_city, v_state, v_pincode, v_tag, v_is_default
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
END $$;
