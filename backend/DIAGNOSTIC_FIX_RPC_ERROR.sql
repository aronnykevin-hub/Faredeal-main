-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Check why get_all_users_admin is failing
-- Run this in Supabase SQL Editor to diagnose the issue
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check if function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_all_users_admin';

-- 2. Check current auth user
SELECT 
  id,
  email
FROM auth.users
WHERE email = 'YOUR_CURRENT_EMAIL'; -- Replace with your email

-- 3. Check if current user exists in users table
SELECT 
  id,
  email,
  role,
  is_active
FROM public.users
WHERE email = 'YOUR_CURRENT_EMAIL'; -- Replace with your email

-- 4. Check admin users
SELECT 
  id,
  email,
  role,
  is_active
FROM public.users
WHERE role = 'admin';

-- 5. Try calling function as-is (might show error)
-- SELECT * FROM public.get_all_users_admin();

-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: If function doesn't exist or user is not admin, run below:
-- ═══════════════════════════════════════════════════════════════════════════

-- First, get your auth user ID
-- SELECT id, email FROM auth.users LIMIT 5;

-- Then insert/update your user in users table as admin
-- (Replace UUID with your actual auth user ID from above)

INSERT INTO public.users (id, email, full_name, role, is_active, email_verified, created_at)
VALUES (
  'YOUR_AUTH_USER_ID_HERE', -- Replace with actual UUID from auth.users
  'YOUR_EMAIL_HERE',         -- Replace with your email
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

-- ═══════════════════════════════════════════════════════════════════════════
-- Alternative: Create a simpler function without admin check (for testing)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_all_users_simple() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_users_simple()
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
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_all_users_simple() TO authenticated, anon;

-- Test the simple version
-- SELECT * FROM public.get_all_users_simple();
