-- ================================================================
-- FIX ADMIN RLS POLICIES FOR USER MANAGEMENT
-- ================================================================
-- This script fixes the RLS policies to allow admins to manage users
-- while keeping regular users restricted to their own records
-- ================================================================

-- Step 1: Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Add admin policy for SELECT (read all users)
-- This allows users with role='admin' to read all users
DROP POLICY IF EXISTS "admin_can_read_all_users" ON public.users;

CREATE POLICY "admin_can_read_all_users" ON public.users
  FOR SELECT
  USING (
    -- Allow if user is admin OR if reading own record
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = auth_id
  );

-- Step 3: Add admin policy for UPDATE (update any user)
DROP POLICY IF EXISTS "admin_can_update_any_user" ON public.users;

CREATE POLICY "admin_can_update_any_user" ON public.users
  FOR UPDATE
  USING (
    -- Allow if user is admin OR if updating own record
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = auth_id
  )
  WITH CHECK (
    -- Allow if user is admin OR if updating own record
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = auth_id
  );

-- Step 4: Add admin policy for DELETE (delete any user)
DROP POLICY IF EXISTS "admin_can_delete_any_user" ON public.users;

CREATE POLICY "admin_can_delete_any_user" ON public.users
  FOR DELETE
  USING (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Verify all policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this script:
-- 1. Admins can read all users
-- 2. Regular users can still only read their own record
-- 3. Admins can update any user
-- 4. Regular users can only update their own record
-- 5. Only admins can delete users
-- 6. Try the admin portal - queries should work now
-- ================================================================
