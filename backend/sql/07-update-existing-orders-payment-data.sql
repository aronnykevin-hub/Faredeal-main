-- =============================================
-- UPDATE EXISTING ORDERS WITH PAYMENT DATA
-- =============================================
-- This script updates existing orders to show visual payment tracking
-- Run this AFTER running 06-enhance-order-payment-tracking.sql
-- =============================================

-- Update all existing orders to have payment_status = 'unpaid' and balance_due
UPDATE purchase_orders
SET 
    payment_status = COALESCE(payment_status, 'unpaid'),
    amount_paid_ugx = COALESCE(amount_paid_ugx, 0),
    balance_due_ugx = total_amount_ugx - COALESCE(amount_paid_ugx, 0)
WHERE payment_status IS NULL OR balance_due_ugx IS NULL;

-- Show results
DO $$
DECLARE
    v_updated_count integer;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM purchase_orders
    WHERE payment_status IS NOT NULL;
    
    RAISE NOTICE '✅ Payment data updated!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Orders with payment tracking: %', v_updated_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎨 Visual features now active:';
    RAISE NOTICE '  • Payment status badges (UNPAID/HALF PAID/PAID)';
    RAISE NOTICE '  • Progress bars for partial payments';
    RAISE NOTICE '  • Balance due display';
    RAISE NOTICE '  • Color-coded indicators';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Go to Manager Portal and see the visuals!';
    RAISE NOTICE '';
END $$;
