-- =====================================================================
-- COMPLETE FIX: Add all missing columns to purchase_orders table
-- and create the supplier_confirm_payment RPC function
-- =====================================================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor, then click RUN
-- =====================================================================

-- STEP 1: Add missing columns to payment_transactions table
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;

-- STEP 2: Add missing columns to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- STEP 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_last_payment ON purchase_orders(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_next_payment ON purchase_orders(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_method ON purchase_orders(payment_method);

-- STEP 4: Create the supplier_confirm_payment RPC function
DROP FUNCTION IF EXISTS supplier_confirm_payment(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION supplier_confirm_payment(
  p_transaction_id UUID,
  p_supplier_id UUID,
  p_confirmation_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  transaction_id UUID,
  transaction_number VARCHAR,
  confirmation_status VARCHAR,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  message VARCHAR
) AS $$
DECLARE
  v_po_id UUID;
  v_supplier_check UUID;
  v_current_status VARCHAR;
BEGIN
  -- Verify transaction exists
  SELECT purchase_order_id, payment_status
  INTO v_po_id, v_current_status
  FROM payment_transactions
  WHERE id = p_transaction_id;

  IF v_po_id IS NULL THEN
    RETURN QUERY SELECT 
      p_transaction_id,
      NULL::VARCHAR,
      'error'::VARCHAR,
      NULL::TIMESTAMP WITH TIME ZONE,
      'Transaction not found'::VARCHAR;
    RETURN;
  END IF;

  -- Verify supplier owns this purchase order
  SELECT supplier_id
  INTO v_supplier_check
  FROM purchase_orders
  WHERE id = v_po_id;

  IF v_supplier_check != p_supplier_id THEN
    RETURN QUERY SELECT 
      p_transaction_id,
      NULL::VARCHAR,
      'error'::VARCHAR,
      NULL::TIMESTAMP WITH TIME ZONE,
      'You do not have permission to confirm this payment'::VARCHAR;
    RETURN;
  END IF;

  -- Update payment transaction with confirmation
  UPDATE payment_transactions
  SET 
    confirmed_by_supplier = TRUE,
    confirmation_date = NOW(),
    confirmation_notes = p_confirmation_notes,
    payment_status = 'confirmed',
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Return success response with updated data
  RETURN QUERY
  SELECT 
    pt.id as transaction_id,
    pt.transaction_number,
    pt.payment_status as confirmation_status,
    pt.confirmation_date,
    'Payment confirmed successfully'::VARCHAR as message
  FROM payment_transactions pt
  WHERE pt.id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION supplier_confirm_payment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION supplier_confirm_payment(UUID, UUID, TEXT) TO service_role;

-- =====================================================================
-- DEPLOYMENT COMPLETE
-- =====================================================================
-- All missing columns have been added and the RPC function is ready
-- The payment confirmation feature should now work without errors
-- =====================================================================
