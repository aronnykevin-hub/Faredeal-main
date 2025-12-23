-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS record_payment_with_tracking(UUID, NUMERIC, VARCHAR, VARCHAR, TIMESTAMP, TEXT, UUID);
DROP FUNCTION IF EXISTS record_payment_with_tracking(UUID, NUMERIC, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, UUID);
DROP FUNCTION IF EXISTS record_payment_with_tracking(UUID, DECIMAL, VARCHAR, VARCHAR, TIMESTAMP WITH TIME ZONE, TEXT, UUID);

-- Create RPC function to record payment with tracking (single clean version)
CREATE OR REPLACE FUNCTION record_payment_with_tracking(
  p_order_id UUID,
  p_amount_paid NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_payment_date TIMESTAMP WITH TIME ZONE,
  p_notes TEXT,
  p_paid_by UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_transaction_number VARCHAR;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the user ID from the database
  SELECT id INTO v_user_id FROM users WHERE auth_id = p_paid_by LIMIT 1;
  
  -- If no user found by auth_id, use the provided ID directly
  IF v_user_id IS NULL THEN
    v_user_id := p_paid_by;
  END IF;
  
  -- Generate a unique transaction number
  v_transaction_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
  
  -- Insert the payment transaction
  INSERT INTO payment_transactions (
    purchase_order_id,
    user_id,
    amount_ugx,
    payment_method,
    payment_status,
    transaction_number,
    payment_reference,
    payment_date,
    recorded_by,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    v_user_id,
    p_amount_paid,
    p_payment_method,
    'pending',
    v_transaction_number,
    p_payment_reference,
    p_payment_date,
    v_user_id,
    p_notes,
    NOW(),
    NOW()
  ) RETURNING id INTO v_transaction_id;
  
  -- Return the transaction number
  RETURN v_transaction_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_payment_with_tracking(UUID, NUMERIC, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment_with_tracking(UUID, NUMERIC, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, UUID) TO service_role;
