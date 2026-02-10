-- =========================================
-- FIX: CREATE REJECT_USER RPC FUNCTION
-- Error: column "metadata" does not exist
-- Solution: Proper function without metadata reference
-- =========================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS public.reject_user(UUID) CASCADE;

-- Create the reject_user function that properly deletes/rejects a user
CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role TEXT;
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

  -- Delete the user record (this will cascade delete related records)
  DELETE FROM public.users
  WHERE id = p_user_id;

  -- Log the rejection
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
    jsonb_build_object('email', v_user_email, 'role', v_user_role),
    jsonb_build_object('status', 'rejected'),
    auth.uid(),
    NOW()
  );

  -- Return success
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User rejected and deleted successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reject_user(UUID) TO authenticated;

-- Optional: Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
