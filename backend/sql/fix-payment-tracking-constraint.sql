-- =============================================
-- FIX PAYMENT TRACKING FUNCTION
-- =============================================
-- Update record_payment_with_tracking to validate user ID
-- before inserting into payment_transactions
-- =============================================

CREATE OR REPLACE FUNCTION record_payment_with_tracking(
    p_order_id uuid,
    p_amount_paid numeric,
    p_payment_method text,
    p_payment_reference text DEFAULT NULL,
    p_payment_date timestamp with time zone DEFAULT NOW(),
    p_notes text DEFAULT NULL,
    p_paid_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_number text;
    v_payment_result jsonb;
    v_transaction_id uuid;
    v_valid_user_id uuid;
BEGIN
    -- Validate user ID exists in users table before using it
    IF p_paid_by IS NOT NULL THEN
        SELECT id INTO v_valid_user_id
        FROM users
        WHERE id = p_paid_by;
        
        -- If user doesn't exist, set to NULL
        IF v_valid_user_id IS NULL THEN
            RAISE WARNING 'User ID % does not exist in users table, setting recorded_by to NULL', p_paid_by;
        END IF;
    END IF;
    
    -- Generate unique transaction number
    v_transaction_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                            LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Record payment using existing function (which also validates user ID)
    v_payment_result := record_progressive_payment(
        p_order_id,
        p_amount_paid,
        p_payment_method,
        p_payment_reference,
        p_payment_date,
        p_notes,
        v_valid_user_id  -- Use validated user ID instead of p_paid_by
    );
    
    -- Log transaction with validated user ID (can be NULL)
    INSERT INTO payment_transactions (
        purchase_order_id,
        transaction_number,
        amount_ugx,
        payment_method,
        payment_reference,
        payment_date,
        notes,
        recorded_by,
        confirmed_by_supplier
    ) VALUES (
        p_order_id,
        v_transaction_number,
        p_amount_paid,
        p_payment_method,
        p_payment_reference,
        p_payment_date,
        p_notes,
        v_valid_user_id,  -- Use validated user ID (NULL if user doesn't exist)
        false
    ) RETURNING id INTO v_transaction_id;
    
    -- Return combined result
    RETURN jsonb_build_object(
        'success', (v_payment_result->>'success')::boolean,
        'transaction_id', v_transaction_id,
        'transaction_number', v_transaction_number,
        'payment_status', v_payment_result->>'payment_status',
        'total_paid', (v_payment_result->>'total_paid')::numeric,
        'balance_due', (v_payment_result->>'balance_due')::numeric,
        'payment_percentage', (v_payment_result->>'payment_percentage')::numeric,
        'message', 'Payment recorded. Awaiting supplier confirmation.',
        'needs_supplier_confirmation', true
    );
END;
$$;

COMMENT ON FUNCTION record_payment_with_tracking IS 'Record payment with transaction tracking - validates user ID before inserting';
