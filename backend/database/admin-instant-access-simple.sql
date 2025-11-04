-- ============================================================================
-- ADMIN INSTANT ACCESS - Simplified Configuration
-- ============================================================================
-- This configuration provides INSTANT ACCESS for Admin users only
-- Other roles (Manager, Cashier, Supplier) still require email verification
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Create function to auto-confirm ONLY admin users
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm ONLY if role is admin (case-insensitive)
  -- Other roles (manager, cashier, supplier) will require email verification
  IF (LOWER(NEW.raw_user_meta_data->>'role') = 'admin') THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
    -- Log that this admin was auto-confirmed
    RAISE NOTICE 'Admin user auto-confirmed: %', NEW.email;
  ELSE
    -- Log that other roles need verification
    RAISE NOTICE 'User % with role % requires email verification', 
                  NEW.email, 
                  NEW.raw_user_meta_data->>'role';
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_confirm_admin ON auth.users;

-- Step 3: Create trigger
CREATE TRIGGER trigger_auto_confirm_admin
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_admin_users();

-- Step 4: Manually confirm any existing unconfirmed admin users
-- (Run this as a separate query if needed)
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE LOWER(raw_user_meta_data->>'role') = 'admin'
  AND email_confirmed_at IS NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if trigger was created successfully
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_confirm_admin';

-- Check all users and their confirmation status
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '⏳ Pending Verification'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- Role-Based Access Summary
-- ============================================================================
-- 
-- ✅ ADMIN: Instant access (auto-confirmed)
--    - No email verification required
--    - Can login immediately after signup
-- 
-- 📧 MANAGER: Requires email verification
--    - Must click email confirmation link
--    - Then requires admin approval
-- 
-- 📧 CASHIER: Requires email verification
--    - Must click email confirmation link  
--    - Then requires admin/manager approval
-- 
-- 📧 SUPPLIER: Requires email verification
--    - Must click email confirmation link
--    - Then requires admin approval
-- 
-- ============================================================================
-- Success!
-- ============================================================================
-- If you see the trigger listed above, the setup is complete!
-- New admin signups will be automatically confirmed with instant access.
-- Other roles will receive email verification links as expected.
-- ============================================================================
