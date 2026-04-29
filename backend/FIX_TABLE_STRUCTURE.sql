-- ================================================================
-- COMPLETE TABLE FIX - Add Missing Columns and Fix Constraints
-- ================================================================
-- Run this in Supabase SQL Editor to fix the users table structure
-- ================================================================

-- Step 1: Add missing columns that portals expect
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS address VARCHAR(500),
ADD COLUMN IF NOT EXISTS business_license VARCHAR(255),
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS shift VARCHAR(50),
ADD COLUMN IF NOT EXISTS till_experience VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Remove problematic foreign key constraints if they exist
-- (This allows new records to be created without FK violations)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 3: Remove email unique constraint to allow multiple roles per email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_key;

-- Step 4: Create composite unique constraint (email + role combination must be unique)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_role_unique;
ALTER TABLE public.users ADD CONSTRAINT users_email_role_unique UNIQUE(email, role);

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Step 6: Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this script:
-- 1. Check the columns are all present above
-- 2. Run: node create-all-role-records.js
-- 3. Test the portals
-- ================================================================
