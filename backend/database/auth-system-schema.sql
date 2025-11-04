-- ============================================================================
-- FAREDEAL AUTHENTICATION SYSTEM - Minimal Safe Schema
-- ============================================================================
-- This schema only includes tables needed for the multi-portal auth system
-- Built on: October 10, 2025
-- Safe to run: Won't conflict with existing backend tables
-- ============================================================================

-- Enable required extensions (safe - won't create if already exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Create only if they don't exist)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'admin',
        'manager',
        'cashier',
        'employee',
        'supplier',
        'customer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MAIN USERS TABLE
-- ============================================================================
-- This table stores all user data for the authentication system
-- Works with Supabase auth.users table

CREATE TABLE IF NOT EXISTS public.users (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Role and status
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT FALSE,  -- Admin must approve
    
    -- Employee specific fields
    employee_id VARCHAR(50) UNIQUE,  -- MGR-xxx, CSH-xxx, EMP-xxx
    department VARCHAR(100),  -- For managers and employees
    
    -- Additional metadata (JSON for flexibility)
    metadata JSONB DEFAULT '{}',
    -- metadata structure based on role:
    -- Manager: {}
    -- Cashier: {"preferred_shift": "morning|afternoon|night|flexible"}
    -- Employee: {"position": "Sales Associate|Stock Clerk|etc"}
    -- Supplier: {
    --   "company_name": "string",
    --   "business_category": "Fresh Produce|Groceries|etc",
    --   "business_license": "string",
    --   "address": "string"
    -- }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY IF NOT EXISTS "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid() = auth_id);

-- Policy: Users can update their own data
CREATE POLICY IF NOT EXISTS "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- Policy: Admins can view all users
CREATE POLICY IF NOT EXISTS "Admins can view all users" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can update all users (for approval)
CREATE POLICY IF NOT EXISTS "Admins can update all users" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can delete users (for rejection)
CREATE POLICY IF NOT EXISTS "Admins can delete users" ON public.users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Anyone can insert (for registration)
CREATE POLICY IF NOT EXISTS "Anyone can register" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at();

-- ============================================================================
-- ADMIN AUTO-CONFIRM FUNCTION
-- ============================================================================
-- Auto-confirms admin email without verification link

CREATE OR REPLACE FUNCTION public.auto_confirm_admin_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Auto-confirm if role is admin
    IF (NEW.raw_user_meta_data->>'role' = 'admin' OR 
        NEW.raw_user_meta_data->>'role' = 'Admin') THEN
        NEW.email_confirmed_at = NOW();
        NEW.confirmed_at = NOW();  -- For newer Supabase versions
    END IF;
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_confirm_admin ON auth.users;
CREATE TRIGGER trigger_auto_confirm_admin
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_admin_users();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get pending users count
CREATE OR REPLACE FUNCTION public.get_pending_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO count
    FROM public.users
    WHERE is_active = false;
    
    RETURN count;
END;
$$;

-- Function to approve user
CREATE OR REPLACE FUNCTION public.approve_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Create a default admin user (Password: Admin@123)
-- Run this only if you need a test admin account

/*
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    instance_id
) VALUES (
    'admin@faredeal.ug',
    crypt('Admin@123', gen_salt('bf')),
    NOW(),
    '{"role": "admin", "full_name": "System Admin"}'::jsonb,
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'
) ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Then create corresponding user record
INSERT INTO public.users (
    auth_id,
    email,
    full_name,
    role,
    is_active,
    employee_id
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@faredeal.ug'),
    'admin@faredeal.ug',
    'System Admin',
    'admin',
    true,
    'ADM-000001'
) ON CONFLICT (email) DO NOTHING;
*/

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime for the users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name = 'users';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'users';

-- Check policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'users';

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'users';

-- Check admin auto-confirm trigger on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_confirm_admin';

-- Count users by role
SELECT 
    role,
    is_active,
    COUNT(*) as count
FROM public.users
GROUP BY role, is_active
ORDER BY role, is_active;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FAREDEAL Authentication System Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables Created: public.users';
    RAISE NOTICE 'Indexes: 6 performance indexes';
    RAISE NOTICE 'RLS Policies: 6 security policies';
    RAISE NOTICE 'Functions: 3 helper functions';
    RAISE NOTICE 'Triggers: 2 (updated_at, admin_auto_confirm)';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Enabled:';
    RAISE NOTICE '✓ Multi-role authentication (Admin, Manager, Cashier, Employee, Supplier)';
    RAISE NOTICE '✓ Admin approval workflow (is_active flag)';
    RAISE NOTICE '✓ Admin auto-confirmation (no email verification)';
    RAISE NOTICE '✓ Real-time updates for user registrations';
    RAISE NOTICE '✓ Row Level Security enabled';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Run verification queries above to confirm setup';
    RAISE NOTICE '2. Test admin registration at /admin-auth';
    RAISE NOTICE '3. Test other role registrations';
    RAISE NOTICE '4. Verify real-time updates in Admin Portal';
    RAISE NOTICE '============================================';
END $$;
