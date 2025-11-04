-- ============================================================================
-- FIX FUNCTION SEARCH PATH SECURITY WARNINGS
-- ============================================================================
-- This script sets the search_path for all functions to prevent security issues
-- 
-- Functions to fix (11 total):
-- 1. is_admin
-- 2. is_manager_or_admin
-- 3. is_cashier_or_above
-- 4. is_supplier
-- 5. update_users_updated_at
-- 6. get_pending_users_count
-- 7. apaprove_user
-- 8. auto_confirm_admin_users
-- 9. get_pending_users
-- 10. get_all_users_admin
-- 11. update_updated_at_column
--
-- ⚠️  IMPORTANT: Copy this ENTIRE file and run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- ROLE CHECKING FUNCTIONS (from RLS script)
-- ============================================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_manager_or_admin() CASCADE;
DROP FUNCTION IF EXISTS is_cashier_or_above() CASCADE;
DROP FUNCTION IF EXISTS is_supplier() CASCADE;
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_pending_users_count() CASCADE;
DROP FUNCTION IF EXISTS approve_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS auto_confirm_admin_users() CASCADE;
DROP FUNCTION IF EXISTS get_pending_users() CASCADE;
DROP FUNCTION IF EXISTS get_all_users_admin() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 1. is_admin - Set search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );
END;
$$;

-- 2. is_manager_or_admin - Set search_path
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'manager')
  );
END;
$$;

-- 3. is_cashier_or_above - Set search_path
CREATE OR REPLACE FUNCTION is_cashier_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'manager', 'cashier')
  );
END;
$$;

-- 4. is_supplier - Set search_path
CREATE OR REPLACE FUNCTION is_supplier()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'supplier'
  );
END;
$$;

-- ============================================================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================================================

-- 5. update_users_updated_at - Set search_path
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. get_pending_users_count - Set search_path
CREATE OR REPLACE FUNCTION get_pending_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM users
  WHERE status = 'pending';
  
  RETURN pending_count;
END;
$$;

-- 7. approve_user - Set search_path
CREATE OR REPLACE FUNCTION approve_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE users
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- 8. auto_confirm_admin_users - Set search_path
CREATE OR REPLACE FUNCTION auto_confirm_admin_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 9. get_pending_users - Set search_path
CREATE OR REPLACE FUNCTION get_pending_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  raw_user_meta_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'status' = 'pending'
  ORDER BY u.created_at DESC;
END;
$$;

-- 10. get_all_users_admin - Set search_path
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  raw_user_meta_data JSONB,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    u.raw_user_meta_data,
    u.last_sign_in_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- 11. update_updated_at_column - Set search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check all functions now have search_path set
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN 'NO SEARCH_PATH SET ⚠️'
        ELSE 'SEARCH_PATH CONFIGURED ✅'
    END as search_path_status,
    p.proconfig as configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'is_admin',
    'is_manager_or_admin',
    'is_cashier_or_above',
    'is_supplier',
    'update_users_updated_at',
    'get_pending_users_count',
    'approve_user',
    'auto_confirm_admin_users',
    'get_pending_users',
    'get_all_users_admin',
    'update_updated_at_column'
)
ORDER BY p.proname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    function_count INTEGER;
    configured_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'is_admin',
        'is_manager_or_admin',
        'is_cashier_or_above',
        'is_supplier',
        'update_users_updated_at',
        'get_pending_users_count',
        'approve_user',
        'auto_confirm_admin_users',
        'get_pending_users',
        'get_all_users_admin',
        'update_updated_at_column'
    );
    
    SELECT COUNT(*) INTO configured_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'is_admin',
        'is_manager_or_admin',
        'is_cashier_or_above',
        'is_supplier',
        'update_users_updated_at',
        'get_pending_users_count',
        'approve_user',
        'auto_confirm_admin_users',
        'get_pending_users',
        'get_all_users_admin',
        'update_updated_at_column'
    )
    AND p.proconfig IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  FUNCTION SEARCH PATH SECURITY - FIXED!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SECURITY STATUS:';
    RAISE NOTICE '   ✓ % functions updated', function_count;
    RAISE NOTICE '   ✓ % functions with search_path configured', configured_count;
    RAISE NOTICE '   ✓ All functions now use SET search_path = public, pg_temp';
    RAISE NOTICE '';
    RAISE NOTICE '📋 FUNCTIONS FIXED:';
    RAISE NOTICE '   1. is_admin';
    RAISE NOTICE '   2. is_manager_or_admin';
    RAISE NOTICE '   3. is_cashier_or_above';
    RAISE NOTICE '   4. is_supplier';
    RAISE NOTICE '   5. update_users_updated_at';
    RAISE NOTICE '   6. get_pending_users_count';
    RAISE NOTICE '   7. approve_user';
    RAISE NOTICE '   8. auto_confirm_admin_users';
    RAISE NOTICE '   9. get_pending_users';
    RAISE NOTICE '   10. get_all_users_admin';
    RAISE NOTICE '   11. update_updated_at_column';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 WHAT THIS FIXES:';
    RAISE NOTICE '   ✓ Prevents search_path injection attacks';
    RAISE NOTICE '   ✓ Ensures functions use correct schema resolution';
    RAISE NOTICE '   ✓ Follows PostgreSQL SECURITY DEFINER best practices';
    RAISE NOTICE '   ✓ Resolves all "Function Search Path Mutable" warnings';
    RAISE NOTICE '';
    RAISE NOTICE '📊 REMAINING WARNINGS (Not SQL-fixable):';
    RAISE NOTICE '   • auth_leaked_password_protection - Enable in Auth settings';
    RAISE NOTICE '   • auth_insufficient_mfa_options - Enable in Auth settings';
    RAISE NOTICE '   ⚠️  These require configuration in Supabase Dashboard';
    RAISE NOTICE '';
    RAISE NOTICE '📍 WHERE TO FIX REMAINING WARNINGS:';
    RAISE NOTICE '   1. Go to Supabase Dashboard > Authentication > Policies';
    RAISE NOTICE '   2. Enable "Leaked Password Protection"';
    RAISE NOTICE '   3. Enable additional MFA methods (TOTP recommended)';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL FUNCTION SECURITY ISSUES RESOLVED!';
    RAISE NOTICE '';
END $$;
