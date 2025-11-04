-- ============================================================================
-- CHECK PENDING SUPPLIERS
-- ============================================================================
-- Run this in Supabase SQL Editor to check pending supplier applications
-- ============================================================================

-- 1. Check all pending users (is_active = false)
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    metadata
FROM public.users
WHERE is_active = false
ORDER BY created_at DESC;

-- 2. Check specifically for pending suppliers
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    metadata->>'company_name' as company_name,
    metadata->>'business_category' as business_category,
    metadata->>'application_date' as application_date
FROM public.users
WHERE role = 'supplier' AND is_active = false
ORDER BY created_at DESC;

-- 3. Count pending users by role
SELECT 
    role,
    COUNT(*) as pending_count
FROM public.users
WHERE is_active = false
GROUP BY role
ORDER BY role;

-- 4. Check all suppliers (active and inactive)
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    metadata->>'company_name' as company_name
FROM public.users
WHERE role = 'supplier'
ORDER BY created_at DESC;

-- 5. Test the RPC function (as admin)
SELECT * FROM get_pending_users();

-- 6. Check if RPC function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%pending%'
ORDER BY routine_name;

-- ============================================================================
-- EXPECTED RESULTS:
-- - Query 1: Should show ALL pending users regardless of role
-- - Query 2: Should show ONLY pending suppliers with their company details
-- - Query 3: Should show count breakdown (manager, cashier, employee, supplier)
-- - Query 4: Should show all suppliers (both pending and approved)
-- - Query 5: Should return same as Query 1 (if you're logged in as admin)
-- - Query 6: Should show get_pending_users and get_all_users_admin functions
-- ============================================================================
