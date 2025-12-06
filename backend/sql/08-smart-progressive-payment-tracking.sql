-- =============================================
-- SMART PROGRESSIVE PAYMENT TRACKING SYSTEM
-- =============================================
-- Features:
-- 1. Real supplier names from users table
-- 2. Progressive payment tracking with metrics
-- 3. Supplier approval for balance adjustments
-- 4. Payment installment tracking
-- 5. Dynamic payment reminders
-- =============================================

-- =============================================
-- 1. Add Payment Installment Tracking Table
-- =============================================
CREATE TABLE IF NOT EXISTS payment_installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    installment_number integer NOT NULL,
    amount_ugx numeric(15,2) NOT NULL,
    due_date timestamp with time zone NOT NULL,
    paid_date timestamp with time zone,
    paid_amount_ugx numeric(15,2) DEFAULT 0,
    payment_method text,
    payment_reference text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
    notes text,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_po_id ON payment_installments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON payment_installments(due_date);

-- =============================================
-- 2. Add Balance Adjustment Approval Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS balance_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    original_amount_ugx numeric(15,2) NOT NULL,
    adjusted_amount_ugx numeric(15,2) NOT NULL,
    adjustment_reason text,
    discount_percentage numeric(5,2),
    requested_by uuid REFERENCES users(id),
    requested_at timestamp with time zone DEFAULT NOW(),
    supplier_response text CHECK (supplier_response IN ('pending', 'accepted', 'rejected', 'counter_proposed')),
    supplier_response_at timestamp with time zone,
    supplier_notes text,
    counter_proposed_amount_ugx numeric(15,2),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_po_id ON balance_adjustments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON balance_adjustments(supplier_response);

