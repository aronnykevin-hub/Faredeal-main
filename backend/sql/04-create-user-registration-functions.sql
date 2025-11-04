-- =====================================================================
-- USER REGISTRATION FUNCTIONS
-- =====================================================================
-- Creates RPC functions for registering suppliers, managers, and cashiers
-- These functions bypass RLS and handle password hashing properly
-- =====================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- Drop existing functions if they exist
-- =====================================================================
DROP FUNCTION IF EXISTS register_supplier(text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS register_manager(text,text,text,text,text);
DROP FUNCTION IF EXISTS register_cashier(text,text,text,text,text);
DROP FUNCTION IF EXISTS complete_supplier_profile(uuid,text,text,text,text,text,text,text,text,text,text,text);

-- =====================================================================
-- FUNCTION: Register Supplier
-- =====================================================================
CREATE OR REPLACE FUNCTION register_supplier(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_company_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_business_license TEXT,
  p_category TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  END IF;

  -- Hash the password
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  -- Insert new supplier
  INSERT INTO users (
    username,
    password,
    full_name,
    company_name,
    phone,
    address,
    business_license,
    category,
    role,
    is_active,
    profile_completed,
    submitted_at,
    created_at,
    updated_at
  ) VALUES (
    p_username,
    v_hashed_password,
    p_full_name,
    p_company_name,
    p_phone,
    p_address,
    p_business_license,
    p_category,
    'supplier',
    false,  -- Requires admin approval
    true,   -- Profile completed during signup
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Application submitted successfully! Pending admin approval.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Registration failed: ' || SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION: Register Manager
-- =====================================================================
CREATE OR REPLACE FUNCTION register_manager(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_department TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  END IF;

  -- Hash the password
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  -- Insert new manager
  INSERT INTO users (
    username,
    password,
    full_name,
    phone,
    department,
    role,
    is_active,
    profile_completed,
    submitted_at,
    created_at,
    updated_at
  ) VALUES (
    p_username,
    v_hashed_password,
    p_full_name,
    p_phone,
    p_department,
    'manager',
    false,  -- Requires admin approval
    false,  -- Will complete profile after approval
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Application submitted successfully! Pending admin approval.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Registration failed: ' || SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION: Register Cashier
-- =====================================================================
CREATE OR REPLACE FUNCTION register_cashier(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_shift TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  END IF;

  -- Hash the password
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  -- Insert new cashier
  INSERT INTO users (
    username,
    password,
    full_name,
    phone,
    shift,
    role,
    is_active,
    profile_completed,
    submitted_at,
    created_at,
    updated_at
  ) VALUES (
    p_username,
    v_hashed_password,
    p_full_name,
    p_phone,
    p_shift,
    'cashier',
    false,  -- Requires admin approval
    false,  -- Will complete profile after approval
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Application submitted successfully! Pending admin approval.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken. Please choose another.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Registration failed: ' || SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION: Create Supplier Profile for Google OAuth
-- =====================================================================
CREATE OR REPLACE FUNCTION create_supplier_oauth_profile(
  p_auth_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE auth_id = p_auth_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile already exists'
    );
  END IF;

  -- Insert new supplier profile
  INSERT INTO users (
    auth_id,
    email,
    full_name,
    phone,
    role,
    is_active,
    profile_completed,
    created_at,
    updated_at
  ) VALUES (
    p_auth_id,
    p_email,
    p_full_name,
    p_phone,
    'supplier',
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Profile created successfully. Please complete your details.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to create profile: ' || SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION: Complete Supplier Profile (for Google OAuth users)
-- =====================================================================
CREATE OR REPLACE FUNCTION complete_supplier_profile(
  p_auth_id UUID,
  p_full_name TEXT,
  p_company_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_business_license TEXT,
  p_tax_number TEXT,
  p_category TEXT,
  p_description TEXT,
  p_bank_account TEXT,
  p_bank_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the supplier profile
  UPDATE users
  SET
    full_name = p_full_name,
    company_name = p_company_name,
    phone = p_phone,
    address = p_address,
    city = p_city,
    business_license = p_business_license,
    tax_number = p_tax_number,
    category = p_category,
    description = p_description,
    bank_account = p_bank_account,
    bank_name = p_bank_name,
    profile_completed = true,
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE auth_id = p_auth_id
  AND role = 'supplier';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Supplier profile not found'
    );
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Profile completed successfully! Pending admin approval.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to complete profile: ' || SQLERRM
    );
END;
$$;

-- =====================================================================
-- Grant execute permissions
-- =====================================================================
GRANT EXECUTE ON FUNCTION register_supplier TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_manager TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_cashier TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_supplier_oauth_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_supplier_profile TO anon, authenticated;

-- =====================================================================
-- Success message
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ User registration functions created successfully!';
  RAISE NOTICE '📝 Available functions:';
  RAISE NOTICE '   - register_supplier(username, password, full_name, company_name, phone, address, business_license, category)';
  RAISE NOTICE '   - register_manager(username, password, full_name, phone, department)';
  RAISE NOTICE '   - register_cashier(username, password, full_name, phone, shift)';
  RAISE NOTICE '   - create_supplier_oauth_profile(auth_id, email, full_name, phone)';
  RAISE NOTICE '   - complete_supplier_profile(auth_id, full_name, company_name, ...)';
  RAISE NOTICE '🇺🇬 FAREDEAL Uganda - Secure user registration system ready!';
END $$;
