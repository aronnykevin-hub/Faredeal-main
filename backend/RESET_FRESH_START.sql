-- =====================================================================
-- FRESH START RESET - DELETE ALL TRANSACTIONS AND ORDERS
-- =====================================================================
-- WARNING: This will permanently delete all orders and payment data
-- Use only for testing/resetting the system
-- =====================================================================

-- Step 1: Delete all payment confirmations (if table exists)
DELETE FROM public.payment_confirmations
WHERE id IS NOT NULL;

-- Step 2: Delete all payment transactions
DELETE FROM public.payment_transactions
WHERE id IS NOT NULL;

-- Step 3: Delete all purchase orders
DELETE FROM public.purchase_orders
WHERE id IS NOT NULL;

-- Step 4: Reset inventory to zero (optional - uncomment if needed)
-- UPDATE public.inventory
-- SET current_stock = 0,
--     reserved_stock = 0,
--     last_stocktake_date = NOW()
-- WHERE id IS NOT NULL;

-- Step 5: Verify deletions
SELECT 'Purchase Orders' as table_name, COUNT(*) as remaining_records FROM public.purchase_orders
UNION ALL
SELECT 'Payment Transactions', COUNT(*) FROM public.payment_transactions;

-- System is now fresh! ✅
