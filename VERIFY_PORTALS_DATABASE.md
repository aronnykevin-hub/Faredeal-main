# 🔍 PORTAL DATABASE VERIFICATION & FIX GUIDE

## Current Status Analysis

### ✅ Manager Portal - Active Orders
- **Component**: `SupplierOrderManagement.jsx`
- **Already Using Database**: YES ✅
- **Service**: `supplierOrdersService.getAllPurchaseOrders()`
- **Database Table**: `purchase_orders`
- **Status**: Component is correctly configured to use database

### ✅ Supplier Portal - Payment Confirmations  
- **Component**: `SupplierPaymentConfirmations.jsx`
- **Already Using Database**: YES ✅
- **RPC Functions Used**:
  - `get_pending_payment_confirmations(supplier_id)`
  - `supplier_confirm_payment(transaction_id, supplier_id, notes)`
- **Database Tables**: `payment_transactions`, `purchase_orders`
- **Status**: Component is correctly configured to use database

## ⚠️ Potential Issue

The database functions may not be deployed to your Supabase instance yet.

## 🔧 Quick Fix Steps

### Step 1: Verify Database Functions Exist

Run this in your Supabase SQL Editor:

```sql
-- Check if payment confirmation functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_pending_payment_confirmations', 'supplier_confirm_payment', 'approve_order_with_payment', 'record_payment_with_tracking');
```

### Step 2: Deploy Payment Tracking Functions (if missing)

If the functions don't exist, run this SQL file in Supabase SQL Editor:

**File**: `backend/sql/08-smart-progressive-payment-tracking.sql`

This file contains:
- `payment_transactions` table
- `payment_installments` table  
- `payment_metrics` table
- `get_pending_payment_confirmations()` function
- `supplier_confirm_payment()` function
- `approve_order_with_payment()` function
- `record_payment_with_tracking()` function

### Step 3: Verify Purchase Orders Table

```sql
-- Check if purchase_orders table exists with required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;
```

Required columns:
- `id` (uuid)
- `po_number` (varchar)
- `supplier_id` (uuid)
- `status` (varchar)
- `priority` (varchar)
- `ordered_by` (uuid)
- `approved_by` (uuid)
- `total_amount_ugx` (numeric)
- `amount_paid_ugx` (numeric)
- `balance_due_ugx` (numeric)
- `payment_status` (varchar)
- `items` (jsonb)
- `order_date` (date)
- `expected_delivery_date` (date)

### Step 4: Verify Payment Transactions Table

```sql
-- Check if payment_transactions table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;
```

Required columns:
- `id` (uuid)
- `transaction_number` (varchar)
- `purchase_order_id` (uuid)
- `amount_paid_ugx` (numeric)
- `payment_method` (varchar)
- `payment_reference` (varchar)
- `payment_date` (timestamp)
- `paid_by` (uuid)
- `confirmed_by_supplier` (boolean)
- `supplier_confirmed_at` (timestamp)
- `notes` (text)

## 🎯 Testing After Deployment

### Test Manager Portal - Active Orders

1. Log in as Manager
2. Navigate to "Orders" or "Suppliers" tab
3. You should see a list of purchase orders from the database
4. Try filtering by status (draft, pending_approval, approved, etc.)
5. Create a new purchase order to test

### Test Supplier Portal - Payment Confirmations

1. Log in as Supplier
2. Navigate to "Payment Confirmations" tab
3. You should see payments awaiting confirmation
4. Try confirming a payment
5. Verify it updates the `payment_transactions` table

## 🐛 Common Issues & Solutions

### Issue 1: "Function not found" error
**Solution**: Deploy `backend/sql/08-smart-progressive-payment-tracking.sql`

### Issue 2: "Table does not exist" error
**Solution**: Run the appropriate schema file:
- For purchase_orders: `backend/database/supplier-schema.sql`
- For payment_transactions: `backend/sql/08-smart-progressive-payment-tracking.sql`

### Issue 3: "No data showing"
**Solution**: Check if you have test data:

```sql
-- Check if there are any purchase orders
SELECT COUNT(*) FROM purchase_orders;

-- Check if there are any payment transactions
SELECT COUNT(*) FROM payment_transactions;

-- Insert test purchase order if needed
INSERT INTO purchase_orders (
  po_number, supplier_id, ordered_by, status, priority,
  items, total_amount_ugx, amount_paid_ugx, balance_due_ugx,
  payment_status, order_date
) VALUES (
  'PO-TEST-001',
  (SELECT id FROM users WHERE role = 'supplier' LIMIT 1),
  (SELECT id FROM users WHERE role = 'manager' LIMIT 1),
  'approved',
  'normal',
  '[{"product": "Test Item", "quantity": 1, "price": 10000}]'::jsonb,
  10000,
  0,
  10000,
  'unpaid',
  CURRENT_DATE
);
```

### Issue 4: RLS (Row Level Security) blocking access
**Solution**: Verify RLS policies:

```sql
-- Check RLS policies on purchase_orders
SELECT * FROM pg_policies WHERE tablename = 'purchase_orders';

-- Check RLS policies on payment_transactions  
SELECT * FROM pg_policies WHERE tablename = 'payment_transactions';
```

## 📊 Verification Queries

After deploying, run these to verify everything works:

```sql
-- 1. Test get_pending_payment_confirmations
SELECT * FROM get_pending_payment_confirmations(
  (SELECT id FROM users WHERE role = 'supplier' LIMIT 1)
);

-- 2. Check active orders for manager
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.payment_status,
  po.total_amount_ugx,
  po.balance_due_ugx,
  s.company_name as supplier_name
FROM purchase_orders po
LEFT JOIN users s ON s.id = po.supplier_id
WHERE po.status NOT IN ('completed', 'cancelled')
ORDER BY po.order_date DESC;

-- 3. Check payment transactions
SELECT 
  pt.transaction_number,
  pt.amount_paid_ugx,
  pt.payment_method,
  pt.confirmed_by_supplier,
  po.po_number
FROM payment_transactions pt
LEFT JOIN purchase_orders po ON po.id = pt.purchase_order_id
ORDER BY pt.created_at DESC
LIMIT 10;
```

## ✅ Success Indicators

Both portals are working correctly when:

1. **Manager Portal**:
   - ✅ Can see list of purchase orders
   - ✅ Can create new orders
   - ✅ Can approve/reject orders
   - ✅ Can record payments
   - ✅ Can see payment status (paid/unpaid/partially_paid)

2. **Supplier Portal**:
   - ✅ Can see pending payment confirmations
   - ✅ Can confirm payments
   - ✅ Confirmation updates the database
   - ✅ Can see payment history

## 🚀 Quick Deploy Command

If you need to deploy all SQL files at once:

```bash
# In Supabase SQL Editor, run these files in order:
1. backend/database/supplier-schema.sql (if not already deployed)
2. backend/sql/08-smart-progressive-payment-tracking.sql
```

## 📝 Notes

- Both components are already correctly configured to use the database
- No frontend code changes needed
- Only database deployment may be required
- All necessary service files already exist and are correctly implemented
