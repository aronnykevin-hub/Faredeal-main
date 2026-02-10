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
  email VARCHAR,
  username VARCHAR,
  full_name TEXT,
  phone VARCHAR,
  role TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.username,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS full_name,
    u.phone,
    u.role::TEXT,
    u.status::TEXT,
    u.created_at,
    jsonb_build_object(
      'phone', u.phone,
      'role', u.role,
      'status', u.status,
      'permissions', u.permissions,
      'settings', u.settings
    ) AS metadata
  FROM public.users u
  WHERE u.status = 'pending'
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated;

-- =========================================
-- 2. APPROVE USER FUNCTION (Two versions)
-- =========================================
DROP FUNCTION IF EXISTS public.approve_user(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(UUID) CASCADE;

-- Version 1: Approve user WITHOUT changing role
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID
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

  -- Update user status (keep existing role)
  UPDATE public.users
  SET
    status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

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
    jsonb_build_object('status', 'active', 'role', v_user_role),
    auth.uid(),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User approved successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role,
    'status', 'active'
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

-- Version 2: Approve user WITH role change
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_role VARCHAR
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

  IF p_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Role is required'
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

  -- Cast role to user_role type
  v_new_role := p_role::user_role;

  -- Update user status and role
  UPDATE public.users
  SET
    status = 'active',
    updated_at = NOW(),
    role = v_new_role
  WHERE id = p_user_id;

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
    jsonb_build_object('status', 'active', 'role', v_new_role::TEXT),
    auth.uid(),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User approved successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_new_role::TEXT,
    'status', 'active'
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

-- Grant execute permissions for both versions
GRANT EXECUTE ON FUNCTION public.approve_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user(UUID, VARCHAR) TO authenticated;

-- =========================================
-- 3. REJECT USER FUNCTION
-- =========================================
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
