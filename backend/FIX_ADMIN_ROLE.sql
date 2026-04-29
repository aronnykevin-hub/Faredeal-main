-- ================================================================
-- ADMIN USER - COMPLETE DIAGNOSTIC & FIX
-- ================================================================
-- This script will:
-- 1. Check what's currently in the database
-- 2. Fix the role if needed
-- 3. Link auth user to database record
-- ================================================================

-- STEP 1: Check current state
SELECT 
    'DATABASE USER RECORD' as section,
    id,
    email,
    role,
    auth_id,
    is_active,
    email_verified
FROM public.users
WHERE email = 'abanabaasa2@gmail.com'
LIMIT 1;

-- STEP 2: Check Supabase Auth (run separately in Supabase Console)
-- Go to: Authentication → Users → Search for abanabaasa2@gmail.com
-- Get the User ID from there

-- STEP 3: Make sure role is admin
UPDATE public.users
SET role = 'admin'
WHERE email = 'abanabaasa2@gmail.com' AND (role IS NULL OR role != 'admin');

-- STEP 4: Verify update
SELECT 
    'AFTER UPDATE' as status,
    id,
    email,
    role,
    auth_id,
    is_active,
    email_verified
FROM public.users
WHERE email = 'abanabaasa2@gmail.com';

-- ================================================================
-- INSTRUCTIONS:
-- ================================================================
-- 1. Run steps 1-4 above first
-- 2. Then go to Supabase → Auth → Users
-- 3. Find user: abanabaasa2@gmail.com
-- 4. Copy the User ID (looks like: 12345678-1234-1234-1234-123456789012)
-- 5. Run this with YOUR auth user ID:
--    UPDATE public.users 
--    SET auth_id = 'PASTE_YOUR_AUTH_USER_ID_HERE'
--    WHERE email = 'abanabaasa2@gmail.com';
-- 6. Clear browser cache and try logging in again
-- ================================================================
