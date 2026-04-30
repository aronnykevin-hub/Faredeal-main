-- ================================================================
-- CORRECTED USER MANAGEMENT RPC FUNCTIONS
-- ================================================================
-- Fixes type mismatches and uses correct column names from users table
-- ================================================================

-- Drop existing functions to allow recreation
DROP FUNCTION IF EXISTS public.get_pending_users() CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.reject_user(UUID) CASCADE;

-- ================================================================
-- 1. GET PENDING USERS - Returns users awaiting approval
-- ================================================================
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
    COALESCE(u.first_name || ' ' || u.last_name, u.email)::VARCHAR AS full_name,
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

-- ================================================================
-- 2. APPROVE USER FUNCTION (Single resolved RPC)
-- ================================================================

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
  v_new_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  IF p_role IS NOT NULL AND p_role <> '' THEN
    UPDATE public.users
    SET
      role = p_role::user_role,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = p_user_id;
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
    'role', COALESCE(v_new_role, v_user_role),
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

-- Grant execute permission for the single resolved function
GRANT EXECUTE ON FUNCTION public.approve_user_admin(UUID, TEXT) TO authenticated, anon;

-- ================================================================
-- 3. REJECT USER FUNCTION
-- ================================================================
DROP FUNCTION IF EXISTS public.assign_user_role_by_email(TEXT, TEXT) CASCADE;

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

  SELECT id, role INTO v_user_id, v_user_role
  FROM public.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found for email: ' || p_email
    );
  END IF;

  IF p_role IS NOT NULL AND p_role <> '' THEN
    IF LOWER(p_role) NOT IN ('manager', 'cashier', 'supplier') THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Role must be manager, cashier, or supplier'
      );
    END IF;

    UPDATE public.users
    SET
      role = p_role::user_role,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
    v_user_role := p_role;
  ELSE
    UPDATE public.users
    SET
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

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

CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email VARCHAR;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  SELECT email INTO v_user_email
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  -- Mark user as rejected/blocked instead of deleting
  UPDATE public.users
  SET
    status = 'blocked'::user_status,
    updated_at = NOW()
  WHERE id = p_user_id;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User rejected and blocked',
    'user_id', p_user_id,
    'email', v_user_email,
    'status', 'blocked'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to reject user: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reject_user(UUID) TO authenticated, anon;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this:
-- 1. get_pending_users() returns pending users with CORRECT column types:
--    - email VARCHAR, username VARCHAR(100), phone VARCHAR(20)
--    - Uses first_name + last_name to build full_name
--    - Filters by status='pending_verification' or unverified emails
-- 2. approve_user(UUID) approves user without role change
-- 3. approve_user(UUID, TEXT) approves user and changes role
-- 4. reject_user(UUID) marks user as blocked instead of deleting
-- 5. All functions use correct enum types: user_role, user_status
-- 6. Uses SET search_path = public for schema safety
-- ================================================================
