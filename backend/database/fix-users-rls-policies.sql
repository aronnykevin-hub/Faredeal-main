-- ============================================================================
-- FIX RLS POLICIES FOR USERS TABLE
-- ============================================================================
-- This fixes the 403 Forbidden errors when accessing the users table
-- Allows authenticated users to read their own data and check usernames
-- ============================================================================

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can check username availability" ON public.users;
DROP POLICY IF EXISTS "Anyone can check username during signup" ON public.users;
DROP POLICY IF EXISTS "Users can read all for login" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Policy 1: Allow users to check if username exists (for signup validation)
CREATE POLICY "Anyone can check username during signup"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow users to read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow inserts from trigger (service role handles this)
-- No policy needed as inserts are handled by SECURITY DEFINER trigger

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- Verify policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  RLS POLICIES FIXED!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 POLICIES CREATED: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 POLICIES:';
    RAISE NOTICE '   ✓ Anyone can check username during signup';
    RAISE NOTICE '   ✓ Users can read own data';
    RAISE NOTICE '   ✓ Users can update own profile';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Users can now:';
    RAISE NOTICE '   - Check if username is taken during signup';
    RAISE NOTICE '   - Login with username';
    RAISE NOTICE '   - Read their own profile data';
    RAISE NOTICE '   - Update their own profile';
    RAISE NOTICE '';
END $$;
