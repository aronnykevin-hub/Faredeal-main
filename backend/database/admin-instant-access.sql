-- ============================================================================
-- ADMIN INSTANT ACCESS CONFIGURATION
-- ============================================================================
-- Purpose: Auto-confirm admin users for instant access
-- Other roles (Manager, Cashier, Supplier) require email verification
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. Done! Admins now have instant access
-- ============================================================================

-- Create function to auto-confirm admin users
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm ONLY if role is admin (case-insensitive)
  IF (LOWER(NEW.raw_user_meta_data->>'role') = 'admin') THEN
    NEW.email_confirmed_at = NOW();
    -- Note: confirmed_at is a generated column and will be set automatically
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_confirm_admin ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER trigger_auto_confirm_admin
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_admin_users();

-- Confirm any existing unconfirmed admin users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE LOWER(raw_user_meta_data->>'role') = 'admin'
  AND email_confirmed_at IS NULL;

-- ============================================================================
-- VERIFICATION (Optional - Run to verify setup)
-- ============================================================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_confirm_admin';

-- View all users and their confirmation status
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '⏳ Pending'
  END as status,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- ✅ Admin users will now have instant access (no email verification)
-- 📧 Manager, Cashier, Supplier users still require email verification
-- ============================================================================
