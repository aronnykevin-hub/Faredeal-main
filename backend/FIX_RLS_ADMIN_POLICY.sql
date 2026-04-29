-- ================================================================
-- FIX: Simplify RLS to Avoid Infinite Recursion
-- ================================================================
-- The admin_read_all_records policy caused infinite recursion.
-- Instead, we'll keep simple policies and use RPC functions for admin.
-- ================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "allow_read_own_record" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_records" ON public.users;
DROP POLICY IF EXISTS "allow_insert_own_record" ON public.users;
DROP POLICY IF EXISTS "allow_update_own_record" ON public.users;

-- Create simple, non-recursive policies:

-- Policy 1: Users can read their own records
CREATE POLICY "allow_read_own_record" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- Policy 2: Allow anyone to insert their own record (first-time registration)
CREATE POLICY "allow_insert_own_record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Policy 3: Allow users to update their own records
CREATE POLICY "allow_update_own_record" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- Note: Admins will use RPC functions (with SECURITY DEFINER) to bypass RLS

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Policies are now simple and non-recursive
-- Admin dashboard will use RPC functions to fetch user lists
-- ================================================================
