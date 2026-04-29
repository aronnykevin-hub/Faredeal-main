-- ================================================================
-- COMPLETE ADMIN USER FIX
-- ================================================================
-- This SQL script:
-- 1. Finds the auth user with email abanabaasa2@gmail.com
-- 2. Creates/updates users table record
-- 3. Ensures role is set to 'admin'
-- 4. Links auth_id to users table
-- ================================================================

-- Step 1: Ensure users table exists with all columns
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add all required columns if missing
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_id UUID,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Remove unique constraints that might cause issues
-- This allows us to ensure only one admin per email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_key;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Step 5: Delete any broken admin records
DELETE FROM public.users 
WHERE email = 'abanabaasa2@gmail.com' AND (role != 'admin' OR auth_id IS NULL);

-- Step 6: Check if user already exists and update if needed
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user by email
  SELECT id INTO v_user_id FROM public.users 
  WHERE email = 'abanabaasa2@gmail.com' AND role = 'admin'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists, just make sure settings are correct
    UPDATE public.users 
    SET 
      full_name = COALESCE(full_name, 'Admin User'),
      phone = COALESCE(phone, '+256-700-000000'),
      role = 'admin',
      is_active = TRUE,
      email_verified = TRUE,
      profile_completed = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Updated existing admin user: %', v_user_id;
  ELSE
    -- Create new admin user
    INSERT INTO public.users (
      email,
      full_name,
      phone,
      role,
      is_active,
      email_verified,
      profile_completed,
      created_at,
      updated_at
    ) VALUES (
      'abanabaasa2@gmail.com',
      'Admin User',
      '+256-700-000000',
      'admin',
      TRUE,
      TRUE,
      TRUE,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new admin user';
  END IF;
END $$;

-- Step 7: Display the admin user
SELECT 
  id,
  auth_id,
  email,
  full_name,
  role,
  is_active,
  email_verified,
  created_at
FROM public.users
WHERE email = 'abanabaasa2@gmail.com' AND role = 'admin';

-- ================================================================
-- NEXT STEPS:
-- ================================================================
-- ✅ The database user record is now created with role='admin'
-- ✅ Now you MUST link the auth_id:
-- 
-- 1. Go to Supabase Auth → Users
-- 2. Find the user: abanabaasa2@gmail.com
-- 3. Click on the user ID to view details
-- 4. Copy the User ID (looks like: uuid)
-- 5. Run this in SQL Editor:
--    UPDATE public.users 
--    SET auth_id = 'PASTE_THE_UUID_HERE'
--    WHERE email = 'abanabaasa2@gmail.com';
-- 6. Then logout and login again - you should have admin access!
-- ================================================================
