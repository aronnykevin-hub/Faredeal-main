# 🚀 QUICK START - Smart Payment Tracking

## 1️⃣ Run SQL Migration (5 minutes)

```bash
# Open Supabase Dashboard → SQL Editor
# Paste and run this file:
backend/sql/08-smart-progressive-payment-tracking.sql
```

**What it does:**
- Creates payment tracking tables
- Adds smart functions for metrics
- Sets up auto-update triggers
- Initializes existing orders

---

## 2️⃣ Test It! (2 minutes)

### Open Manager Portal
```
http://localhost:5173/manager
```

### What You'll See:
✅ **Real Supplier Names** - "ABC Trading Co" not "Unknown Supplier"  
✅ **Circular Progress** - Beautiful 65% paid indicator  
✅ **Payment Breakdown** - Paid: UGX 650K, Due: UGX 350K  
✅ **Smart Reminders** - "Due in 14 days" or "5 days overdue"  
✅ **Installment Tracking** - "2/3 payments complete"  

---

## 3️⃣ Create Test Order

```javascript
// Create order with 3 installment payments
POST /api/purchase-orders
{
  "supplier_id": "supplier-uuid",
  "total_amount_ugx": 1000000,
  "items": [...],
  "payment_terms": "3 installments"
}

// Approve with 30% initial payment
POST /api/purchase-orders/{id}/approve
{
  "initial_payment": 300000,
  "payment_method": "mobile_money",
  "next_payment_date": "2025-12-20"
}

// Record second payment
POST /api/purchase-orders/{id}/record-payment
{
  "amount": 400000,
  "payment_method": "bank_transfer",
  "payment_date": "2025-12-15"
}
```

**Watch the magic:**
- Progress updates from 30% → 70%
- Balance recalculates automatically
- Next payment reminder updates
- Estimated completion adjusts

---

## 4️⃣ Supplier Approval Workflow

### Manager requests discount:
```javascript
// Request 10% discount
const adjustment = await supabase.rpc('request_balance_adjustment', {
  p_order_id: orderId,
  p_adjusted_amount: 900000, // 10% off
  p_reason: 'Bulk order discount'
});
```

### Supplier responds:
```javascript
// In Supplier Portal
const response = await supabase.rpc('supplier_respond_to_adjustment', {
  p_adjustment_id: adjustmentId,
  p_response: 'accepted',  // or 'rejected'
  p_supplier_notes: 'Approved with thanks'
});
```

**Result:** Order total updates instantly! ✨

---

## 📊 Payment Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Green | 100% | Fully paid |
| 🔵 Blue | 50-99% | Good progress |
| 🟡 Yellow | 1-49% | Started paying |
| 🔴 Red | 0% | Not paid |
| 🔴 Red Blink | Overdue | URGENT! |

---

## 🎯 Key Metrics Explained

```javascript
paymentMetrics: {
  paymentPercentage: 65.5,      // How much is paid
  paidInstallments: 2,           // Payments received
  totalInstallments: 3,          // Total expected
  nextPaymentDue: "2025-12-20",  // When next payment is due
  daysUntilNext: 14,             // Days remaining
  daysOverdue: 0,                // Days late (if any)
  paymentVelocity: 40000,        // UGX per day avg
  estimatedCompletion: "2026-01-15" // Predicted full payment
}
```

---

## 🔥 Cool Features

### 1. Auto-Calculating Velocity
System tracks how fast payments come in and predicts when you'll be paid in full!

### 2. Smart Reminders
- **Green**: All good! ✅
- **Yellow**: Payment due in 7 days ⚠️
- **Orange**: Payment due in 3 days 🟠
- **Red**: OVERDUE! 🚨

### 3. Installment Timeline
See progress: `⬤⬤◯` = 2 of 3 paid

### 4. Supplier Collaboration
Discounts require supplier approval - fair and transparent!

---

## 🐛 Troubleshooting

### Supplier showing "Unknown Supplier"?
```sql
-- Check users table
SELECT id, company_name, full_name, role 
FROM users 
WHERE role = 'supplier';

-- Update if needed
UPDATE users 
SET company_name = 'ABC Trading Co'
WHERE id = 'supplier-uuid';
```

### Metrics not updating?
```sql
-- Manually trigger update
SELECT update_payment_metrics('order-uuid');

-- Check metrics table
SELECT * FROM payment_metrics 
WHERE purchase_order_id = 'order-uuid';
```

### Payment percentage wrong?
```sql
-- Recalculate
UPDATE purchase_orders 
SET 
  balance_due_ugx = total_amount_ugx - COALESCE(amount_paid_ugx, 0)
WHERE id = 'order-uuid';
```

---

## 📞 Support

**Everything working?** 🎉  
See real supplier names with beautiful payment tracking!

**Having issues?**  
Check:
1. SQL migration ran successfully
2. Tables exist: `payment_metrics`, `payment_installments`
3. Functions exist: `update_payment_metrics()`
4. Supplier has `company_name` in users table

---

## 🎨 Before & After

### Before:
```
PO-2025-0001
Unknown Supplier
Total: UGX 1,000,000
Status: UNPAID
```

### After:
```
┌─────────────────────────────────┐
│ PO-2025-0001  🟡 PARTIALLY PAID │
│ 🏢 ABC Trading Company          │
│    🍎 Food & Beverage           │
│                                  │
│       ┏━━━━━━━━┓                │
│       ┃  65%   ┃  UGX 1,000,000 │
│       ┗━━━━━━━━┛                │
│                                  │
│ ✅ Paid:  UGX 650,000           │
│ 💰 Due:   UGX 350,000           │
│                                  │
│ 📊 2/3 Installments              │
│ 📅 Due in 14 days                │
│ 🎯 Est. complete: Jan 15, 2026  │
└─────────────────────────────────┘
```

**THAT'S the difference!** ✨

---

🎉 **You're all set! The system is smart, creative, and tracks payments like a pro!**
