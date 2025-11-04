-- ============================================================================
-- FIX ADMIN_DASHBOARD_METRICS RLS (Row Level Security)
-- ============================================================================
-- Issue: Table admin_dashboard_metrics is public but RLS is not enabled
-- Risk: Unauthorized access via PostgREST API
-- Solution: Enable RLS + Create admin-only policies
--
-- ⚠️  COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function to check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

-- ============================================================================
-- STEP 2: Enable RLS on admin_dashboard_metrics
-- ============================================================================

ALTER TABLE public.admin_dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Drop any existing policies (clean slate)
-- ============================================================================

DROP POLICY IF EXISTS "admin_dashboard_metrics_select" ON admin_dashboard_metrics;
DROP POLICY IF EXISTS "admin_dashboard_metrics_insert" ON admin_dashboard_metrics;
DROP POLICY IF EXISTS "admin_dashboard_metrics_update" ON admin_dashboard_metrics;
DROP POLICY IF EXISTS "admin_dashboard_metrics_delete" ON admin_dashboard_metrics;
DROP POLICY IF EXISTS "admin_select" ON admin_dashboard_metrics;
DROP POLICY IF EXISTS "admin_write" ON admin_dashboard_metrics;

-- ============================================================================
-- STEP 4: Create policies for admin-only access
-- ============================================================================

-- Policy: Allow admins to SELECT (read)
CREATE POLICY "admin_dashboard_metrics_select"
ON admin_dashboard_metrics
FOR SELECT
TO authenticated
USING (is_admin());

-- Policy: Allow admins to INSERT (create)
CREATE POLICY "admin_dashboard_metrics_insert"
ON admin_dashboard_metrics
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Policy: Allow admins to UPDATE (modify)
CREATE POLICY "admin_dashboard_metrics_update"
ON admin_dashboard_metrics
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Allow admins to DELETE (remove)
CREATE POLICY "admin_dashboard_metrics_delete"
ON admin_dashboard_metrics
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 5: Verification queries
-- ============================================================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'admin_dashboard_metrics';

-- Check policies created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation
FROM pg_policies
WHERE tablename = 'admin_dashboard_metrics'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: Test queries (UNCOMMENT TO TEST)
-- ============================================================================

-- Test 1: Check if is_admin() function works
-- SELECT is_admin() as am_i_admin;

-- Test 2: Try to read metrics (should work for admins only)
-- SELECT COUNT(*) FROM admin_dashboard_metrics;

-- Test 3: Check your current user role
-- SELECT 
--   auth.uid() as my_user_id,
--   (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) as my_role;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '✅  RLS SECURITY APPLIED SUCCESSFULLY';
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Row Level Security STATUS:';
    RAISE NOTICE '   ✓ RLS enabled on admin_dashboard_metrics';
    RAISE NOTICE '   ✓ 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '   ✓ Helper function is_admin() created';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SECURITY RULES:';
    RAISE NOTICE '   • Only authenticated admins can access this table';
    RAISE NOTICE '   • Non-admin users are completely blocked';
    RAISE NOTICE '   • Service role (backend) bypasses RLS automatically';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Run the verification queries above';
    RAISE NOTICE '   2. Test as admin user - should work';
    RAISE NOTICE '   3. Test as non-admin - should be denied';
    RAISE NOTICE '   4. Check your admin portal still works';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT:';
    RAISE NOTICE '   Backend using service_role key bypasses RLS';
    RAISE NOTICE '   Frontend users are restricted by RLS policies';
    RAISE NOTICE '';
END $$;
