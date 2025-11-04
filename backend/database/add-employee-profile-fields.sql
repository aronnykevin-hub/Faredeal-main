-- =====================================================================
-- ADD COMPREHENSIVE EMPLOYEE PROFILE FIELDS TO USERS TABLE
-- =====================================================================
-- This migration adds detailed profile fields for employee applications
-- Run this in your Supabase SQL Editor
-- =====================================================================

-- Add employee profile fields to users table
DO $$
BEGIN
    -- Personal Information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='date_of_birth') THEN
        ALTER TABLE users ADD COLUMN date_of_birth DATE;
        COMMENT ON COLUMN users.date_of_birth IS 'Employee date of birth';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='gender') THEN
        ALTER TABLE users ADD COLUMN gender VARCHAR(20);
        COMMENT ON COLUMN users.gender IS 'Employee gender (male, female, other)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='address') THEN
        ALTER TABLE users ADD COLUMN address TEXT;
        COMMENT ON COLUMN users.address IS 'Employee home address';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='city') THEN
        ALTER TABLE users ADD COLUMN city VARCHAR(100);
        COMMENT ON COLUMN users.city IS 'Employee city/town';
    END IF;

    -- Work Information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='position') THEN
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
        COMMENT ON COLUMN users.position IS 'Desired/current position';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='availability') THEN
        ALTER TABLE users ADD COLUMN availability VARCHAR(50) DEFAULT 'full-time';
        COMMENT ON COLUMN users.availability IS 'Work availability (full-time, part-time, contract, flexible)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='education_level') THEN
        ALTER TABLE users ADD COLUMN education_level VARCHAR(50);
        COMMENT ON COLUMN users.education_level IS 'Highest education level';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='previous_experience') THEN
        ALTER TABLE users ADD COLUMN previous_experience TEXT;
        COMMENT ON COLUMN users.previous_experience IS 'Previous work experience description';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='skills') THEN
        ALTER TABLE users ADD COLUMN skills TEXT;
        COMMENT ON COLUMN users.skills IS 'Employee skills and competencies';
    END IF;

    -- Emergency Contact
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='emergency_contact') THEN
        ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(200);
        COMMENT ON COLUMN users.emergency_contact IS 'Emergency contact person name';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='emergency_phone') THEN
        ALTER TABLE users ADD COLUMN emergency_phone VARCHAR(20);
        COMMENT ON COLUMN users.emergency_phone IS 'Emergency contact phone number';
    END IF;

    -- Additional Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='id_number') THEN
        ALTER TABLE users ADD COLUMN id_number VARCHAR(50);
        COMMENT ON COLUMN users.id_number IS 'National ID or passport number';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='profile_completed') THEN
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT false;
        COMMENT ON COLUMN users.profile_completed IS 'Whether employee completed full profile';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='submitted_at') THEN
        ALTER TABLE users ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN users.submitted_at IS 'When the employee application was submitted';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='approved_at') THEN
        ALTER TABLE users ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN users.approved_at IS 'When the employee was approved by admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='approved_by') THEN
        ALTER TABLE users ADD COLUMN approved_by UUID REFERENCES users(id);
        COMMENT ON COLUMN users.approved_by IS 'Admin who approved this employee';
    END IF;

    RAISE NOTICE '✅ All employee profile columns added successfully!';
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================
-- Run this to verify all columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
    'date_of_birth', 'gender', 'address', 'city', 'position',
    'availability', 'education_level', 'previous_experience', 'skills',
    'emergency_contact', 'emergency_phone', 'id_number',
    'profile_completed', 'submitted_at', 'approved_at', 'approved_by'
)
ORDER BY column_name;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
    RAISE NOTICE '🎉 EMPLOYEE PROFILE FIELDS MIGRATION COMPLETE!';
    RAISE NOTICE '✅ Added comprehensive profile fields to users table';
    RAISE NOTICE '✅ Created indexes for better performance';
    RAISE NOTICE '✅ Employees can now submit detailed applications';
    RAISE NOTICE '📋 Admin can review complete employee profiles before approval';
END $$;
