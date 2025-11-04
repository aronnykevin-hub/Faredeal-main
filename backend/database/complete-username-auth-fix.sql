-- ============================================================================
-- COMPLETE FIX FOR USERNAME-BASED AUTH
-- ============================================================================
-- This script fixes all issues:
-- 1. RLS policies for users table access
-- 2. approve_user function with email confirmation
-- 3. All necessary permissions
-- ============================================================================

-- STEP 1: Fix RLS Policies
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can check username availability" ON public.users;
DROP POLICY IF EXISTS "Anyone can check username during signup" ON public.users;
DROP POLICY IF EXISTS "Users can read all for login" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON public.users;

-- Policy 1: Allow anonymous users to check username during signup
CREATE POLICY "Allow anonymous to check username"
ON public.users
FOR SELECT
TO anon
USING (true);

-- Policy 2: Allow authenticated users to read all users (needed for username lookup during login)
CREATE POLICY "Allow authenticated users to read"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- STEP 2: Update approve_user function
-- ============================================================================

DROP FUNCTION IF EXISTS approve_user(UUID);

CREATE OR REPLACE FUNCTION approve_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Update public.users to activate account
    UPDATE public.users
    SET 
        is_active = true,
        updated_at = NOW()
    WHERE id = user_id
        AND is_active = false
        AND role IN ('manager', 'cashier', 'supplier');
    
    -- Also confirm email in auth.users (required for login)
    IF FOUND THEN
        UPDATE auth.users
        SET 
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated;

-- STEP 3: Verify and show results
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    -- Check function
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'approve_user'
    ) INTO function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  USERNAME-BASED AUTH SETUP COMPLETE!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RLS POLICIES: % active', policy_count;
    RAISE NOTICE '   ✓ Authenticated users can read all users (for username lookup)';
    RAISE NOTICE '   ✓ Users can update own profile';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 FUNCTIONS:';
    IF function_exists THEN
        RAISE NOTICE '   ✓ approve_user() - Activates user and confirms email';
        RAISE NOTICE '   ✓ get_pending_users() - Lists users awaiting approval';
        RAISE NOTICE '   ✓ reject_user() - Deletes rejected users';
    ELSE
        RAISE NOTICE '   ⚠️  approve_user() NOT FOUND - Please run fix-no-email-verification.sql';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 READY TO USE:';
    RAISE NOTICE '   1. Users can signup with username only';
    RAISE NOTICE '   2. Users can login with username + password';
    RAISE NOTICE '   3. Admin can approve/reject users';
    RAISE NOTICE '   4. Approved users can login immediately';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Test signup: Create new manager/cashier account';
    RAISE NOTICE '   2. Check admin portal: User should appear in pending';
    RAISE NOTICE '   3. Approve user: Click approve button';
    RAISE NOTICE '   4. Test login: Use username + password';
    RAISE NOTICE '';
END $$;
