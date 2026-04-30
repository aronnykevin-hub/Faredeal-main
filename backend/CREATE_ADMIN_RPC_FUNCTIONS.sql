-- ================================================================
-- CREATE RPC FUNCTIONS FOR ADMIN DASHBOARD
-- ================================================================
-- These functions use SECURITY DEFINER to bypass RLS
-- Admin can call these to fetch user data
-- ================================================================

-- Drop existing functions to allow type changes
DROP FUNCTION IF EXISTS public.get_all_users_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_pending_users_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_active_users_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_inactive_users_admin() CASCADE;

-- Function 1: Get all users (for admin User Management dashboard)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_current_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user's auth ID
  v_current_user_id := auth.uid();
  
  -- Check if user exists and is admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

  -- Return all users
  RETURN QUERY
  SELECT 
    users.id,
    users.auth_id,
    users.email,
    users.full_name,
    users.phone,
    users.username,
    users.role,
    users.is_active,
    users.email_verified,
    users.profile_completed,
    users.created_at,
    users.updated_at
  FROM public.users
  ORDER BY users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 2: Get pending users (is_active = false)
CREATE OR REPLACE FUNCTION public.get_pending_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_current_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user's auth ID
  v_current_user_id := auth.uid();
  
  -- Check if user exists and is admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

  -- Return pending users (is_active = false)
  RETURN QUERY
  SELECT 
    users.id,
    users.auth_id,
    users.email,
    users.full_name,
    users.phone,
    users.username,
    users.role,
    users.is_active,
    users.email_verified,
    users.profile_completed,
    users.created_at,
    users.updated_at
  FROM public.users
  WHERE users.is_active = false
  ORDER BY users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_users_admin() TO authenticated, anon;

-- Function 3: Get active users (is_active = true)
CREATE OR REPLACE FUNCTION public.get_active_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_current_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user's auth ID
  v_current_user_id := auth.uid();
  
  -- Check if user exists and is admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

  -- Return active users (is_active = true)
  RETURN QUERY
  SELECT 
    users.id,
    users.auth_id,
    users.email,
    users.full_name,
    users.phone,
    users.username,
    users.role,
    users.is_active,
    users.email_verified,
    users.profile_completed,
    users.created_at,
    users.updated_at
  FROM public.users
  WHERE users.is_active = true
  ORDER BY users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 4: Get inactive users (is_active = false)
CREATE OR REPLACE FUNCTION public.get_inactive_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_current_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user's auth ID
  v_current_user_id := auth.uid();
  
  -- Check if user exists and is admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

  -- Return inactive users (is_active = false)
  RETURN QUERY
  SELECT 
    users.id,
    users.auth_id,
    users.email,
    users.full_name,
    users.phone,
    users.username,
    users.role,
    users.is_active,
    users.email_verified,
    users.profile_completed,
    users.created_at,
    users.updated_at
  FROM public.users
  WHERE users.is_active = false
  ORDER BY users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_users_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_inactive_users_admin() TO authenticated, anon;

-- Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%users%'
ORDER BY routine_name;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this:
-- 1. RPC function get_all_users_admin() exists - admin can fetch all users
-- 2. RPC function get_pending_users_admin() exists - admin can fetch pending/inactive users
-- 3. RPC function get_active_users_admin() exists - admin can fetch active users
-- 4. RPC function get_inactive_users_admin() exists - admin can fetch inactive users
-- 5. All functions check if caller is active admin, otherwise raise error
-- 6. All functions use SECURITY DEFINER to bypass RLS
-- 7. Fixed auth check: now uses id column instead of auth_id column
-- ================================================================
