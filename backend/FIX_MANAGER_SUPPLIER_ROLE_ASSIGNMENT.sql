-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Check role assignment issues for manager and supplier
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check the user_role type definition (enum values)
SELECT 
  typname,
  typtype
FROM pg_type
WHERE typname = 'user_role';

-- If user_role is an ENUM, show its values
SELECT 
  e.enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- 2. Check what roles currently exist in users table
SELECT DISTINCT role
FROM public.users
ORDER BY role;

-- 3. Check users table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name = 'role';

-- 4. Try to see if there's a constraint issue
-- Check constraints on users table
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'users';

-- 5. Test role assignment with TEXT cast instead of enum cast
-- (This is a test - don't worry if it fails)
-- SELECT public.assign_user_role_by_email('test@example.com', 'manager');

-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: If user_role is an ENUM with limited values, add missing values
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if you need to add values to user_role enum
-- (Only run if diagnostic above shows user_role is missing manager/supplier)

-- Option 1: Add to enum if it exists
-- ALTER TYPE user_role ADD VALUE 'manager' BEFORE 'admin';
-- ALTER TYPE user_role ADD VALUE 'supplier' BEFORE 'admin';

-- Option 2: If role column is just TEXT (not enum), update function to not cast
-- The function should be updated as shown below:

-- ═══════════════════════════════════════════════════════════════════════════
-- SOLUTION: Updated assign_user_role_by_email function (without enum cast)
-- ═══════════════════════════════════════════════════════════════════════════

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
    IF LOWER(p_role) NOT IN ('manager', 'cashier', 'supplier', 'admin', 'user') THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Role must be one of: manager, cashier, supplier, admin, user'
      );
    END IF;

    v_user_role := p_role;

    -- Update user role and activate (WITHOUT enum cast - just TEXT)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- ALSO UPDATE: approve_user_admin function (same issue)
-- ═══════════════════════════════════════════════════════════════════════════

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

  -- Update user (WITHOUT enum cast)
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
-- TEST
-- ═══════════════════════════════════════════════════════════════════════════

-- Test manager assignment
-- SELECT public.assign_user_role_by_email('test@example.com', 'manager');

-- Test supplier assignment
-- SELECT public.assign_user_role_by_email('supplier@example.com', 'supplier');

-- Check results
-- SELECT email, role, is_active FROM public.users ORDER BY updated_at DESC LIMIT 5;
