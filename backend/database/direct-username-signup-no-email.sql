-- =====================================================================
-- 🎨 DIRECT NO-EMAIL AUTHENTICATION - Database Functions
-- =====================================================================
-- Creates direct database signup/login functions
-- NO email required - just username + password
-- Bcrypt password hashing with pgcrypto
-- =====================================================================

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- FUNCTION 1: Direct Supplier Signup (NO EMAIL!)
-- =====================================================================
CREATE OR REPLACE FUNCTION direct_supplier_signup(
  p_username VARCHAR(50),
  p_password TEXT,
  p_full_name TEXT,
  p_company_name TEXT,
  p_phone VARCHAR(20) DEFAULT NULL,
  p_business_category TEXT DEFAULT NULL,
  p_business_license TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_supplier_code VARCHAR(50);
  v_password_hash TEXT;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username already taken'
    );
  END IF;

  -- Generate UUID for new user
  v_user_id := gen_random_uuid();
  
  -- Hash the password using bcrypt
  v_password_hash := crypt(p_password, gen_salt('bf', 8));
  
  -- Generate supplier code
  v_supplier_code := 'SUP-' || UPPER(LEFT(p_username, 4)) || '-' || 
                     TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

  -- Insert into users table
  INSERT INTO users (
    id,
    username,
    password_hash,
    full_name,
    email,
    phone,
    role,
    company_name,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_username,
    v_password_hash,
    p_full_name,
    p_username || '@internal.faredeal.app',
    COALESCE(p_phone, '+256-000-000000'),
    'supplier',
    p_company_name,
    false,
    NOW(),
    NOW()
  );

  -- Create supplier profile
  INSERT INTO supplier_profiles (
    id,
    supplier_code,
    business_name,
    contact_person_name,
    contact_person_email,
    contact_person_phone,
    business_type,
    registration_number,
    physical_address,
    city,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_supplier_code,
    p_company_name,
    p_full_name,
    p_username || '@internal.faredeal.app',
    COALESCE(p_phone, '+256-000-000000'),
    CASE 
      WHEN p_business_category = 'Fresh Produce' THEN 'local_producer'
      WHEN p_business_category IN ('Groceries', 'Dairy Products', 'Beverages') THEN 'wholesaler'
      WHEN p_business_category IN ('Personal Care', 'Household Items') THEN 'distributor'
      ELSE 'distributor'
    END,
    p_business_license,
    COALESCE(p_address, 'Uganda'),
    'Kampala',
    'pending',
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Supplier account created successfully',
    'user_id', v_user_id,
    'username', p_username,
    'supplier_code', v_supplier_code
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION 2: Direct Supplier Login (NO EMAIL!)
-- =====================================================================
CREATE OR REPLACE FUNCTION direct_supplier_login(
  p_username VARCHAR(50),
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Get user by username
  SELECT 
    id,
    username,
    password_hash,
    full_name,
    email,
    phone,
    role,
    company_name,
    is_active
  INTO v_user
  FROM users
  WHERE LOWER(username) = LOWER(p_username)
    AND role = 'supplier';

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;

  -- Verify password using bcrypt
  IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;

  -- Check if account is active (approved by admin)
  IF NOT v_user.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account pending admin approval',
      'pending', true
    );
  END IF;

  -- Successful login
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'full_name', v_user.full_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'company_name', v_user.company_name,
      'role', v_user.role
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Login failed'
    );
END;
$$;

-- =====================================================================
-- FUNCTION 3: Approve Supplier (Admin Function)
-- =====================================================================
CREATE OR REPLACE FUNCTION approve_supplier_direct(supplier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_data JSONB;
  v_supplier_data JSONB;
BEGIN
  -- Update users table to activate account
  UPDATE users
  SET 
    is_active = true,
    updated_at = NOW()
  WHERE id = supplier_id
    AND role = 'supplier'
    AND is_active = false
  RETURNING jsonb_build_object(
    'id', id,
    'username', username,
    'full_name', full_name,
    'company_name', company_name
  ) INTO v_user_data;
  
  IF v_user_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Supplier not found or already approved'
    );
  END IF;

  -- Update supplier profile status
  UPDATE supplier_profiles
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = supplier_id
  RETURNING jsonb_build_object(
    'supplier_code', supplier_code,
    'business_name', business_name,
    'status', status
  ) INTO v_supplier_data;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Supplier approved successfully',
    'user', v_user_data,
    'supplier', v_supplier_data
  );
END;
$$;

-- =====================================================================
-- Add password_hash column if it doesn't exist
-- =====================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for direct authentication';

-- =====================================================================
-- Grant permissions
-- =====================================================================
GRANT EXECUTE ON FUNCTION direct_supplier_signup(VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION direct_supplier_login(VARCHAR, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION approve_supplier_direct(UUID) TO authenticated;

-- =====================================================================
-- Create index for performance
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_password_hash 
ON users(password_hash) 
WHERE password_hash IS NOT NULL;

-- =====================================================================
-- Success message
-- =====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ DIRECT NO-EMAIL AUTHENTICATION - SETUP COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  ✓ direct_supplier_signup()';
    RAISE NOTICE '  ✓ direct_supplier_login()';
    RAISE NOTICE '  ✓ approve_supplier_direct()';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✓ Username + password ONLY (NO email)';
    RAISE NOTICE '  ✓ Bcrypt password hashing';
    RAISE NOTICE '  ✓ NO rate limits';
    RAISE NOTICE '  ✓ Admin approval workflow';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
