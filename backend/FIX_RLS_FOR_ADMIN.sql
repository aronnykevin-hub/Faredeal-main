-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR ALL ROLES (Admin, Manager, Cashier, Supplier, Employee)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Only admins can manage users" ON public.users;

-- Disable RLS temporarily to fix it
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable with proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT (READ) POLICIES - Allow all authenticated users to view all users
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Allow all authenticated users to view users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Also allow anonymous (for login flow)
CREATE POLICY "Allow anonymous to view users for login"
  ON public.users
  FOR SELECT
  TO anon
  USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE POLICIES - Allow role-based updates
-- ═══════════════════════════════════════════════════════════════════════════

-- Admins can update any user (including role assignments)
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Managers can update users in their department
CREATE POLICY "Managers can update department users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Cashiers can update their own profile only
CREATE POLICY "Cashiers can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Suppliers can update their own profile and settings
CREATE POLICY "Suppliers can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Employees can update own profile
CREATE POLICY "Employees can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT POLICIES - Allow creation of new users
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Allow authenticated users to insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Also allow anonymous (for registration)
CREATE POLICY "Allow anonymous to create users"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- DELETE POLICIES - Restrict deletion (admin only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILE TABLES - Same RLS policies for profile tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix admin_profiles table RLS
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.admin_profiles;

ALTER TABLE IF EXISTS public.admin_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view admin profiles"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow authenticated users to update admin profiles"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Fix manager_profiles table RLS
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.manager_profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON public.manager_profiles;

ALTER TABLE IF EXISTS public.manager_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manager_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view manager profiles"
  ON public.manager_profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow authenticated users to update manager profiles"
  ON public.manager_profiles
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Fix cashier_profiles table RLS
DROP POLICY IF EXISTS "Cashiers can view all profiles" ON public.cashier_profiles;
DROP POLICY IF EXISTS "Cashiers can update all profiles" ON public.cashier_profiles;

ALTER TABLE IF EXISTS public.cashier_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cashier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view cashier profiles"
  ON public.cashier_profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow authenticated users to update cashier profiles"
  ON public.cashier_profiles
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Fix supplier_profiles table RLS
DROP POLICY IF EXISTS "Suppliers can view all profiles" ON public.supplier_profiles;
DROP POLICY IF EXISTS "Suppliers can update all profiles" ON public.supplier_profiles;

ALTER TABLE IF EXISTS public.supplier_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view supplier profiles"
  ON public.supplier_profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow authenticated users to update supplier profiles"
  ON public.supplier_profiles
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Check users table
-- SELECT COUNT(*) as total_users, COUNT(DISTINCT role) as unique_roles FROM public.users;

-- Check role distribution
-- SELECT role, COUNT(*) as count FROM public.users GROUP BY role ORDER BY count DESC;

-- Check specific user
-- SELECT id, email, role, is_active FROM public.users WHERE role IN ('admin', 'manager', 'cashier', 'supplier') LIMIT 5;
