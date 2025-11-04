-- ============================================================================
-- FAREDEAL AUTHENTICATION SYSTEM - Clean Deployment Script
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor and click RUN
-- Safe to run multiple times - Uses proper DROP/CREATE pattern
-- Built: October 10, 2025
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: CREATE ENUM TYPE (Safe - handles if exists)
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin',
            'manager',
            'cashier',
            'employee',
            'supplier',
            'customer'
        );
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE USERS TABLE
-- ============================================================================

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
    is_active BOOLEAN DEFAULT FALSE,
    
    -- Employee specific fields
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    
    -- Additional metadata (JSON for flexibility)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: DROP EXISTING POLICIES (Clean slate)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Anyone can register" ON public.users;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid() = auth_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
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
CREATE POLICY "Admins can update all users" ON public.users
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
CREATE POLICY "Admins can delete users" ON public.users
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
CREATE POLICY "Anyone can register" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- STEP 7: CREATE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- STEP 8: CREATE TRIGGERS
-- ============================================================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at();

-- ============================================================================
-- STEP 9: ADMIN AUTO-CONFIRM SETUP
-- ============================================================================

-- Function to auto-confirm admin users
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (NEW.raw_user_meta_data->>'role' = 'admin' OR 
        NEW.raw_user_meta_data->>'role' = 'Admin') THEN
        NEW.email_confirmed_at = NOW();
        NEW.confirmed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger for admin auto-confirm
DROP TRIGGER IF EXISTS trigger_auto_confirm_admin ON auth.users;
CREATE TRIGGER trigger_auto_confirm_admin
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_admin_users();

-- ============================================================================
-- STEP 10: ENABLE REALTIME
-- ============================================================================

-- Enable realtime for the users table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- VERIFICATION - Run these to confirm setup
-- ============================================================================

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Check policies
SELECT 
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'users';

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'users'
UNION
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_confirm_admin';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ FAREDEAL Authentication System Deployed!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database Objects Created:';
    RAISE NOTICE '✓ Table: public.users';
    RAISE NOTICE '✓ Indexes: 6 performance indexes';
    RAISE NOTICE '✓ RLS Policies: 6 security policies';
    RAISE NOTICE '✓ Functions: 3 helper functions';
    RAISE NOTICE '✓ Triggers: 2 (updated_at, admin_auto_confirm)';
    RAISE NOTICE '✓ Realtime: Enabled for users table';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '• Multi-role auth (Admin, Manager, Cashier, Employee, Supplier)';
    RAISE NOTICE '• Admin approval workflow (is_active flag)';
    RAISE NOTICE '• Admin auto-confirmation (no email verification)';
    RAISE NOTICE '• Real-time user registration updates';
    RAISE NOTICE '• Row Level Security enabled';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test admin signup at /admin-auth';
    RAISE NOTICE '2. Test other role signups (Manager, Cashier, etc)';
    RAISE NOTICE '3. Check Admin Portal User Management for real-time updates';
    RAISE NOTICE '4. Verify roles can login after admin approval';
    RAISE NOTICE '============================================';
END $$;
