-- =============================================
-- FIX: PAYMENTS ONLY RECORDED AFTER SUPPLIER CONFIRMATION
-- =============================================
-- This script modifies the payment system so that:
-- 1. Manager submits payment → creates PENDING transaction
-- 2. Order balance does NOT change yet
-- 3. Supplier confirms payment → order balance updates
-- =============================================

-- Step 0: Add missing columns to payment_transactions table
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS confirmation_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS confirmation_notes text;

-- Step 1: Modify record_payment_with_tracking to NOT update order immediately
CREATE OR REPLACE FUNCTION record_payment_with_tracking(
    p_order_id uuid,
    p_amount_paid numeric,
    p_payment_method text,
    p_payment_reference text DEFAULT NULL,
    p_payment_date timestamp with time zone DEFAULT NOW(),
    p_notes text DEFAULT NULL,
    p_paid_by uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_number text;
    v_transaction_id uuid;
BEGIN
    -- Generate unique transaction number
    v_transaction_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                            LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Create PENDING payment transaction (do NOT update order balance yet)
    INSERT INTO payment_transactions (
        purchase_order_id,
        transaction_number,
        amount_ugx,
        payment_method,
        payment_reference,
        payment_date,
        notes,
        recorded_by,
        confirmed_by_supplier,
        confirmation_date
    ) VALUES (
        p_order_id,
        v_transaction_number,
        p_amount_paid,
        p_payment_method,
        p_payment_reference,
        p_payment_date,
        COALESCE(p_notes, '') || ' [PENDING SUPPLIER CONFIRMATION]',
        p_paid_by,
        false,  -- Not confirmed yet
        NULL    -- No confirmation date yet
    ) RETURNING id INTO v_transaction_id;
    
    -- Return transaction number (order balance NOT updated)
    RETURN v_transaction_number;
END;
$$;

-- Step 2: Modify supplier_confirm_payment to update order balance when confirmed
CREATE OR REPLACE FUNCTION supplier_confirm_payment(
    p_transaction_id uuid,
    p_supplier_id uuid,
    p_confirmation_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction record;
    v_order record;
    v_new_total_paid numeric;
    v_new_balance numeric;
    v_new_status text;
    v_payment_percentage numeric;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM payment_transactions
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;
    
    -- Check if already confirmed
    IF v_transaction.confirmed_by_supplier THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment already confirmed');
    END IF;
    
    -- Get order details
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = v_transaction.purchase_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    -- Verify supplier owns this order
    IF v_order.supplier_id != p_supplier_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Order belongs to different supplier');
    END IF;
    
    -- Calculate new payment totals
    v_new_total_paid := COALESCE(v_order.amount_paid_ugx, 0) + v_transaction.amount_ugx;
    v_new_balance := v_order.total_amount_ugx - v_new_total_paid;
    v_payment_percentage := (v_new_total_paid / v_order.total_amount_ugx * 100);
    
    -- Determine new payment status
    IF v_new_balance <= 0 THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        v_new_status := 'unpaid';
    END IF;
    
    -- Mark transaction as confirmed
    UPDATE payment_transactions
    SET 
        confirmed_by_supplier = true,
        confirmation_date = NOW(),
        confirmation_notes = p_confirmation_notes
    WHERE id = p_transaction_id;
    
    -- NOW update the order balance (after supplier confirmation)
    UPDATE purchase_orders
    SET 
        amount_paid_ugx = v_new_total_paid,
        balance_due_ugx = GREATEST(v_new_balance, 0),
        payment_status = v_new_status,
        last_payment_date = v_transaction.payment_date,
        payment_method = v_transaction.payment_method,
        updated_at = NOW()
    WHERE id = v_transaction.purchase_order_id;
    
    -- Update payment metrics
    PERFORM update_payment_metrics(v_transaction.purchase_order_id);
    
    -- Return success with details
    RETURN jsonb_build_object(
        'success', true,
        'transaction_number', v_transaction.transaction_number,
        'amount_confirmed', v_transaction.amount_ugx,
        'new_total_paid', v_new_total_paid,
        'new_balance', GREATEST(v_new_balance, 0),
        'payment_status', v_new_status,
        'payment_percentage', ROUND(v_payment_percentage, 2),
        'message', 'Payment confirmed successfully. Order balance updated.'
    );
END;
$$;

-- =============================================
-- INSTRUCTIONS:
-- =============================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Refresh your browser
-- 3. Test the flow:
--    a. Manager adds payment → creates PENDING transaction
--    b. Order balance does NOT change yet
--    c. Supplier confirms payment → order balance updates
-- =============================================
