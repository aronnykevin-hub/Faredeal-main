-- =========================================
-- RECOMMENDED: Soft Delete Solution for Suppliers
-- Run this in Supabase SQL Editor
-- =========================================

-- Instead of hard-deleting suppliers (which causes data integrity issues),
-- implement soft delete by marking them as inactive

-- Step 1: Add deleted_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Add is_deleted flag for quick filtering
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Step 3: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_users_deleted 
ON users(is_deleted) 
WHERE is_deleted = FALSE;

-- Step 4: Create a view for active suppliers only
CREATE OR REPLACE VIEW active_suppliers AS
SELECT *
FROM users
WHERE role = 'supplier' 
  AND is_deleted = FALSE;

-- Step 5: Create a function to soft delete suppliers
CREATE OR REPLACE FUNCTION soft_delete_supplier(supplier_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET 
    is_deleted = TRUE,
    deleted_at = NOW(),
    is_active = FALSE
  WHERE id = supplier_user_id
    AND role = 'supplier';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to restore deleted suppliers
CREATE OR REPLACE FUNCTION restore_supplier(supplier_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET 
    is_deleted = FALSE,
    deleted_at = NULL
  WHERE id = supplier_user_id
    AND role = 'supplier';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Usage Examples:
-- To soft delete a supplier:
-- SELECT soft_delete_supplier('supplier-uuid-here');

-- To restore a supplier:
-- SELECT restore_supplier('supplier-uuid-here');

-- To get active suppliers only:
-- SELECT * FROM active_suppliers;

-- To get all suppliers including deleted:
-- SELECT * FROM users WHERE role = 'supplier';

-- To permanently delete old soft-deleted suppliers (run periodically):
-- DELETE FROM users 
-- WHERE role = 'supplier' 
--   AND is_deleted = TRUE 
--   AND deleted_at < NOW() - INTERVAL '1 year';
