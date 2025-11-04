-- =============================================
-- ENHANCED ORDER & PAYMENT TRACKING SYSTEM
-- =============================================
-- Adds comprehensive order history and payment tracking
-- Dynamic payment states: unpaid, partially_paid, paid
-- Complete audit trail for all order changes
-- =============================================

-- =============================================
-- 1. Create Order History Table
-- =============================================
CREATE TABLE IF NOT EXISTS order_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'created', 'approved', 'sent', 'received', 'payment_updated', 'completed', 'cancelled'
    old_status text,
    new_status text,
    old_payment_status text,
    new_payment_status text,
    amount_paid_ugx numeric(15,2),
    payment_method text, -- 'cash', 'mobile_money', 'bank_transfer', 'check', 'credit'
    payment_date timestamp with time zone, -- When the payment was made
    next_payment_due date, -- When next payment is expected
    notes text,
    changed_by uuid REFERENCES users(id),
    changed_at timestamp with time zone DEFAULT NOW(),
    metadata jsonb -- For additional flexible data
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_history_po_id ON order_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_changed_at ON order_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_action ON order_history(action);

-- =============================================
-- 2. Add Payment Tracking Columns to Purchase Orders
-- =============================================
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'refunded'));

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS amount_paid_ugx numeric(15,2) DEFAULT 0;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS balance_due_ugx numeric(15,2);

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_notes text;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_due_date timestamp with time zone;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_terms text; -- '7 days', '30 days', 'immediate', etc

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS next_payment_date timestamp with time zone;

-- =============================================
-- 3. Drop existing function if it exists with different signature
-- =============================================
DROP FUNCTION IF EXISTS update_order_payment(uuid, numeric, text, text, uuid);
DROP FUNCTION IF EXISTS update_order_payment(uuid, numeric, text, timestamp with time zone, date, text, uuid);

