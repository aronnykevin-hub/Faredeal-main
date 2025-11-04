-- =============================================
-- SIMPLE GOOGLE-ONLY AUTHENTICATION SYSTEM
-- =============================================
-- This replaces all previous complex authentication
-- ONLY Google Sign-In supported
-- =============================================

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS create_google_user(uuid, text, text, text);
DROP FUNCTION IF EXISTS complete_google_profile(uuid, text, text, text, text, text, text);

-- =============================================
-- Function 1: Create user after Google Sign-In
-- =============================================
-- Called immediately after Google OAuth
-- Creates basic user record with email in users table
-- This ensures the supplier profile is visible in Supabase
-- =============================================
CREATE OR REPLACE FUNCTION create_google_user(
    p_auth_id uuid,
    p_email text,
    p_full_name text,
    p_avatar_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_existing_user_id uuid;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_existing_user_id
    FROM users
    WHERE auth_id = p_auth_id;
    
    IF v_existing_user_id IS NOT NULL THEN
        -- User already exists, return their info
        RAISE NOTICE 'User already exists with id: %', v_existing_user_id;
        RETURN json_build_object(
            'success', true,
            'user_id', v_existing_user_id,
            'message', 'User already exists',
            'existing', true
        );
    END IF;
    
    -- Create new user in users table
    INSERT INTO users (
        auth_id,
        email,
        full_name,
        username,
        role,
        profile_completed,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_auth_id,
        p_email,
        p_full_name,
        p_email, -- Use email as username for Google users
        'supplier',
        false, -- Profile not completed yet
        false, -- Not active until admin approves
        NOW(),
        NOW()
    )
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Created new supplier user with id: %', v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Google user created successfully in users table',
        'existing', false
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- =============================================
-- Function 2: Complete supplier profile
-- =============================================
-- Called when user fills out business details form
-- Updates user record with company information in users table
-- This ensures the profile data is saved and visible in Supabase
-- =============================================
CREATE OR REPLACE FUNCTION complete_google_profile(
    p_auth_id uuid,
    p_company_name text,
    p_phone text,
    p_address text,
    p_business_license text,
    p_category text,
    p_full_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_updated_count int;
    v_existing_profile record;
BEGIN
    -- Find user by auth_id and get current profile
    SELECT id, email, full_name, company_name, profile_completed 
    INTO v_existing_profile
    FROM users
    WHERE auth_id = p_auth_id
    AND role = 'supplier';
    
    IF v_existing_profile.id IS NULL THEN
        RAISE NOTICE 'User not found for auth_id: %', p_auth_id;
        RETURN json_build_object(
            'success', false,
            'error', 'Supplier user not found. Please sign in again.',
            'auth_id', p_auth_id
        );
    END IF;
    
    RAISE NOTICE 'Updating profile for user id: %, email: %', v_existing_profile.id, v_existing_profile.email;
    
    -- Update user profile with business details in users table
    UPDATE users
    SET 
        full_name = COALESCE(p_full_name, full_name),
        company_name = p_company_name,
        phone = p_phone,
        address = p_address,
        business_license = p_business_license,
        category = p_category,
        profile_completed = true,
        updated_at = NOW()
    WHERE auth_id = p_auth_id
    AND role = 'supplier';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count = 0 THEN
        RAISE NOTICE 'Profile update failed for auth_id: %', p_auth_id;
        RETURN json_build_object(
            'success', false,
            'error', 'Profile update failed - no rows updated'
        );
    END IF;
    
    RAISE NOTICE 'Profile updated successfully for user id: %', v_existing_profile.id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', v_existing_profile.id,
        'message', 'Profile completed successfully in users table',
        'profile_completed', true,
        'updated_count', v_updated_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error completing profile: %, SQLSTATE: %', SQLERRM, SQLSTATE;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- =============================================
-- Grant permissions
-- =============================================
GRANT EXECUTE ON FUNCTION create_google_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_google_profile TO anon, authenticated;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- After running this file, use these to verify:
-- 
-- 1. Check if functions exist:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('create_google_user', 'complete_google_profile');
--
-- 2. View all supplier profiles:
-- SELECT id, auth_id, email, full_name, company_name, phone, 
--        role, profile_completed, is_active, created_at
-- FROM users 
-- WHERE role = 'supplier' 
-- ORDER BY created_at DESC;
--
-- 3. Test create_google_user (replace with real UUID):
-- SELECT create_google_user(
--     'test-uuid'::uuid,
--     'test@example.com',
--     'Test User',
--     NULL
-- );
-- =============================================

-- =============================================
-- INSTRUCTIONS:
-- =============================================
-- 1. Run this ENTIRE SQL file in Supabase SQL Editor
-- 2. Check for "Success" message or any errors
-- 3. Make sure Google OAuth is enabled in Supabase:
--    → Authentication → Providers → Google → Enable
-- 4. Refresh your frontend application
-- 5. Flow: Google Sign-In → create_google_user() → Profile Form → complete_google_profile() → Portal
-- 6. Verify data: Check users table in Supabase for new supplier records
-- =============================================
