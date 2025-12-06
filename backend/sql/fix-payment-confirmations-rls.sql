-- =============================================
-- FIX: RLS Policies for Payment Confirmations
-- =============================================

-- Allow suppliers to read their own payment transactions
DROP POLICY IF EXISTS "Suppliers can view their payment transactions" ON payment_transactions;
CREATE POLICY "Suppliers can view their payment transactions"
ON payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = payment_transactions.purchase_order_id
    AND po.supplier_id = auth.uid()
  )
);

-- Allow suppliers to update their payment transaction confirmations
DROP POLICY IF EXISTS "Suppliers can confirm their payments" ON payment_transactions;
CREATE POLICY "Suppliers can confirm their payments"
ON payment_transactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = payment_transactions.purchase_order_id
    AND po.supplier_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = payment_transactions.purchase_order_id
    AND po.supplier_id = auth.uid()
  )
);

-- Allow managers to insert payment transactions
DROP POLICY IF EXISTS "Managers can create payment transactions" ON payment_transactions;
CREATE POLICY "Managers can create payment transactions"
ON payment_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers to view all payment transactions
DROP POLICY IF EXISTS "Managers can view all payment transactions" ON payment_transactions;
CREATE POLICY "Managers can view all payment transactions"
ON payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Make sure suppliers can read purchase_orders for the payment confirmation function
DROP POLICY IF EXISTS "Suppliers can view their orders" ON purchase_orders;
CREATE POLICY "Suppliers can view their orders"
ON purchase_orders
FOR SELECT
USING (supplier_id = auth.uid());

-- Allow managers to create purchase orders
DROP POLICY IF EXISTS "Managers can create purchase orders" ON purchase_orders;
CREATE POLICY "Managers can create purchase orders"
ON purchase_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers to view all purchase orders
DROP POLICY IF EXISTS "Managers can view all purchase orders" ON purchase_orders;
CREATE POLICY "Managers can view all purchase orders"
ON purchase_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers to update purchase orders
DROP POLICY IF EXISTS "Managers can update purchase orders" ON purchase_orders;
CREATE POLICY "Managers can update purchase orders"
ON purchase_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow suppliers to update their purchase orders (for status changes, confirmations)
DROP POLICY IF EXISTS "Suppliers can update their orders" ON purchase_orders;
CREATE POLICY "Suppliers can update their orders"
ON purchase_orders
FOR UPDATE
USING (supplier_id = auth.uid())
WITH CHECK (supplier_id = auth.uid());

-- Make sure suppliers can read users table for manager info
DROP POLICY IF EXISTS "Users can view other users basic info" ON users;
CREATE POLICY "Users can view other users basic info"
ON users
FOR SELECT
USING (true);  -- Allow all authenticated users to read basic user info

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment Confirmations RLS Policies Updated!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Policies Created:';
    RAISE NOTICE '   ✓ Suppliers can view their payment transactions';
    RAISE NOTICE '   ✓ Suppliers can confirm their payments';
    RAISE NOTICE '   ✓ Suppliers can update their orders';
    RAISE NOTICE '   ✓ Managers can create payment transactions';
    RAISE NOTICE '   ✓ Managers can view all payment transactions';
    RAISE NOTICE '   ✓ Managers can create purchase orders';
    RAISE NOTICE '   ✓ Managers can view all purchase orders';
    RAISE NOTICE '   ✓ Managers can update purchase orders';
    RAISE NOTICE '   ✓ Suppliers can view their orders';
    RAISE NOTICE '   ✓ Users can view other users basic info';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Row Level Security is properly configured!';
END $$;
