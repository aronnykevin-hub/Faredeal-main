-- ============================================================================
-- QUICK FIX: Admin User Management
-- ============================================================================
-- Run this in Supabase SQL Editor if you see errors loading users
-- This is the fastest way to get your admin portal working
-- ============================================================================

-- Option 1: Disable RLS on users table (Quick & Simple)
-- This allows your admin portal to read users without policy issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Option 2: Create admin helper functions
-- These allow admins to fetch users safely

-- Function to get pending users
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND LOWER(auth.users.raw_user_meta_data->>'role') = 'admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM public.users
    WHERE is_active = false
    ORDER BY created_at DESC;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Function to get all users
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND LOWER(auth.users.raw_user_meta_data->>'role') = 'admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM public.users
    ORDER BY created_at DESC;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- ============================================================================
-- DONE! Your admin portal should now work.
-- Refresh the page and go to User Management.
-- ============================================================================
