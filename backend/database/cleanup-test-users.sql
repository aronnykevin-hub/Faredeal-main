-- ============================================================================
-- CLEANUP TEST USERS
-- ============================================================================
-- Use this to remove test users and start fresh
-- CAUTION: This will delete users - use only for testing!
-- ============================================================================

-- OPTION 1: Delete a specific user by username
-- ============================================================================
-- Uncomment and replace 'username_here' with the actual username

/*
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Find user by username
    SELECT id INTO user_uuid
    FROM public.users
    WHERE username = 'username_here';  -- CHANGE THIS
    
    IF user_uuid IS NOT NULL THEN
        -- Delete from auth.users (will cascade to public.users)
        DELETE FROM auth.users WHERE id = user_uuid;
        
        RAISE NOTICE 'User deleted successfully: %', user_uuid;
    ELSE
        RAISE NOTICE 'User not found with username: username_here';
    END IF;
END $$;
*/

-- OPTION 2: Delete all pending (unapproved) users
-- ============================================================================
-- Uncomment to delete all users waiting for approval

/*
DO $$
DECLARE
    deleted_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Loop through all inactive users
    FOR user_record IN 
        SELECT id, username, role 
        FROM public.users 
        WHERE is_active = false
        AND role IN ('manager', 'cashier', 'supplier')
    LOOP
        -- Delete from auth.users (cascades to public.users)
        DELETE FROM auth.users WHERE id = user_record.id;
        deleted_count := deleted_count + 1;
        
        RAISE NOTICE 'Deleted: % (%) - %', user_record.username, user_record.role, user_record.id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Cleanup complete! Deleted % pending users', deleted_count;
END $$;
*/

-- OPTION 3: Delete all test users (DANGER!)
-- ============================================================================
-- Uncomment to delete ALL non-admin users
-- WARNING: This deletes EVERYONE except admins!

/*
DO $$
DECLARE
    deleted_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Loop through all non-admin users
    FOR user_record IN 
        SELECT id, username, role 
        FROM public.users 
        WHERE role IN ('manager', 'cashier', 'supplier', 'employee', 'customer')
    LOOP
        -- Delete from auth.users (cascades to public.users)
        DELETE FROM auth.users WHERE id = user_record.id;
        deleted_count := deleted_count + 1;
        
        RAISE NOTICE 'Deleted: % (%) - %', user_record.username, user_record.role, user_record.id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Cleanup complete! Deleted % users (admins preserved)', deleted_count;
END $$;
*/

-- OPTION 4: View all users (to see what exists)
-- ============================================================================
-- Run this to see all current users

SELECT 
    username,
    role,
    full_name,
    is_active,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. First, run OPTION 4 to see all users
-- 2. Choose which option you need:
--    - OPTION 1: Delete one specific user by username
--    - OPTION 2: Delete all pending (unapproved) users
--    - OPTION 3: Delete ALL non-admin users (DANGER!)
-- 3. Uncomment the option you want (remove /* and */)
-- 4. For OPTION 1, change 'username_here' to actual username
-- 5. Run the script
-- ============================================================================
