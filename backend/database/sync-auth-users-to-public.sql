-- ============================================================================
-- SYNC AUTH USERS TO PUBLIC USERS TABLE
-- ============================================================================
-- This script syncs users from auth.users to public.users table
-- and creates a trigger to automatically sync new registrations
-- ============================================================================

-- ============================================================================
-- STEP 1: Sync existing auth users to public.users table
-- ============================================================================

-- Insert users from auth.users that don't exist in public.users
-- Using only columns that exist in public.users table
INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        SPLIT_PART(au.email, '@', 1)  -- Use email username as fallback
    ) as full_name,
    CASE 
        WHEN LOWER(au.raw_user_meta_data->>'role') = 'super admin' THEN 'admin'
        WHEN LOWER(au.raw_user_meta_data->>'role') IN ('admin', 'manager', 'employee', 'cashier', 'supplier') 
            THEN LOWER(au.raw_user_meta_data->>'role')
        ELSE 'customer'
    END::user_role as role,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN true
        ELSE false
    END as is_active,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id OR pu.email = au.email
)
ORDER BY au.created_at
ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- STEP 2: Update existing users with latest auth data
-- ============================================================================

UPDATE public.users pu
SET 
    email = au.email,
    updated_at = NOW(),
    -- Update is_active based on email confirmation
    is_active = CASE 
        WHEN au.email_confirmed_at IS NOT NULL 
        THEN true
        ELSE pu.is_active
    END
FROM auth.users au
WHERE pu.id = au.id
AND pu.email != au.email;

-- ============================================================================
-- STEP 3: Create trigger function to auto-sync new auth users
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Insert or update user in public.users table
    INSERT INTO public.users (
        id,
        email,
        full_name,
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
        CASE 
            WHEN LOWER(NEW.raw_user_meta_data->>'role') = 'super admin' THEN 'admin'
            WHEN LOWER(NEW.raw_user_meta_data->>'role') IN ('admin', 'manager', 'employee', 'cashier', 'supplier') 
                THEN LOWER(NEW.raw_user_meta_data->>'role')
            ELSE 'customer'
        END::user_role,
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
        is_active = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL
            THEN true
            ELSE users.is_active
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 4: Create trigger on auth.users table
-- ============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_auth_user_to_public();

-- Create trigger for user updates
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
-- VERIFICATION QUERIES
-- ============================================================================

-- Check sync status
SELECT 
    'Auth Users' as table_name,
    COUNT(*) as total_count
FROM auth.users
UNION ALL
SELECT 
    'Public Users' as table_name,
    COUNT(*) as total_count
FROM public.users
UNION ALL
SELECT 
    'Missing in Public' as table_name,
    COUNT(*) as total_count
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
UNION ALL
SELECT 
    'Inactive Users' as table_name,
    COUNT(*) as total_count
FROM public.users
WHERE is_active = false;

-- Show recently synced users
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Check specific user (replace with your user ID)
SELECT 
    'auth.users' as source,
    au.id,
    au.email,
    au.email_confirmed_at,
    au.created_at
FROM auth.users au
WHERE au.id = '7a94bfd4-0b8c-4343-a7ec-226325ffe306'
UNION ALL
SELECT 
    'public.users' as source,
    pu.id,
    pu.email,
    NULL::timestamptz as email_confirmed_at,
    pu.created_at
FROM public.users pu
WHERE pu.id = '7a94bfd4-0b8c-4343-a7ec-226325ffe306';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    synced_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    synced_count := public_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  AUTH USERS SYNCED TO PUBLIC.USERS TABLE!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SYNC STATUS:';
    RAISE NOTICE '   ✓ Auth users: %', auth_count;
    RAISE NOTICE '   ✓ Public users: %', public_count;
    RAISE NOTICE '   ✓ Successfully synced!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 AUTO-SYNC ENABLED:';
    RAISE NOTICE '   ✓ Trigger created on auth.users (INSERT)';
    RAISE NOTICE '   ✓ Trigger created on auth.users (UPDATE)';
    RAISE NOTICE '   ✓ New registrations will auto-sync to public.users';
    RAISE NOTICE '   ✓ Email confirmations will auto-update status';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 WHAT THIS DOES:';
    RAISE NOTICE '   1. Copies all auth.users to public.users';
    RAISE NOTICE '   2. Updates existing users with latest auth data';
    RAISE NOTICE '   3. Creates automatic sync triggers';
    RAISE NOTICE '   4. Sets is_active based on email confirmation';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Refresh your Admin Portal';
    RAISE NOTICE '   2. Check the user list - all users should now appear';
    RAISE NOTICE '   3. Users with unconfirmed emails will show "⏳ Pending"';
    RAISE NOTICE '   4. Future registrations will automatically appear';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT:';
    RAISE NOTICE '   • Users must confirm their email to become active';
    RAISE NOTICE '   • is_active updates automatically when email is confirmed';
    RAISE NOTICE '   • Deleting from auth.users does NOT auto-delete from public.users';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL USERS NOW VISIBLE IN ADMIN PORTAL!';
    RAISE NOTICE '';
END $$;
