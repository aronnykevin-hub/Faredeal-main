-- ================================================================
-- EMAIL-BASED ROLE ASSIGNMENT RPC
-- Paste this into Supabase SQL Editor
-- ================================================================
-- Use this after Google sign-in:
-- - Admin assigns a user by email
-- - Allowed roles: admin, manager, cashier, supplier
-- - User is activated immediately after role assignment
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

  IF p_role IS NOT NULL AND p_role <> '' THEN
    IF LOWER(p_role) NOT IN ('admin', 'manager', 'cashier', 'supplier') THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Role must be admin, manager, cashier, or supplier'
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
    'error', 'Failed to assign user by email: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.assign_user_role_by_email(TEXT, TEXT) TO authenticated, anon;

-- ================================================================
-- TEST
-- ================================================================
-- SELECT public.assign_user_role_by_email('user@example.com', 'admin');
-- SELECT public.assign_user_role_by_email('user@example.com', 'manager');
-- SELECT public.assign_user_role_by_email('user@example.com', 'cashier');
-- SELECT public.assign_user_role_by_email('user@example.com', 'supplier');
-- ================================================================
