-- =====================================================================
-- ADD PROFILE PICTURE SUPPORT TO ALL PROFILE TABLES
-- =====================================================================
-- This migration adds profile picture URL columns to support user avatars
-- Can be used with Supabase Storage or external image URLs
-- =====================================================================

-- Add profile_image_url to supplier_profiles table
ALTER TABLE supplier_profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN supplier_profiles.profile_image_url IS 'URL to supplier profile picture - can be Supabase Storage URL, base64 data URI, or external URL';

-- Add profile_image_url to manager_profiles table (if it exists)
-- This will only run if the table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'manager_profiles') THEN
        ALTER TABLE manager_profiles 
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
        
        COMMENT ON COLUMN manager_profiles.profile_image_url IS 'URL to manager profile picture - can be Supabase Storage URL, base64 data URI, or external URL';
    END IF;
END $$;

-- Add profile_image_url to employee_profiles table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_profiles') THEN
        ALTER TABLE employee_profiles 
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
        
        COMMENT ON COLUMN employee_profiles.profile_image_url IS 'URL to employee profile picture - can be Supabase Storage URL, base64 data URI, or external URL';
    END IF;
END $$;

-- Add avatar_url to users table if it doesn't exist (for backward compatibility)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar/profile picture - can be emoji, Supabase Storage URL, base64 data URI, or external URL';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_profile_image ON supplier_profiles(profile_image_url) WHERE profile_image_url IS NOT NULL;

-- =====================================================================
-- USAGE NOTES:
-- =====================================================================
-- After running this migration, you can:
--
-- 1. Store base64 encoded images directly:
--    UPDATE supplier_profiles 
--    SET profile_image_url = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
--    WHERE id = 'your-supplier-id';
--
-- 2. Store Supabase Storage URLs:
--    UPDATE supplier_profiles 
--    SET profile_image_url = 'https://your-project.supabase.co/storage/v1/object/public/profile-pictures/image.jpg'
--    WHERE id = 'your-supplier-id';
--
-- 3. Store external URLs:
--    UPDATE supplier_profiles 
--    SET profile_image_url = 'https://example.com/images/profile.jpg'
--    WHERE id = 'your-supplier-id';
--
-- 4. Query suppliers with profile pictures:
--    SELECT business_name, profile_image_url 
--    FROM supplier_profiles 
--    WHERE profile_image_url IS NOT NULL;
--
-- =====================================================================

-- Log the migration
DO $$ 
BEGIN
    RAISE NOTICE 'Profile picture columns added successfully!';
    RAISE NOTICE 'Tables updated: supplier_profiles, users, and any existing manager/employee profile tables';
END $$;
