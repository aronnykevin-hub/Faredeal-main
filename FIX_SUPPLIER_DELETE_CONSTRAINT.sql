-- =========================================
-- FIX: Supplier Deletion Constraint Issue
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run each step separately, one at a time!
-- =========================================

-- This fixes the error when trying to delete a supplier with purchase orders
-- The issue is that supplier_id has a NOT NULL constraint but the foreign key
-- tries to SET NULL on delete

-- STEP 1: Check current constraints (Run this first to see what exists)
-- Copy and run only this query first:
/*
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'purchase_orders'::regclass
AND conname LIKE '%supplier%';
*/

-- STEP 2: Drop the existing foreign key constraint
-- Run this query alone, wait for it to complete:
DO $$ 
BEGIN
    ALTER TABLE purchase_orders 
    DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
    RAISE NOTICE 'Foreign key constraint dropped successfully';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping constraint: %', SQLERRM;
END $$;

-- STEP 3: Make supplier_id nullable (allow NULL values)
-- Run this query alone, wait for it to complete:
DO $$ 
BEGIN
    ALTER TABLE purchase_orders 
    ALTER COLUMN supplier_id DROP NOT NULL;
    RAISE NOTICE 'supplier_id column is now nullable';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error making column nullable: %', SQLERRM;
END $$;

-- STEP 4: Recreate the foreign key with SET NULL
-- Run this query alone, wait for it to complete:
DO $$ 
BEGIN
    ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey 
    FOREIGN KEY (supplier_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key constraint added with ON DELETE SET NULL';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- STEP 5: Verify the fix (Run this to confirm everything worked)
-- Copy and run only this query:
/*
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'purchase_orders'::regclass
AND conname = 'purchase_orders_supplier_id_fkey';
*/

-- =========================================
-- TROUBLESHOOTING: If you still get deadlock errors
-- =========================================
-- Close all other Supabase SQL Editor tabs
-- Wait 30 seconds for any locks to clear
-- Then run the steps above one at a time

-- =========================================
-- ALTERNATIVE: Quick Fix in One Statement
-- =========================================
-- If the above steps don't work, try this single transaction:
-- (Close all other SQL editor tabs first!)
/*
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE purchase_orders ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL;
COMMIT;
*/
