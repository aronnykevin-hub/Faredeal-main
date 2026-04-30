-- ═══════════════════════════════════════════════════════════════════════════
-- FAREDEAL: COMPLETE USER MANAGEMENT & ROLE ASSIGNMENT SETUP
-- ═══════════════════════════════════════════════════════════════════════════
-- Paste this ENTIRE file into Supabase SQL Editor
-- This sets up all functions to search users and assign roles
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: ADMIN SETUP (Create admin users)
-- ═══════════════════════════════════════════════════════════════════════════

-- Create admin profile for super admin
INSERT INTO public.users (id, email, full_name, role, is_active, email_verified, created_at)
VALUES (
  '8bb38779-2aaf-4510-b6b6-65d1efa69af7',
  'abana1662@gmail.com',
  'Admin User',
  'admin',
  true,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();

-- Create second admin user
INSERT INTO public.users (id, email, full_name, role, is_active, email_verified, created_at)
VALUES (
  '8fd43f6e-a509-4800-9fb9-4e776f74afc6',
  'farmagent25@gmail.com',
  'Farm Agent Admin',
  'admin',
  true,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: SEARCH FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop old versions
DROP FUNCTION IF EXISTS public.get_pending_users() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_active_users_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_inactive_users_admin() CASCADE;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. GET PENDING USERS (Not yet approved)
-- ───────────────────────────────────────────────────────────────────────────
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
  RETURN QUERY
  SELECT
    u.id,
    u.auth_id,
    u.email::VARCHAR,
    COALESCE(u.full_name, u.email)::VARCHAR AS full_name,
    u.phone::VARCHAR,
    u.username::VARCHAR,
    u.role::VARCHAR,
    u.is_active,
    u.email_verified,
    u.profile_completed,
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.is_active = FALSE
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. GET ALL USERS (Admin only)
-- ───────────────────────────────────────────────────────────────────────────
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
  v_current_user_id := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. GET ACTIVE USERS ONLY (Admin only)
-- ───────────────────────────────────────────────────────────────────────────
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
  v_current_user_id := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_active_users_admin() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. GET INACTIVE/PENDING USERS (Admin only)
-- ───────────────────────────────────────────────────────────────────────────
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
  v_current_user_id := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_current_user_id AND role = 'admin' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only active admins can call this function';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_inactive_users_admin() TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: ROLE ASSIGNMENT FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop old version
DROP FUNCTION IF EXISTS public.assign_user_role_by_email(TEXT, TEXT) CASCADE;

-- ───────────────────────────────────────────────────────────────────────────
-- ASSIGN USER ROLE BY EMAIL (Main function for assigning roles)
-- ───────────────────────────────────────────────────────────────────────────
-- Parameters:
--   p_email: Email address of user (case-insensitive)
--   p_role: Role to assign - 'manager', 'cashier', or 'supplier'
-- Returns: JSON with success/error details
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_user_role_by_email(
  p_email TEXT,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Email is required'
    );
  END IF;

  -- Find user by email (case-insensitive)
  SELECT id, role
  INTO v_user_id, v_user_role
  FROM public.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found for email: ' || p_email
    );
  END IF;

  -- Validate role if provided
  IF p_role IS NOT NULL AND p_role <> '' THEN
    v_user_role := p_role;

    -- Update user role and activate (accept ANY role)
    UPDATE public.users
    SET
      role = p_role,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- Just activate user without changing role
    UPDATE public.users
    SET
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- Build success response
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User assigned successfully',
    'user_id', v_user_id,
    'email', p_email,
    'role', v_user_role,
    'is_active', TRUE
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to assign user by email: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.assign_user_role_by_email(TEXT, TEXT) TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- APPROVE USER ADMIN (Approve and assign role by UUID)
-- ───────────────────────────────────────────────────────────────────────────
-- Parameters:
--   p_user_id: User UUID from database
--   p_role: Role to assign - 'manager', 'cashier', or 'supplier', or NULL to keep existing
-- Returns: JSON with success/error details
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.approve_user_admin(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_user_admin(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email VARCHAR;
  v_user_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  -- Find user
  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  -- Update user
  IF p_role IS NOT NULL AND p_role <> '' THEN
    UPDATE public.users
    SET
      role = p_role,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = p_user_id;
    v_user_role := p_role;
  ELSE
    UPDATE public.users
    SET
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', CASE WHEN p_role IS NOT NULL AND p_role <> '' THEN 'User approved with role change' ELSE 'User approved successfully' END,
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role,
    'is_active', TRUE
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to approve user: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.approve_user_admin(UUID, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Check all functions were created
SELECT 
  'Functions Created Successfully ✅' as status,
  COUNT(*) as function_count
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_pending_users',
  'get_all_users_admin',
  'get_active_users_admin',
  'get_inactive_users_admin',
  'assign_user_role_by_email',
  'approve_user_admin'
);

-- List all user management functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: TEST QUERIES (Uncomment to test)
-- ═══════════════════════════════════════════════════════════════════════════

-- Test: Get pending users
-- SELECT * FROM public.get_pending_users();

-- Test: Get all users (requires admin)
-- SELECT * FROM public.get_all_users_admin();

-- Test: Assign role by email
-- SELECT public.assign_user_role_by_email('test@example.com', 'manager');

-- Test: Approve user by UUID
-- SELECT public.approve_user_admin('user-uuid-here', 'cashier');

-- Test: Check admin users were created
-- SELECT email, role, is_active FROM public.users WHERE role = 'admin';

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SETUP COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- You can now:
-- 1. Search for pending users: get_pending_users()
-- 2. Search for active users: get_active_users_admin()
-- 3. Search all users: get_all_users_admin()
-- 4. Assign role by email: assign_user_role_by_email('email@example.com', 'role')
-- 5. Approve user: approve_user_admin('user-id', 'role')
-- ═══════════════════════════════════════════════════════════════════════════
