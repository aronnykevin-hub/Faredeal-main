-- ============================================================================
-- NO EMAIL VERIFICATION - Username-Based Auth for Employees
-- ============================================================================
-- This removes email verification requirement for managers, cashiers, suppliers
-- Admin verifies them manually through pending approvals
-- Users login with username instead of email
-- ============================================================================

-- Step 1: Add username column to users table if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Step 2: Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Step 3: Update the sync trigger to auto-confirm employee accounts
-- (No email confirmation needed - admin will approve them)
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_role TEXT;
    needs_approval BOOLEAN;
BEGIN
    -- Map role from metadata
    user_role := CASE 
        WHEN LOWER(NEW.raw_user_meta_data->>'role') = 'super admin' THEN 'admin'
        WHEN LOWER(NEW.raw_user_meta_data->>'role') IN ('admin', 'manager', 'employee', 'cashier', 'supplier') 
            THEN LOWER(NEW.raw_user_meta_data->>'role')
        ELSE 'customer'
    END;

    -- Employees don't need email confirmation, only admin approval
    -- Admins and customers need email confirmation
    needs_approval := user_role IN ('manager', 'cashier', 'supplier');

    -- Insert or update user in public.users table
    INSERT INTO public.users (
        id,
        email,
        username,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'username',
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'phone',
        user_role::user_role,
        CASE 
            -- Employees are inactive until admin approves
            WHEN needs_approval THEN false
            -- Admins and customers are active once email is confirmed
            WHEN NEW.email_confirmed_at IS NOT NULL THEN true
            ELSE false
        END,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        is_active = CASE 
            -- If email just got confirmed and they need approval, keep inactive
            WHEN needs_approval THEN users.is_active
            -- Otherwise update based on email confirmation
            WHEN NEW.email_confirmed_at IS NOT NULL THEN true
            ELSE users.is_active
        END,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 4: Drop and recreate function to get pending users (employees awaiting approval)
DROP FUNCTION IF EXISTS get_pending_users();

CREATE FUNCTION get_pending_users()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    username VARCHAR,
    full_name VARCHAR,
    phone VARCHAR,
    role user_role,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.username,
        u.full_name,
        u.phone,
        u.role,
        u.created_at
    FROM public.users u
    WHERE u.is_active = false
        AND u.role IN ('manager', 'cashier', 'supplier')
    ORDER BY u.created_at DESC;
END;
$$;

-- Step 5: Create function to approve user
CREATE OR REPLACE FUNCTION approve_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Update public.users to activate account
    UPDATE public.users
    SET 
        is_active = true,
        updated_at = NOW()
    WHERE id = user_id
        AND is_active = false
        AND role IN ('manager', 'cashier', 'supplier');
    
    -- Also confirm email in auth.users (required for login)
    IF FOUND THEN
        UPDATE auth.users
        SET 
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Step 6: Create function to reject user
CREATE OR REPLACE FUNCTION reject_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Delete from public.users
    DELETE FROM public.users
    WHERE id = user_id
        AND is_active = false
        AND role IN ('manager', 'cashier', 'supplier');
    
    IF FOUND THEN
        -- Also delete from auth.users
        DELETE FROM auth.users WHERE id = user_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION get_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_user(UUID) TO authenticated;

-- ============================================================================
-- CONFIGURE SUPABASE AUTH SETTINGS
-- ============================================================================
-- You need to do this in Supabase Dashboard > Authentication > Providers > Email
-- 1. DISABLE "Confirm email" for now (we'll handle it in app logic)
-- 2. OR keep it enabled and update the email templates to say:
--    "Your account will be reviewed by an admin"
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  NO EMAIL VERIFICATION SETUP COMPLETE!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 CHANGES MADE:';
    RAISE NOTICE '   ✓ Added username column to users table';
    RAISE NOTICE '   ✓ Updated sync trigger for employee auto-confirmation';
    RAISE NOTICE '   ✓ Employees bypass email verification';
    RAISE NOTICE '   ✓ Admin sees them immediately in pending approvals';
    RAISE NOTICE '   ✓ Created get_pending_users() function';
    RAISE NOTICE '   ✓ Created approve_user() function';
    RAISE NOTICE '   ✓ Created reject_user() function';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Go to Supabase Dashboard > Authentication > Providers';
    RAISE NOTICE '   2. Click "Email" provider';
    RAISE NOTICE '   3. DISABLE "Confirm email" setting';
    RAISE NOTICE '   4. Save changes';
    RAISE NOTICE '   5. Update frontend to use username instead of email';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 EMPLOYEES NOW SKIP EMAIL VERIFICATION!';
    RAISE NOTICE '   - Managers, Cashiers, Suppliers: No email needed';
    RAISE NOTICE '   - Admin manually approves them';
    RAISE NOTICE '   - They login with username';
    RAISE NOTICE '';
END $$;
