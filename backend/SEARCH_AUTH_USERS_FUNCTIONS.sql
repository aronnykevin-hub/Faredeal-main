-- ═══════════════════════════════════════════════════════════════════════════
-- NEW SEARCH FUNCTION: Get all auth users (signed up users)
-- Shows users from auth.users that may or may not have profiles yet
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
    au.id,
    au.email,
    COALESCE(pu.full_name, au.user_metadata->>'full_name', au.email),
    pu.phone,
    pu.username,
    pu.role,
    COALESCE(pu.is_active, FALSE),
    COALESCE(pu.email_verified, au.email_confirmed),
    pu.profile_completed,
    au.created_at,
    COALESCE(pu.updated_at, au.updated_at),
    (pu.id IS NOT NULL)::BOOLEAN as has_profile
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- Search auth users by email or name
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
  v_search_lower := LOWER(COALESCE(p_search_query, ''));
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    COALESCE(pu.full_name, au.user_metadata->>'full_name', au.email),
    pu.phone,
    pu.username,
    pu.role,
    COALESCE(pu.is_active, FALSE),
    COALESCE(pu.email_verified, au.email_confirmed),
    pu.profile_completed,
    au.created_at,
    COALESCE(pu.updated_at, au.updated_at),
    (pu.id IS NOT NULL)::BOOLEAN as has_profile
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE 
    LOWER(au.email) LIKE '%' || v_search_lower || '%' OR
    LOWER(COALESCE(pu.full_name, au.user_metadata->>'full_name')) LIKE '%' || v_search_lower || '%'
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.search_auth_users(TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Get auth users without profiles (newly signed up, not yet in users table)
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
    au.id,
    au.email,
    COALESCE(au.user_metadata->>'full_name', au.email),
    au.created_at
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_auth_users_without_profiles() TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Create profile for auth user who doesn't have one yet
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.create_user_profile_from_auth(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth(
  p_auth_id UUID,
  p_role TEXT DEFAULT 'user'
)
RETURNS JSONB AS $$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
  v_result JSONB;
BEGIN
  -- Get auth user details
  SELECT 
    email,
    COALESCE(user_metadata->>'full_name', email)
  INTO v_email, v_full_name
  FROM auth.users
  WHERE id = p_auth_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Auth user not found'
    );
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_auth_id) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User profile already exists'
    );
  END IF;

  -- Create profile
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

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to create profile: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth(UUID, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Get all auth users with or without profiles
-- SELECT * FROM public.get_all_auth_users();

-- Search by email or name
-- SELECT * FROM public.search_auth_users('example');

-- Get users without profiles (newly signed up)
-- SELECT * FROM public.get_auth_users_without_profiles();

-- Create profile for auth user and assign role
-- SELECT public.create_user_profile_from_auth('auth-user-id-here', 'manager');
