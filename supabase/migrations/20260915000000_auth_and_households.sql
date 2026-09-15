-- ==============================================================================
-- FitDuo / Cuentaconjunta - Step 4 Migration
-- Version: v0.4.0
-- Description: Multi-User Authentication, Couple Household Linking & Pairing Code
-- ==============================================================================

-- 1. Extend households with invite_code and member foreign keys
ALTER TABLE public.households
    ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT substring(upper(md5(random()::text)) from 1 for 6),
    ADD COLUMN IF NOT EXISTS member_a_id UUID,
    ADD COLUMN IF NOT EXISTS member_b_id UUID;

-- Ensure existing households have invite codes
UPDATE public.households
SET invite_code = substring(upper(md5(id::text || random()::text)) from 1 for 6)
WHERE invite_code IS NULL;

ALTER TABLE public.households
    ALTER COLUMN invite_code SET NOT NULL;

-- 2. Extend users with role_in_household
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS role_in_household TEXT CHECK (role_in_household IN ('MEMBER_A', 'MEMBER_B'));

-- Add foreign key constraints if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_households_member_a'
    ) THEN
        ALTER TABLE public.households
            ADD CONSTRAINT fk_households_member_a
            FOREIGN KEY (member_a_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_households_member_b'
    ) THEN
        ALTER TABLE public.households
            ADD CONSTRAINT fk_households_member_b
            FOREIGN KEY (member_b_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Automatic profile creation trigger on Supabase auth.users sign up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
    user_name TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

    -- If the user signed up with an invite_code in metadata, link to that household
    IF NEW.raw_user_meta_data->>'invite_code' IS NOT NULL THEN
        SELECT id INTO new_household_id
        FROM public.households
        WHERE invite_code = upper(NEW.raw_user_meta_data->>'invite_code')
        LIMIT 1;
    END IF;

    -- If no existing household was found or specified, create a new household for this user
    IF new_household_id IS NULL THEN
        INSERT INTO public.households (name, member_a_name, member_b_name)
        VALUES (
            'Hogar de ' || user_name,
            user_name,
            'Pareja'
        )
        RETURNING id INTO new_household_id;

        INSERT INTO public.users (id, email, display_name, household_id, role_in_household)
        VALUES (NEW.id, NEW.email, user_name, new_household_id, 'MEMBER_A');

        UPDATE public.households
        SET member_a_id = NEW.id
        WHERE id = new_household_id;
    ELSE
        -- Linked to existing household as Member B
        INSERT INTO public.users (id, email, display_name, household_id, role_in_household)
        VALUES (NEW.id, NEW.email, user_name, new_household_id, 'MEMBER_B');

        UPDATE public.households
        SET member_b_id = NEW.id,
            member_b_name = user_name
        WHERE id = new_household_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Enable Supabase Realtime for households and users
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.households;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
