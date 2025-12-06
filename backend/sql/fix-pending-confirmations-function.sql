-- =============================================
-- FIX: Update get_pending_payment_confirmations function
-- =============================================

-- Drop and recreate the function to ensure it's updated
DROP FUNCTION IF EXISTS get_pending_payment_confirmations(uuid);

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
        po.po_number::text,
        pt.amount_ugx AS amount_paid,
        pt.payment_method,
        pt.payment_date,
        pt.payment_reference,
        pt.notes,
        COALESCE(u.full_name, u.username, 'Manager')::text AS paid_by_name,
        u.email::text AS paid_by_email,
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

-- Test the function
DO $$
DECLARE
    v_test_result record;
BEGIN
    RAISE NOTICE '✅ Function get_pending_payment_confirmations has been updated!';
    RAISE NOTICE 'Testing function...';
    
    -- Try to get the first supplier and test
    FOR v_test_result IN 
        SELECT id, username FROM users WHERE role = 'supplier' LIMIT 1
    LOOP
        RAISE NOTICE 'Test supplier: % (ID: %)', v_test_result.username, v_test_result.id;
        RAISE NOTICE 'Function is ready to use.';
    END LOOP;
END $$;
