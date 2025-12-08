-- =====================================================================
-- DELETE ALL ORDERS FROM DATABASE (COMPLETE CLEANUP)
-- =====================================================================
-- Run this in Supabase SQL Editor when you've deleted users
-- and want to start fresh with empty database
-- WARNING: This will permanently delete ALL orders and related data!
-- =====================================================================

-- STEP 1: Show all orders that will be deleted (run this first to verify)
SELECT 
    po_number,
    order_date,
    status,
    total_amount_ugx,
    payment_status,
    supplier_id
FROM purchase_orders
ORDER BY order_date DESC;

-- STEP 2: Delete ALL orders and payment data (run after verifying above)
-- Delete payment transactions first (foreign key constraint)
DELETE FROM payment_transactions;

-- Delete payment installments
DELETE FROM payment_installments;

-- Delete payment metrics
DELETE FROM payment_metrics;

-- Delete ALL purchase orders
DELETE FROM purchase_orders;

-- STEP 3: Verify everything is deleted
SELECT 
    (SELECT COUNT(*) FROM purchase_orders) as orders,
    (SELECT COUNT(*) FROM payment_transactions) as transactions,
    (SELECT COUNT(*) FROM payment_installments) as installments,
    (SELECT COUNT(*) FROM payment_metrics) as metrics;

-- =====================================================================
-- NOW YOUR DATABASE IS CLEAN!
-- =====================================================================
-- After running the above:
-- 1. Sign in with NEW manager account
-- 2. Sign in with NEW supplier account  
-- 3. Create a new order from manager portal
-- 4. The supplier will see it in their portal
-- =====================================================================
