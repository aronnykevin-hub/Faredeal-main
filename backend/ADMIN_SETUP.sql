-- ═══════════════════════════════════════════════════════════════════════════
-- FAREDEAL ADMIN ACCOUNT FIX SQL
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/[PROJECT]/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Ensure users table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role text DEFAULT 'user',
  department text,
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Step 2: Create admin profile for existing auth user (abana1662@gmail.com - Super Admin)
INSERT INTO public.users (id, email, full_name, role, department, is_active, email_verified, created_at)
VALUES (
  '8bb38779-2aaf-4510-b6b6-65d1efa69af7',
  'abana1662@gmail.com',
  'Admin User',
  'super_admin',
  'Administration',
  true,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = now();

-- Step 3: Set up admin user (farmagent25@gmail.com)
INSERT INTO public.users (id, email, full_name, role, department, is_active, email_verified, created_at)
VALUES (
  '8fd43f6e-a509-4800-9fb9-4e776f74afc6',
  'farmagent25@gmail.com',
  'Farm Agent Admin',
  'admin',
  'Administration',
  true,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();

-- Step 4: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policy for admins to access all users
CREATE POLICY "admins_all_access" ON public.users
FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR id = auth.uid()
);

-- Step 6: Verify the data
SELECT 'Admin Users Created:' as status;
SELECT email, role, is_active, email_verified FROM public.users WHERE role IN ('admin', 'super_admin');
