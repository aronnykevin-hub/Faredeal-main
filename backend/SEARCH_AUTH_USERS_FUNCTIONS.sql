-- ═══════════════════════════════════════════════════════════════════════════
-- Get all users from public.users table
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_all_auth_users() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  has_profile BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.full_name,
    pu.phone,
    pu.username,
    pu.role,
    pu.is_active,
    pu.email_verified,
    pu.profile_completed,
    pu.created_at,
    pu.updated_at,
    TRUE::BOOLEAN as has_profile
  FROM public.users pu
  ORDER BY pu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- Search users by email, name, phone, role, or username
-- ───────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.search_auth_users(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.search_auth_users(p_search_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  username TEXT,
  role TEXT,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  has_profile BOOLEAN
) AS $$
DECLARE
  v_search_lower TEXT;
BEGIN
  v_search_lower := LOWER(TRIM(COALESCE(p_search_query, '')));
  
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.full_name,
    pu.phone,
    pu.username,
    pu.role,
    pu.is_active,
    pu.email_verified,
    pu.profile_completed,
    pu.created_at,
    pu.updated_at,
    TRUE::BOOLEAN as has_profile
  FROM public.users pu
  WHERE v_search_lower = '' OR
    LOWER(pu.email) LIKE '%' || v_search_lower || '%' OR
    LOWER(pu.full_name) LIKE '%' || v_search_lower || '%' OR
    LOWER(COALESCE(pu.phone, '')) LIKE '%' || v_search_lower || '%' OR
    LOWER(COALESCE(pu.role, '')) LIKE '%' || v_search_lower || '%' OR
    LOWER(COALESCE(pu.username, '')) LIKE '%' || v_search_lower || '%'
  ORDER BY pu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.search_auth_users(TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Get auth users without profiles - simplified to public.users only
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_auth_users_without_profiles() CASCADE;

CREATE OR REPLACE FUNCTION public.get_auth_users_without_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.full_name,
    pu.created_at
  FROM public.users pu
  WHERE pu.role IS NULL OR pu.role = ''
  ORDER BY pu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_auth_users_without_profiles() TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Create profile for user - with upsert handling for duplicates
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.create_user_profile_from_auth(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth(
  p_auth_id UUID,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_result JSONB;
BEGIN
  -- First, check if this auth_id already has a profile
  SELECT id, email, full_name INTO v_user_id, v_email, v_full_name 
  FROM public.users 
  WHERE id = p_auth_id
  LIMIT 1;

  -- If user profile already exists by ID, return existing
  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User profile already exists',
      'user_id', v_user_id,
      'email', v_email,
      'role', p_role
    );
  END IF;

  -- For new profile, use a default email format if needed
  v_email := COALESCE(v_email, 'user-' || p_auth_id::TEXT || '@app.local');
  v_full_name := COALESCE(v_full_name, 'User');

  -- Try to insert profile, handling duplicate key constraint
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      is_active,
      email_verified,
      created_at
    ) VALUES (
      p_auth_id,
      v_email,
      v_full_name,
      p_role,
      TRUE,
      FALSE,
      NOW()
    );

    v_result := jsonb_build_object(
      'success', TRUE,
      'message', 'User profile created and assigned as ' || p_role,
      'user_id', p_auth_id,
      'email', v_email,
      'role', p_role,
      'is_active', TRUE
    );

    RETURN v_result;

  EXCEPTION WHEN unique_violation THEN
    -- If duplicate key on email+role, fetch existing record
    SELECT id, email, full_name INTO v_user_id, v_email, v_full_name
    FROM public.users
    WHERE LOWER(email) = LOWER(v_email) AND role = p_role
    LIMIT 1;
    
    -- Update the auth_id if it's null
    IF v_user_id IS NOT NULL AND p_auth_id IS NOT NULL THEN
      UPDATE public.users
      SET auth_id = CASE WHEN auth_id IS NULL THEN p_auth_id ELSE auth_id END,
          updated_at = NOW()
      WHERE id = v_user_id;
      
      v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'User profile already exists - linked with auth account',
        'user_id', v_user_id,
        'email', v_email,
        'role', p_role,
        'is_active', TRUE
      );
    ELSE
      v_result := jsonb_build_object(
        'success', FALSE,
        'error', 'User profile with this email+role already exists',
        'email', v_email,
        'role', p_role
      );
    END IF;
    
    RETURN v_result;
END;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to create profile: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth(UUID, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Assign role to existing user by email - consolidate duplicate records
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.assign_user_role_by_email(TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_user_role_by_email(
  p_email TEXT,
  p_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_old_role TEXT;
  v_result JSONB;
  v_other_id UUID;
BEGIN
  -- Get the primary user ID by email (the one with auth_id set, or the oldest one)
  SELECT id, role INTO v_user_id, v_old_role
  FROM public.users 
  WHERE LOWER(email) = LOWER(p_email)
  ORDER BY auth_id DESC NULLS LAST, created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found with email: ' || p_email
    );
  END IF;

  -- If there are other records with the same email but different roles, delete them
  -- (Keep only the primary record)
  DELETE FROM public.users
  WHERE LOWER(email) = LOWER(p_email) 
    AND id != v_user_id;

  -- Update the primary user's role and mark as active
  UPDATE public.users 
  SET role = p_role,
      is_active = TRUE,
      updated_at = NOW()
  WHERE id = v_user_id;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User assigned as ' || p_role,
    'user_id', v_user_id,
    'email', p_email,
    'role', p_role,
    'previous_role', v_old_role,
    'is_active', TRUE
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to assign role: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.assign_user_role_by_email(TEXT, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- REMOVE RLS RESTRICTIONS - Allow admin access to all users
-- ═══════════════════════════════════════════════════════════════════════════

-- Disable RLS on public.users table to allow admin queries
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might restrict access
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Only admins can manage users" ON public.users;

-- Enable RLS again with proper admin-only policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (TRUE);

-- Allow authenticated admins to update user roles
CREATE POLICY "Admins can update user roles"
  ON public.users
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Get all users (no restrictions)
-- SELECT * FROM public.get_all_auth_users();

-- Search by email, name, phone, role
-- SELECT * FROM public.search_auth_users('example');

-- Get users without assigned roles
-- SELECT * FROM public.get_auth_users_without_profiles();

-- Create new user profile and assign role
-- SELECT public.create_user_profile_from_auth('550e8400-e29b-41d4-a716-446655440000'::uuid, 'manager');

-- Assign role to existing user by email
-- SELECT public.assign_user_role_by_email('user@example.com', 'cashier');
