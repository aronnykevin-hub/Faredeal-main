-- =============================================
-- FIX ORDER HISTORY FOREIGN KEY CONSTRAINT
-- =============================================
-- Make changed_by nullable to avoid constraint issues
-- when user ID might not be available
-- Also add trigger to auto-log order creation
-- Fix all functions that insert into order_history
-- Fix payment_transactions recorded_by foreign key
-- =============================================

-- Drop the existing foreign key constraint on order_history
ALTER TABLE order_history 
DROP CONSTRAINT IF EXISTS order_history_changed_by_fkey;

-- Make changed_by nullable in order_history
ALTER TABLE order_history 
ALTER COLUMN changed_by DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE order_history
ADD CONSTRAINT order_history_changed_by_fkey 
FOREIGN KEY (changed_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Create an index on changed_by for better performance
CREATE INDEX IF NOT EXISTS idx_order_history_changed_by ON order_history(changed_by);

COMMENT ON COLUMN order_history.changed_by IS 'User ID who made the change - nullable to allow system-generated entries';

-- =============================================
-- Fix payment_transactions table constraints
-- =============================================
-- Drop the existing foreign key constraint on payment_transactions
ALTER TABLE payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_recorded_by_fkey;

-- Make recorded_by nullable in payment_transactions
ALTER TABLE payment_transactions 
ALTER COLUMN recorded_by DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE payment_transactions
ADD CONSTRAINT payment_transactions_recorded_by_fkey 
FOREIGN KEY (recorded_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Create an index on recorded_by for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_recorded_by ON payment_transactions(recorded_by);

COMMENT ON COLUMN payment_transactions.recorded_by IS 'User ID who recorded the payment - nullable to allow system-generated entries';

-- =============================================
-- Create trigger to auto-log order creation
-- =============================================
CREATE OR REPLACE FUNCTION log_purchase_order_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_changed_by uuid;
    v_manager_exists boolean;
BEGIN
    -- Try multiple approaches to find the user ID
    
    -- Approach 1: Check if manager_id field exists and has value
    BEGIN
        v_changed_by := NEW.manager_id;
    EXCEPTION WHEN undefined_column THEN
        v_changed_by := NULL;
    END;
    
    -- Approach 2: Try created_by if manager_id didn't work
    IF v_changed_by IS NULL THEN
        BEGIN
            v_changed_by := NEW.created_by;
        EXCEPTION WHEN undefined_column THEN
            v_changed_by := NULL;
        END;
    END IF;
    
    -- Approach 3: Try ordered_by if nothing else worked
    IF v_changed_by IS NULL THEN
        BEGIN
            v_changed_by := NEW.ordered_by;
        EXCEPTION WHEN undefined_column THEN
            v_changed_by := NULL;
        END;
    END IF;
    
    -- Approach 4: If we have a user ID, verify it exists in users table
    IF v_changed_by IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM users WHERE id = v_changed_by) INTO v_manager_exists;
        IF NOT v_manager_exists THEN
            -- ID doesn't exist in users table, set to NULL
            v_changed_by := NULL;
        END IF;
    END IF;
    
    -- Insert into order_history - v_changed_by can be NULL (it's now allowed)
    BEGIN
        INSERT INTO order_history (
            purchase_order_id,
            action,
            old_status,
            new_status,
            old_payment_status,
            new_payment_status,
            amount_paid_ugx,
            payment_method,
            notes,
            changed_by,
            metadata
        ) VALUES (
            NEW.id,
            'created',
            NULL,
            NEW.status,
            NULL,
            COALESCE(NEW.payment_status, 'unpaid'),
            COALESCE(NEW.amount_paid_ugx, 0),
            NEW.payment_method,
            NEW.notes,
            v_changed_by, -- Can be NULL if no valid manager found
            json_build_object(
                'total_amount', NEW.total_amount_ugx,
                'balance_due', COALESCE(NEW.balance_due_ugx, NEW.total_amount_ugx),
                'po_number', NEW.po_number,
                'priority', COALESCE(NEW.priority, 'normal'),
                'auto_logged', true
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- If insert fails for any reason, don't block the order creation
        RAISE WARNING 'Failed to log order creation in history: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_purchase_order_creation ON purchase_orders;

-- Create trigger for INSERT on purchase_orders
CREATE TRIGGER trigger_log_purchase_order_creation
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_purchase_order_creation();

COMMENT ON FUNCTION log_purchase_order_creation IS 'Automatically log when a purchase order is created';

-- =============================================
-- Fix record_progressive_payment function
-- =============================================
CREATE OR REPLACE FUNCTION record_progressive_payment(
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
    v_order record;
    v_new_total_paid numeric;
    v_new_balance numeric;
    v_new_status text;
    v_payment_percentage numeric;
    v_valid_user_id uuid;
BEGIN
    -- Get current order
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;
    
    -- Validate user ID exists in users table
    IF p_paid_by IS NOT NULL THEN
        SELECT id INTO v_valid_user_id
        FROM users
        WHERE id = p_paid_by;
    END IF;
    
    -- Calculate new values
    v_new_total_paid := COALESCE(v_order.amount_paid_ugx, 0) + p_amount_paid;
    v_new_balance := v_order.total_amount_ugx - v_new_total_paid;
    v_payment_percentage := (v_new_total_paid / v_order.total_amount_ugx * 100);
    
    -- Determine new status
    IF v_new_balance <= 0 THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        v_new_status := 'unpaid';
    END IF;
    
    -- Update order
    UPDATE purchase_orders
    SET 
        amount_paid_ugx = v_new_total_paid,
        balance_due_ugx = GREATEST(v_new_balance, 0),
        payment_status = v_new_status,
        last_payment_date = p_payment_date,
        payment_method = p_payment_method,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log in order history (use validated user ID or NULL)
    INSERT INTO order_history (
        purchase_order_id,
        action,
        old_payment_status,
        new_payment_status,
        notes,
        changed_by
    ) VALUES (
        p_order_id,
        'payment_recorded',
        v_order.payment_status,
        v_new_status,
        CONCAT('Payment: ', p_payment_method, ' - ', p_amount_paid::text, ' UGX', 
               CASE WHEN p_payment_reference IS NOT NULL THEN ' (Ref: ' || p_payment_reference || ')' ELSE '' END,
               CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END),
        v_valid_user_id -- Use validated user ID (can be NULL)
    );
    
    -- Update metrics if function exists
    BEGIN
        PERFORM update_payment_metrics(p_order_id);
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if function doesn't exist
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_status', v_new_status,
        'total_paid', v_new_total_paid,
        'balance_due', GREATEST(v_new_balance, 0),
        'payment_percentage', ROUND(v_payment_percentage, 2),
        'message', 'Payment recorded successfully'
    );
END;
$$;

-- =============================================
-- Fix supplier_confirm_payment function
-- =============================================
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
    v_all_confirmed boolean;
    v_valid_supplier_id uuid;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM payment_transactions
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;
    
    -- Verify supplier owns this order
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = v_transaction.purchase_order_id 
    AND supplier_id = p_supplier_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;
    
    -- Validate supplier ID exists in users table
    SELECT id INTO v_valid_supplier_id
    FROM users
    WHERE id = p_supplier_id;
    
    -- Update transaction confirmation
    UPDATE payment_transactions
    SET 
        confirmed_by_supplier = true,
        supplier_confirmed_at = NOW(),
        supplier_confirmed_by = p_supplier_id,
        supplier_confirmation_notes = p_confirmation_notes
    WHERE id = p_transaction_id;
    
    -- Check if all payments for this order are confirmed
    SELECT NOT EXISTS (
        SELECT 1 FROM payment_transactions
        WHERE purchase_order_id = v_transaction.purchase_order_id
        AND confirmed_by_supplier = false
    ) INTO v_all_confirmed;
    
    -- If all payments confirmed, update order
    IF v_all_confirmed THEN
        UPDATE purchase_orders
        SET 
            payment_confirmed_by_supplier = true,
            supplier_confirmation_date = NOW(),
            supplier_confirmation_notes = 'All payments confirmed'
        WHERE id = v_transaction.purchase_order_id;
    END IF;
    
    -- Log in order history (use validated supplier ID)
    INSERT INTO order_history (
        purchase_order_id,
        action,
        notes,
        changed_by
    ) VALUES (
        v_transaction.purchase_order_id,
        'payment_confirmed_by_supplier',
        COALESCE(p_confirmation_notes, 'Supplier confirmed payment receipt'),
        v_valid_supplier_id -- Use validated supplier ID
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_number', v_transaction.transaction_number,
        'amount_confirmed', v_transaction.amount_ugx,
        'all_payments_confirmed', v_all_confirmed,
        'message', 'Payment confirmed successfully'
    );
END;
$$;

