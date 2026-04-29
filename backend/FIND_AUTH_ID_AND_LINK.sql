-- ================================================================
-- FIND AUTH USER ID & LINK ADMIN
-- ================================================================
-- This script finds your auth user and helps you link the auth_id
-- ================================================================

-- Step 1: Show the database user record
SELECT 
  'DATABASE RECORD' as "Section",
  id as "User ID",
  email,
  role,
  auth_id,
  is_active,
  email_verified
FROM public.users
WHERE email = 'abanabaasa2@gmail.com'
LIMIT 1;

-- Step 2: Display what you need to do
-- Note: You cannot directly query auth.users table, so you must:
-- 1. Go to Supabase Dashboard
-- 2. Click: Authentication → Users
-- 3. Find: abanabaasa2@gmail.com
-- 4. Copy the User ID shown on that page
-- 5. Paste it in the UPDATE below

-- Step 3: THE CRITICAL UPDATE - COPY YOUR AUTH USER ID AND PASTE HERE
-- Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID from Supabase Auth
-- Then run this entire block:
/*
UPDATE public.users 
SET 
  auth_id = 'YOUR_AUTH_USER_ID_HERE',
  updated_at = NOW()
WHERE email = 'abanabaasa2@gmail.com';

-- Verify it was linked
SELECT 
  'AFTER LINKING' as "Section",
  id as "User ID",
  email,
  role,
  auth_id,
  is_active,
  email_verified
FROM public.users
WHERE email = 'abanabaasa2@gmail.com';
*/

-- ================================================================
-- MANUAL INSTRUCTIONS IF ABOVE DOESN'T WORK:
-- ================================================================
-- 1. Login to https://app.supabase.com
-- 2. Select your Faredeal project
-- 3. Click "Authentication" in left sidebar
-- 4. Click "Users" tab
-- 5. Find user: abanabaasa2@gmail.com
-- 6. Click on the email to open user details
-- 7. You'll see a UUID like: 12345678-1234-1234-1234-123456789012
-- 8. Copy that UUID
-- 9. Come back to SQL Editor
-- 10. Run this (replace abc123... with your UUID):
-- 
-- UPDATE public.users 
-- SET auth_id = 'abc12345-1234-1234-1234-123456789012'
-- WHERE email = 'abanabaasa2@gmail.com';
-- 
-- 11. Then logout from the admin portal and login again
-- 12. You should now have admin access! ✅
-- ================================================================
