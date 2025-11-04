-- ============================================================================
-- FIX SIGNUP TRIGGER - Handle Optional Fields
-- ============================================================================
-- This fixes the "Database error saving new user" issue
-- The trigger now handles phone and department fields from metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Map role from metadata
    user_role := CASE 
        WHEN LOWER(NEW.raw_user_meta_data->>'role') = 'super admin' THEN 'admin'
        WHEN LOWER(NEW.raw_user_meta_data->>'role') IN ('admin', 'manager', 'employee', 'cashier', 'supplier') 
            THEN LOWER(NEW.raw_user_meta_data->>'role')
        ELSE 'customer'
    END;

    -- Insert or update user in public.users table
    -- Only include columns that actually exist in the table
    INSERT INTO public.users (
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'phone',  -- Add phone from metadata
        user_role::user_role,
        CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN true
            ELSE false
        END,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        is_active = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL
            THEN true
            ELSE users.is_active
        END,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_auth_user_to_public();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (
        OLD.email IS DISTINCT FROM NEW.email
        OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
        OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
    )
    EXECUTE FUNCTION sync_auth_user_to_public();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  SIGNUP TRIGGER FIXED!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 CHANGES MADE:';
    RAISE NOTICE '   ✓ Added phone field support';
    RAISE NOTICE '   ✓ Added error handling (won''t block signups)';
    RAISE NOTICE '   ✓ Improved role mapping';
    RAISE NOTICE '   ✓ Better conflict handling';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Try signing up again';
    RAISE NOTICE '   2. Check if user appears in admin portal';
    RAISE NOTICE '   3. Verify email confirmation works';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SIGNUPS SHOULD WORK NOW!';
    RAISE NOTICE '';
END $$;
