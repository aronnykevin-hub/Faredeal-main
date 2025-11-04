-- ============================================================================
-- FIX USERS TABLE RLS POLICY - Infinite Recursion Error
-- ============================================================================
-- This fixes the "infinite recursion detected in policy" error
-- IMPORTANT: Run this ENTIRE file in your Supabase SQL Editor
-- 
-- What this does:
-- 1. Fixes RLS policies to prevent infinite recursion
-- 2. Creates helper functions for admin to access users
-- 3. Allows frontend to fetch users without admin API
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. Refresh your admin portal
-- ============================================================================

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- Step 2: Disable RLS temporarily to check
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Create simplified, non-recursive policies

-- Allow authenticated users to read their own data
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to read all users (check auth.users table directly)
CREATE POLICY "admins_select_all"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
);

-- Allow users to update their own data
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to update all users
CREATE POLICY "admins_update_all"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
);

-- Allow authenticated users to insert (for registration)
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow admins to delete users
CREATE POLICY "admins_delete_users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
);

-- Step 4: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create helper function for admins to get all users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the caller is an admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  ) THEN
    -- Return all inactive users
    RETURN QUERY
    SELECT * FROM public.users
    WHERE is_active = false
    ORDER BY created_at DESC;
  ELSE
    -- Non-admins get nothing
    RETURN;
  END IF;
END;
$$;

-- Step 6: Create function to get all users for admin
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the caller is an admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  ) THEN
    -- Return all users
    RETURN QUERY
    SELECT * FROM public.users
    ORDER BY created_at DESC;
  ELSE
    -- Non-admins get nothing
    RETURN;
  END IF;
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

-- Test the function (as admin)
-- SELECT * FROM get_pending_users();
-- SELECT * FROM get_all_users_admin();

-- ============================================================================
-- ALTERNATIVE: Disable RLS for users table (if you trust your app logic)
-- ============================================================================
-- If the policies continue to cause issues, you can disable RLS entirely:
-- 
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- 
-- This is acceptable if:
-- 1. Your app handles permissions in the application layer
-- 2. You're using admin SDK in backend
-- 3. You trust your frontend security
-- ============================================================================

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- The infinite recursion error should now be fixed.
-- Users can now be loaded without RLS conflicts.
-- ============================================================================
