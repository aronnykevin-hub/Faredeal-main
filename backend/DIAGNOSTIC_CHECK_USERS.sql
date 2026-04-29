-- ================================================================
-- DIAGNOSTIC: Check Current User Status
-- ================================================================
-- Run this in Supabase SQL Editor to see all users and their status
-- ================================================================

-- Show all users with key information
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed,
  created_at,
  auth_id
FROM public.users
ORDER BY created_at DESC;

-- Show breakdown by status
SELECT 
  is_active,
  role,
  COUNT(*) as count
FROM public.users
GROUP BY is_active, role
ORDER BY is_active DESC, role;

-- Show specific user by email
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed,
  auth_id,
  created_at,
  updated_at
FROM public.users
WHERE email LIKE '%aronnykevin%' OR email LIKE '%say%'
ORDER BY created_at DESC;

-- ================================================================
-- INTERPRETATION
-- ================================================================
-- If is_active = true: User can access portal immediately
-- If is_active = false: User needs admin approval (should show in pending list)
-- If profile_completed = false: User hasn't filled profile form yet
-- If auth_id IS NULL: User wasn't linked to Supabase Auth (broken record)
-- ================================================================
