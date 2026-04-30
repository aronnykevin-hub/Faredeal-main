-- ================================================================
-- CREATE RPC FUNCTION FOR ADMIN TO VIEW PENDING USERS
-- ================================================================
-- This function allows the admin to query pending users
-- bypassing RLS restrictions
-- ================================================================

-- Create function to get pending users (is_active = false)
CREATE OR REPLACE FUNCTION public.get_pending_users()
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
  -- Return all users with is_active = false (pending approval)
  RETURN QUERY
  SELECT 
    public.users.id,
    public.users.auth_id,
    public.users.email::VARCHAR,
    public.users.full_name::VARCHAR,
    public.users.phone::VARCHAR,
    public.users.username::VARCHAR,
    public.users.role::VARCHAR,
    public.users.is_active,
    public.users.email_verified,
    public.users.profile_completed,
    public.users.created_at,
    public.users.updated_at
  FROM public.users
  WHERE public.users.is_active = false
  ORDER BY public.users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin can call it)
GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated, anon;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Test the function with:
-- SELECT * FROM get_pending_users();
-- Should return all users with is_active = false
-- ================================================================
