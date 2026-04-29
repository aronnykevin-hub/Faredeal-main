-- ================================================================
-- CREATE RPC FUNCTIONS FOR ADMIN DASHBOARD
-- ================================================================
-- These functions use SECURITY DEFINER to bypass RLS
-- Admin can call these to fetch user data
-- ================================================================

-- Function 1: Get all users (for admin User Management dashboard)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  phone VARCHAR,
  username VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Only allow if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can call this function';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get pending users (is_active = false)
CREATE OR REPLACE FUNCTION public.get_pending_users_admin()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  phone VARCHAR,
  username VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Only allow if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can call this function';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_users_admin() TO authenticated, anon;

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
-- 2. RPC function get_pending_users_admin() exists - admin can fetch pending users
-- 3. Both functions check if caller is admin, otherwise raise error
-- 4. Both use SECURITY DEFINER to bypass RLS
-- ================================================================
