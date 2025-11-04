-- =====================================================================
-- FIX FOREIGN KEY: Purchase Orders Supplier Reference
-- =====================================================================
-- This fixes the foreign key constraint to reference users table
-- instead of supplier_profiles table since suppliers are in users table
-- =====================================================================

-- Drop the existing foreign key constraint
ALTER TABLE purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;

-- Add new foreign key constraint referencing users table
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_supplier_id_fkey 
FOREIGN KEY (supplier_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Verify the constraint
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='purchase_orders'
AND kcu.column_name='supplier_id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint updated successfully!';
  RAISE NOTICE '🇺🇬 FAREDEAL Uganda - purchase_orders.supplier_id now references users(id)';
END $$;
