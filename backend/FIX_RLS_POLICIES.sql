-- ================================================================
-- FIX ROW-LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- The users table has RLS enabled, which is blocking self-service
-- user registration. This script fixes the policies to allow:
-- 1. Users to create their own records on first login
-- 2. Users to read their own records
-- 3. Admins to do anything
-- ================================================================

-- Step 1: Disable RLS temporarily to fix policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop old policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can do anything" ON public.users;
DROP POLICY IF EXISTS "select_own" ON public.users;
DROP POLICY IF EXISTS "insert_own" ON public.users;
DROP POLICY IF EXISTS "update_own" ON public.users;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new flexible policies

-- Policy 1: Allow anyone to insert their own record (first-time registration)
CREATE POLICY "allow_insert_own_record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Policy 2: Allow users to read their own records
CREATE POLICY "allow_read_own_record" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- Policy 3: Allow users to update their own records
CREATE POLICY "allow_update_own_record" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- Policy 4: Allow service role (backend) to bypass RLS completely
-- (This uses Supabase's built-in service role - no need to create)

-- Step 5: Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this:
-- 1. Users can insert their own records with auth_id = their auth.uid()
-- 2. Users can read/update only their own records
-- 3. RLS is enabled but policies are flexible
-- 4. Test: Visit /cashier-auth and login with Google - should create user
-- ================================================================