-- =============================================
-- 3. Function to Update Payment Status
-- =============================================
CREATE OR REPLACE FUNCTION update_order_payment(
    p_order_id uuid,
    p_amount_paid numeric,
    p_payment_method text,
    p_payment_date timestamp with time zone DEFAULT NOW(),
    p_next_payment_date date DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_changed_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order record;
    v_new_payment_status text;
    v_total_paid numeric;
    v_balance_due numeric;
BEGIN
    -- Get current order details
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id;
    
    IF v_order.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;
    
    -- Calculate new total paid
    v_total_paid := COALESCE(v_order.amount_paid_ugx, 0) + p_amount_paid;
    v_balance_due := v_order.total_amount_ugx - v_total_paid;
    
    -- Determine new payment status
    IF v_total_paid >= v_order.total_amount_ugx THEN
        v_new_payment_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_payment_status := 'partially_paid';
    ELSE
        v_new_payment_status := 'unpaid';
    END IF;
    
    -- Update purchase order
    UPDATE purchase_orders
    SET 
        amount_paid_ugx = v_total_paid,
        balance_due_ugx = v_balance_due,
        payment_status = v_new_payment_status,
        last_payment_date = p_payment_date,
        next_payment_date = p_next_payment_date,
        payment_method = p_payment_method,
        payment_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log in order history
    INSERT INTO order_history (
        purchase_order_id,
        action,
        old_status,
        new_status,
        old_payment_status,
        new_payment_status,
        amount_paid_ugx,
        payment_method,
        payment_date,
        next_payment_due,
        notes,
        changed_by,
        metadata
    ) VALUES (
        p_order_id,
        'payment_updated',
        v_order.status,
        v_order.status,
        v_order.payment_status,
        v_new_payment_status,
        p_amount_paid,
        p_payment_method,
        p_payment_date,
        p_next_payment_date,
        p_notes,
        p_changed_by,
        json_build_object(
            'total_paid', v_total_paid,
            'balance_due', v_balance_due,
            'total_amount', v_order.total_amount_ugx,
            'payment_number', COALESCE(v_order.installment_count, 0) + 1
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'payment_status', v_new_payment_status,
        'amount_paid', v_total_paid,
        'balance_due', v_balance_due,
        'next_payment_date', p_next_payment_date,
        'message', 'Payment recorded - UGX ' || p_amount_paid || ' paid. Balance: UGX ' || v_balance_due
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =============================================
-- 4. Drop existing function if it exists with different signature
-- =============================================
DROP FUNCTION IF EXISTS approve_order_with_payment(uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS approve_order_with_payment(uuid, uuid, numeric, text, timestamp with time zone, date, text);

-- =============================================
-- 4. Function to Approve Order with Payment
-- =============================================
CREATE OR REPLACE FUNCTION approve_order_with_payment(
    p_order_id uuid,
    p_approved_by uuid,
    p_initial_payment numeric DEFAULT 0,
    p_payment_method text DEFAULT NULL,
    p_payment_date timestamp with time zone DEFAULT NOW(),
    p_next_payment_date date DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order record;
    v_payment_status text;
    v_balance_due numeric;
BEGIN
    -- Get order
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id;
    
    IF v_order.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    v_balance_due := v_order.total_amount_ugx - p_initial_payment;
    
    -- Determine payment status
    IF p_initial_payment >= v_order.total_amount_ugx THEN
        v_payment_status := 'paid';
    ELSIF p_initial_payment > 0 THEN
        v_payment_status := 'partially_paid';
    ELSE
        v_payment_status := 'unpaid';
    END IF;
    
    -- Update order
    UPDATE purchase_orders
    SET 
        status = 'approved',
        approved_by = p_approved_by,
        approved_at = NOW(),
        amount_paid_ugx = p_initial_payment,
        balance_due_ugx = v_balance_due,
        payment_status = v_payment_status,
        last_payment_date = CASE WHEN p_initial_payment > 0 THEN p_payment_date ELSE NULL END,
        next_payment_date = p_next_payment_date,
        payment_method = p_payment_method,
        payment_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log in history
    INSERT INTO order_history (
        purchase_order_id,
        action,
        old_status,
        new_status,
        old_payment_status,
        new_payment_status,
        amount_paid_ugx,
        payment_method,
        payment_date,
        next_payment_due,
        notes,
        changed_by,
        metadata
    ) VALUES (
        p_order_id,
        'approved',
        v_order.status,
        'approved',
        COALESCE(v_order.payment_status, 'unpaid'),
        v_payment_status,
        p_initial_payment,
        p_payment_method,
        p_payment_date,
        p_next_payment_date,
        p_notes,
        p_approved_by,
        json_build_object(
            'total_amount', v_order.total_amount_ugx,
            'initial_payment', p_initial_payment,
            'balance_due', v_balance_due,
            'payment_date', p_payment_date,
            'next_payment_date', p_next_payment_date
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'approved',
        'payment_status', v_payment_status,
        'balance_due', v_balance_due,
        'next_payment_date', p_next_payment_date,
        'message', CASE 
            WHEN p_initial_payment = 0 THEN 'Order approved - No payment recorded'
            WHEN v_payment_status = 'paid' THEN 'Order approved and FULLY PAID!'
            ELSE 'Order approved - UGX ' || p_initial_payment || ' paid. Balance: UGX ' || v_balance_due
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 5. Function to Adjust Balance (Discount/Reduction)
-- =============================================
CREATE OR REPLACE FUNCTION adjust_order_balance(
    p_order_id uuid,
    p_new_total_amount numeric,
    p_adjustment_reason text,
    p_adjusted_by uuid,
    p_requires_supplier_acceptance boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order record;
    v_old_total numeric;
    v_adjustment_amount numeric;
    v_new_balance numeric;
    v_new_status text;
BEGIN
    -- Get order
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id;
    
    IF v_order.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    v_old_total := v_order.total_amount_ugx;
    v_adjustment_amount := v_old_total - p_new_total_amount;
    v_new_balance := p_new_total_amount - COALESCE(v_order.amount_paid_ugx, 0);
    
    -- Recalculate payment status
    IF COALESCE(v_order.amount_paid_ugx, 0) >= p_new_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_order.amount_paid_ugx > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        v_new_status := 'unpaid';
    END IF;
    
    -- Update order (mark as needing acceptance if required)
    UPDATE purchase_orders
    SET 
        total_amount_ugx = p_new_total_amount,
        balance_due_ugx = v_new_balance,
        payment_status = v_new_status,
        -- If supplier acceptance needed, mark in metadata
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log in history
    INSERT INTO order_history (
        purchase_order_id,
        action,
        old_status,
        new_status,
        old_payment_status,
        new_payment_status,
        amount_paid_ugx,
        notes,
        changed_by,
        metadata
    ) VALUES (
        p_order_id,
        'balance_adjusted',
        v_order.status,
        v_order.status,
        v_order.payment_status,
        v_new_status,
        0,
        p_adjustment_reason,
        p_adjusted_by,
        json_build_object(
            'old_total', v_old_total,
            'new_total', p_new_total_amount,
            'adjustment_amount', v_adjustment_amount,
            'adjustment_type', CASE WHEN v_adjustment_amount > 0 THEN 'discount' ELSE 'increase' END,
            'new_balance', v_new_balance,
            'requires_acceptance', p_requires_supplier_acceptance,
            'accepted', false
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'old_total', v_old_total,
        'new_total', p_new_total_amount,
        'adjustment', v_adjustment_amount,
        'new_balance', v_new_balance,
        'payment_status', v_new_status,
        'requires_supplier_acceptance', p_requires_supplier_acceptance,
        'message', CASE 
            WHEN v_adjustment_amount > 0 THEN 'Discount of UGX ' || v_adjustment_amount || ' applied'
            ELSE 'Amount increased by UGX ' || ABS(v_adjustment_amount)
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 6. Function for Supplier to Accept Balance Adjustment
-- =============================================
CREATE OR REPLACE FUNCTION supplier_accept_adjustment(
    p_order_id uuid,
    p_supplier_id uuid,
    p_acceptance_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order record;
    v_history_id uuid;
BEGIN
    -- Verify order belongs to supplier
    SELECT * INTO v_order
    FROM purchase_orders
    WHERE id = p_order_id AND supplier_id = p_supplier_id;
    
    IF v_order.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Order not found or access denied');
    END IF;
    
    -- Find the latest balance adjustment in history
    SELECT id INTO v_history_id
    FROM order_history
    WHERE purchase_order_id = p_order_id 
    AND action = 'balance_adjusted'
    AND (metadata->>'accepted')::boolean = false
    ORDER BY changed_at DESC
    LIMIT 1;
    
    IF v_history_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No pending adjustment found');
    END IF;
    
    -- Mark adjustment as accepted
    UPDATE order_history
    SET metadata = jsonb_set(metadata, '{accepted}', 'true'::jsonb)
    WHERE id = v_history_id;
    
    -- Log acceptance
    INSERT INTO order_history (
        purchase_order_id,
        action,
        old_status,
        new_status,
        notes,
        changed_by,
        metadata
    ) VALUES (
        p_order_id,
        'adjustment_accepted',
        v_order.status,
        v_order.status,
        p_acceptance_notes,
        p_supplier_id,
        json_build_object(
            'adjustment_history_id', v_history_id,
            'accepted_at', NOW()
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Balance adjustment accepted successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 7. Function to Get Order History
-- =============================================
CREATE OR REPLACE FUNCTION get_order_history(p_order_id uuid)
RETURNS TABLE (
    id uuid,
    action text,
    old_status text,
    new_status text,
    old_payment_status text,
    new_payment_status text,
    amount_paid_ugx numeric,
    payment_method text,
    notes text,
    changed_by_name text,
    changed_by_email text,
    changed_at timestamp with time zone,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oh.id,
        oh.action,
        oh.old_status,
        oh.new_status,
        oh.old_payment_status,
        oh.new_payment_status,
        oh.amount_paid_ugx,
        oh.payment_method,
        oh.notes,
        u.full_name as changed_by_name,
        u.email as changed_by_email,
        oh.changed_at,
        oh.metadata
    FROM order_history oh
    LEFT JOIN users u ON oh.changed_by = u.id
    WHERE oh.purchase_order_id = p_order_id
    ORDER BY oh.changed_at DESC;
END;
$$;

-- =============================================
-- 8. Grant Permissions
-- =============================================
GRANT ALL ON order_history TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION approve_order_with_payment TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_order_balance TO authenticated;
GRANT EXECUTE ON FUNCTION supplier_accept_adjustment TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_history TO authenticated;

-- =============================================
-- 9. Enable RLS on order_history
-- =============================================
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated_users_view_history" ON order_history;
DROP POLICY IF EXISTS "authenticated_users_insert_history" ON order_history;

-- Create policies
CREATE POLICY "authenticated_users_view_history" ON order_history
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "authenticated_users_insert_history" ON order_history
FOR INSERT TO authenticated
WITH CHECK (true);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Order & Payment Tracking System Installed!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Features Added:';
    RAISE NOTICE '  • Complete order history tracking with dates';
    RAISE NOTICE '  • Dynamic payment status (unpaid/half-paid/paid)';
    RAISE NOTICE '  • Manager approval with payment + dates';
    RAISE NOTICE '  • Balance adjustments (discounts)';
    RAISE NOTICE '  • Supplier acceptance required for adjustments';
    RAISE NOTICE '  • Remaining balance tracking';
    RAISE NOTICE '  • Payment date & next payment date';
    RAISE NOTICE '  • Complete audit trail';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Usage:';
    RAISE NOTICE '  1. Approve with payment: SELECT approve_order_with_payment(order_id, manager_id, amount, method, payment_date, next_date, notes)';
    RAISE NOTICE '  2. Record payment: SELECT update_order_payment(order_id, amount, method, payment_date, next_date, notes, user_id)';
    RAISE NOTICE '  3. Adjust balance: SELECT adjust_order_balance(order_id, new_total, reason, manager_id, true)';
    RAISE NOTICE '  4. Supplier accepts: SELECT supplier_accept_adjustment(order_id, supplier_id, notes)';
    RAISE NOTICE '  5. View history: SELECT * FROM get_order_history(order_id)';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Smart Features:';
    RAISE NOTICE '  • Manager can reduce order total (discount)';
    RAISE NOTICE '  • Supplier must accept adjustment';
    RAISE NOTICE '  • Real-time balance tracking';
    RAISE NOTICE '  • Visible to Manager, Supplier & Admin';
    RAISE NOTICE '';
END $$;
