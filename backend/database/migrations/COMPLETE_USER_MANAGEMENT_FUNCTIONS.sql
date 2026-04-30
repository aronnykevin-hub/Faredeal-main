-- =========================================
-- COMPLETE RPC FUNCTIONS FOR USER MANAGEMENT
-- Includes: approve_user, reject_user, get_pending_users
-- =========================================

-- =========================================
-- 1. GET PENDING USERS FUNCTION
-- =========================================
DROP FUNCTION IF EXISTS public.get_pending_users() CASCADE;

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
    u.full_name::VARCHAR,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated;

-- =========================================
-- 2. APPROVE USER FUNCTION (Single resolved RPC)
-- =========================================
DROP FUNCTION IF EXISTS public.approve_user_admin(UUID, VARCHAR) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_user_admin(
  p_user_id UUID,
  p_role VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role VARCHAR;
  v_new_role user_role;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  -- Get user details
  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  -- Update user to active and optionally set role
  IF p_role IS NOT NULL AND p_role <> '' THEN
    v_new_role := p_role::user_role;

    UPDATE public.users
    SET
      is_active = TRUE,
      updated_at = NOW(),
      role = v_new_role
    WHERE id = p_user_id;
  ELSE
    UPDATE public.users
    SET
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Log the approval
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    performed_by,
    created_at
  ) VALUES (
    'USER_APPROVED',
    'users',
    p_user_id,
    jsonb_build_object('status', 'pending', 'role', v_user_role),
    jsonb_build_object(
      'status', 'active',
      'role', COALESCE(v_new_role::TEXT, v_user_role)
    ),
    auth.uid(),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User approved successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', COALESCE(v_new_role::TEXT, v_user_role),
    'is_active', TRUE
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to approve user: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for the single resolved function
GRANT EXECUTE ON FUNCTION public.approve_user_admin(UUID, VARCHAR) TO authenticated;

-- =========================================
-- 3. REJECT USER FUNCTION
-- =========================================
DROP FUNCTION IF EXISTS public.assign_user_role_by_email(TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_user_role_by_email(
  p_email TEXT,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_id UUID;
  v_user_role VARCHAR;
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

    v_user_role := p_role;

    UPDATE public.users
    SET
      role = p_role::user_role,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
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
    'error', 'Failed to assign user by email: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_user_role_by_email(TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.reject_user(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reject_user(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role VARCHAR;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  -- Get user details before deletion
  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  -- Log the rejection before deletion
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    performed_by,
    created_at
  ) VALUES (
    'USER_REJECTED',
    'users',
    p_user_id,
    jsonb_build_object('email', v_user_email, 'role', v_user_role, 'status', 'pending'),
    jsonb_build_object('status', 'rejected', 'reason', COALESCE(p_reason, 'No reason provided')),
    auth.uid(),
    NOW()
  );

  -- Delete the user record (cascades delete related records)
  DELETE FROM public.users
  WHERE id = p_user_id;

  -- Return success
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User rejected and deleted successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role,
    'reason', COALESCE(p_reason, 'No reason provided')
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to reject user: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_user(UUID, TEXT) TO authenticated;

-- =========================================
-- 4. CREATE AUDIT LOG TABLE (if not exists)
-- =========================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public.audit_log(performed_by);

-- =========================================
-- 5. ENABLE ROW LEVEL SECURITY (if needed)
-- =========================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit_log (read-only for authenticated users)
DROP POLICY IF EXISTS "audit_log_read_auth" ON public.audit_log;

CREATE POLICY "audit_log_read_auth"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only system can write to audit_log (via triggers/functions)
DROP POLICY IF EXISTS "audit_log_insert_system" ON public.audit_log;

CREATE POLICY "audit_log_insert_system"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================
-- 6. VERIFY SETUP
-- =========================================
-- Run these to verify everything is working:
--
-- SELECT * FROM information_schema.routines 
-- WHERE routine_name IN ('approve_user', 'reject_user', 'get_pending_users');
--
-- Should show 3 rows with all functions created