-- =============================================
-- 3. Add Payment Metrics Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS payment_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE UNIQUE,
    total_amount_ugx numeric(15,2) NOT NULL,
    amount_paid_ugx numeric(15,2) DEFAULT 0,
    balance_due_ugx numeric(15,2) NOT NULL,
    payment_percentage numeric(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_amount_ugx > 0 THEN (amount_paid_ugx / total_amount_ugx * 100)
            ELSE 0
        END
    ) STORED,
    total_installments integer DEFAULT 1,
    paid_installments integer DEFAULT 0,
    overdue_installments integer DEFAULT 0,
    next_payment_due timestamp with time zone,
    days_until_next_payment integer,
    days_overdue integer DEFAULT 0,
    payment_velocity numeric(15,2), -- Average payment per day
    estimated_completion_date timestamp with time zone,
    last_updated timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_po_id ON payment_metrics(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_metrics_percentage ON payment_metrics(payment_percentage);
CREATE INDEX IF NOT EXISTS idx_metrics_overdue ON payment_metrics(overdue_installments);

-- =============================================
-- 4. Function to Get Full Supplier Info
-- =============================================
CREATE OR REPLACE FUNCTION get_supplier_name(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_supplier jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', u.id,
        'name', COALESCE(u.company_name, u.full_name, u.username),
        'company_name', u.company_name,
        'full_name', u.full_name,
        'email', u.email,
        'phone', u.phone,
        'avatar_url', u.avatar_url,
        'category', u.category,
        'is_active', u.is_active
    ) INTO v_supplier
    FROM users u
    WHERE u.id = p_supplier_id AND u.role = 'supplier';
    
    RETURN COALESCE(v_supplier, '{}'::jsonb);
END;
$$;

-- =============================================
-- 5. Function to Update Payment Metrics
-- =============================================
CREATE OR REPLACE FUNCTION update_payment_metrics(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_order record;
    v_installments record;
    v_days_overdue integer := 0;
    v_days_until_next integer;
BEGIN
    -- Get order details
    SELECT 
        id,
        total_amount_ugx,
        amount_paid_ugx,
        balance_due_ugx,
        next_payment_date,
        created_at
    INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id;
    
    -- Calculate installment stats
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
        MIN(due_date) FILTER (WHERE status = 'pending') as next_due
    INTO v_installments
    FROM payment_installments
    WHERE purchase_order_id = p_order_id;
    
    -- Calculate days overdue
    IF v_installments.overdue > 0 THEN
        SELECT MAX(EXTRACT(DAY FROM NOW() - due_date)::integer)
        INTO v_days_overdue
        FROM payment_installments
        WHERE purchase_order_id = p_order_id AND status = 'overdue';
    END IF;
    
    -- Calculate days until next payment
    IF v_installments.next_due IS NOT NULL THEN
        v_days_until_next := EXTRACT(DAY FROM v_installments.next_due - NOW())::integer;
    END IF;
    
    -- Upsert metrics
    INSERT INTO payment_metrics (
        purchase_order_id,
        total_amount_ugx,
        amount_paid_ugx,
        balance_due_ugx,
        total_installments,
        paid_installments,
        overdue_installments,
        next_payment_due,
        days_until_next_payment,
        days_overdue,
        payment_velocity,
        estimated_completion_date,
        last_updated
    ) VALUES (
        p_order_id,
        COALESCE(v_order.total_amount_ugx, 0),
        COALESCE(v_order.amount_paid_ugx, 0),
        COALESCE(v_order.balance_due_ugx, COALESCE(v_order.total_amount_ugx, 0) - COALESCE(v_order.amount_paid_ugx, 0)),
        COALESCE(v_installments.total, 1),
        COALESCE(v_installments.paid, 0),
        COALESCE(v_installments.overdue, 0),
        v_installments.next_due,
        v_days_until_next,
        v_days_overdue,
        CASE 
            WHEN COALESCE(v_order.amount_paid_ugx, 0) > 0 THEN 
                COALESCE(v_order.amount_paid_ugx, 0) / GREATEST(EXTRACT(DAY FROM NOW() - v_order.created_at), 1)
            ELSE 0
        END,
        CASE 
            WHEN COALESCE(v_order.amount_paid_ugx, 0) > 0 AND COALESCE(v_order.balance_due_ugx, 0) > 0 THEN
                NOW() + (INTERVAL '1 day' * (COALESCE(v_order.balance_due_ugx, 0) / (COALESCE(v_order.amount_paid_ugx, 0) / GREATEST(EXTRACT(DAY FROM NOW() - v_order.created_at), 1))))
            ELSE NULL
        END,
        NOW()
    )
    ON CONFLICT (purchase_order_id) 
    DO UPDATE SET
        total_amount_ugx = EXCLUDED.total_amount_ugx,
        amount_paid_ugx = EXCLUDED.amount_paid_ugx,
        balance_due_ugx = EXCLUDED.balance_due_ugx,
        total_installments = EXCLUDED.total_installments,
        paid_installments = EXCLUDED.paid_installments,
        overdue_installments = EXCLUDED.overdue_installments,
        next_payment_due = EXCLUDED.next_payment_due,
        days_until_next_payment = EXCLUDED.days_until_next_payment,
        days_overdue = EXCLUDED.days_overdue,
        payment_velocity = EXCLUDED.payment_velocity,
        estimated_completion_date = EXCLUDED.estimated_completion_date,
        last_updated = NOW();
END;
$$;

-- =============================================
-- 6. Trigger to Auto-Update Metrics
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_payment_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM update_payment_metrics(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_metrics_on_order_change ON purchase_orders;
CREATE TRIGGER update_metrics_on_order_change
AFTER INSERT OR UPDATE OF amount_paid_ugx, balance_due_ugx, payment_status
ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_payment_metrics();

-- =============================================
-- 7. Function to Record Progressive Payment
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
    
    -- Log in order history
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
        p_paid_by
    );
    
    -- Update metrics
    PERFORM update_payment_metrics(p_order_id);
    
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
-- 8. Function for Supplier to Accept/Reject Balance Adjustment
-- =============================================
CREATE OR REPLACE FUNCTION supplier_respond_to_adjustment(
    p_adjustment_id uuid,
    p_response text, -- 'accepted', 'rejected', 'counter_proposed'
    p_supplier_notes text DEFAULT NULL,
    p_counter_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_adjustment record;
    v_order_id uuid;
BEGIN
    -- Get adjustment details
    SELECT * INTO v_adjustment
    FROM balance_adjustments
    WHERE id = p_adjustment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Adjustment not found');
    END IF;
    
    -- Update adjustment
    UPDATE balance_adjustments
    SET 
        supplier_response = p_response,
        supplier_response_at = NOW(),
        supplier_notes = p_supplier_notes,
        counter_proposed_amount_ugx = p_counter_amount,
        status = CASE 
            WHEN p_response = 'accepted' THEN 'approved'
            WHEN p_response = 'rejected' THEN 'rejected'
            ELSE 'pending'
        END
    WHERE id = p_adjustment_id
    RETURNING purchase_order_id INTO v_order_id;
    
    -- If accepted, update the order total
    IF p_response = 'accepted' THEN
        UPDATE purchase_orders
        SET 
            total_amount_ugx = v_adjustment.adjusted_amount_ugx,
            balance_due_ugx = v_adjustment.adjusted_amount_ugx - COALESCE(amount_paid_ugx, 0)
        WHERE id = v_order_id;
        
        PERFORM update_payment_metrics(v_order_id);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'response', p_response,
        'message', 'Response recorded successfully'
    );
END;
$$;

-- =============================================
-- 9. Initialize Metrics for Existing Orders
-- =============================================
INSERT INTO payment_metrics (
    purchase_order_id,
    total_amount_ugx,
    amount_paid_ugx,
    balance_due_ugx
)
SELECT 
    id,
    total_amount_ugx,
    COALESCE(amount_paid_ugx, 0),
    COALESCE(balance_due_ugx, total_amount_ugx)
FROM purchase_orders
WHERE id NOT IN (SELECT purchase_order_id FROM payment_metrics)
ON CONFLICT (purchase_order_id) DO NOTHING;

-- =============================================
-- 10. Add Supplier Payment Confirmation Tracking
-- =============================================

-- Add columns to purchase_orders for supplier confirmation
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_confirmed_by_supplier boolean DEFAULT false;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS supplier_confirmation_date timestamp with time zone;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS supplier_confirmation_notes text;

-- Create payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    transaction_number text UNIQUE NOT NULL,
    amount_ugx numeric(15,2) NOT NULL,
    payment_method text NOT NULL,
    payment_reference text,
    payment_date timestamp with time zone DEFAULT NOW(),
    notes text,
    recorded_by uuid REFERENCES users(id),
    recorded_at timestamp with time zone DEFAULT NOW(),
    -- Supplier confirmation
    confirmed_by_supplier boolean DEFAULT false,
    supplier_confirmed_at timestamp with time zone,
    supplier_confirmed_by uuid REFERENCES users(id),
    supplier_confirmation_notes text,
    -- Metadata
    metadata jsonb,
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_po_id ON payment_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_number ON payment_transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON payment_transactions(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_confirmed ON payment_transactions(confirmed_by_supplier);

-- =============================================
-- 11. Function to Record Payment with Transaction Log
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
BEGIN
    -- Generate unique transaction number
    v_transaction_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                            LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Record payment using existing function
    v_payment_result := record_progressive_payment(
        p_order_id,
        p_amount_paid,
        p_payment_method,
        p_payment_reference,
        p_payment_date,
        p_notes,
        p_paid_by
    );
    
    -- Log transaction
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
        p_paid_by,
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

-- =============================================
-- 12. Function for Supplier to Confirm Payment Receipt
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
    
    -- Log in order history
    INSERT INTO order_history (
        purchase_order_id,
        action,
        notes,
        changed_by
    ) VALUES (
        v_transaction.purchase_order_id,
        'payment_confirmed_by_supplier',
        COALESCE(p_confirmation_notes, 'Supplier confirmed payment receipt'),
        p_supplier_id
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

-- =============================================
-- 13. Function to Get Pending Confirmations for Supplier
-- =============================================
CREATE OR REPLACE FUNCTION get_pending_payment_confirmations(p_supplier_id uuid)
RETURNS TABLE (
    transaction_id uuid,
    transaction_number text,
    order_id uuid,
    po_number text,
    amount_paid numeric,
    payment_method text,
    payment_date timestamp with time zone,
    payment_reference text,
    notes text,
    paid_by_name text,
    paid_by_email text,
    created_at timestamp with time zone,
    days_pending integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id AS transaction_id,
        pt.transaction_number,
        pt.purchase_order_id AS order_id,
        po.po_number,
        pt.amount_ugx AS amount_paid,
        pt.payment_method,
        pt.payment_date,
        pt.payment_reference,
        pt.notes,
        COALESCE(u.full_name, u.username, 'Manager')::text AS paid_by_name,
        u.email AS paid_by_email,
        pt.created_at,
        EXTRACT(DAY FROM NOW() - pt.payment_date)::integer AS days_pending
    FROM payment_transactions pt
    JOIN purchase_orders po ON po.id = pt.purchase_order_id
    LEFT JOIN users u ON u.id = pt.recorded_by
    WHERE po.supplier_id = p_supplier_id
    AND pt.confirmed_by_supplier = false
    ORDER BY pt.payment_date DESC;
END;
$$;

-- =============================================
-- COMPLETED! 
-- =============================================
-- Features:
-- 1. Manager can record payments with amount input
-- 2. Supplier can confirm payment receipt
-- 3. Track all payment transactions
-- 4. Auto-update metrics on payment
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Smart Progressive Payment Tracking System Installed!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Features Added:';
    RAISE NOTICE '   - Real supplier names from users table';
    RAISE NOTICE '   - Progressive payment installments';
    RAISE NOTICE '   - Payment metrics & analytics';
    RAISE NOTICE '   - Supplier approval for discounts';
    RAISE NOTICE '   - Auto-updating payment tracking';
    RAISE NOTICE '   ✨ Manager payment recording interface';
    RAISE NOTICE '   ✨ Supplier payment confirmation system';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Tables Created:';
    RAISE NOTICE '   - payment_installments';
    RAISE NOTICE '   - balance_adjustments';
    RAISE NOTICE '   - payment_metrics';
    RAISE NOTICE '   - payment_transactions (NEW)';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Functions Available:';
    RAISE NOTICE '   - get_supplier_name(supplier_id)';
    RAISE NOTICE '   - update_payment_metrics(order_id)';
    RAISE NOTICE '   - record_progressive_payment(...)';
    RAISE NOTICE '   - record_payment_with_tracking(...) (NEW)';
    RAISE NOTICE '   - supplier_confirm_payment(...) (NEW)';
    RAISE NOTICE '   - get_pending_payment_confirmations(supplier_id) (NEW)';
    RAISE NOTICE '   - supplier_respond_to_adjustment(...)';
END $$;
