-- ============================================================================
-- APPROVE USER WITH EMAIL CONFIRMATION
-- ============================================================================
-- This updates the approve_user function to also confirm the email in auth.users
-- Required for users to login after admin approval
-- ============================================================================

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '✅  APPROVE USER FUNCTION UPDATED!';
    RAISE NOTICE '✅ ================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 WHAT CHANGED:';
    RAISE NOTICE '   ✓ approve_user() now confirms email in auth.users';
    RAISE NOTICE '   ✓ Sets email_confirmed_at timestamp';
    RAISE NOTICE '   ✓ Allows users to login after approval';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Go to Admin Portal';
    RAISE NOTICE '   2. Click "Approve" on pending user';
    RAISE NOTICE '   3. User can now login with username + password';
    RAISE NOTICE '';
END $$;
