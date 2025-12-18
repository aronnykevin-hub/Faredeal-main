# 📦 FAREDEAL Order Management System - Complete Understanding

## 🎯 System Overview

**Order Management** is a critical module in FAREDEAL Manager Portal that handles:
- Purchase order creation from suppliers
- Order approval workflows
- Inventory replenishment
- Supplier communication
- Payment tracking
- Delivery management

---

## 🏢 Manager Portal Order Management

### **Access & Navigation**

**File**: [ManagerPortal.jsx](frontend/src/pages/ManagerPortal.jsx)

**Location in Portal**:
1. Log in to Manager Portal
2. Click **"Suppliers"** tab (🏢 icon)
3. Or click **"Orders"** tab

**Main Dashboard Stats**:
```
┌─────────────────────────────────────────────────────┐
│  📊 Supplier Orders Dashboard                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📦 Total Orders    📋 Pending Approval            │
│  Shows count +      Shows orders waiting           │
│  total UGX value    for manager review             │
│                                                     │
│  📧 Sent to        🏢 Active Suppliers            │
│  Suppliers          Shows active vs total          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Order Lifecycle & Statuses

### **Complete Order Flow**

```
DRAFT (Optional)
  ↓
PENDING APPROVAL 🟡
  Manager reviews
  ├─→ APPROVED ✅
  │     └─→ SENT TO SUPPLIER 📧
  │           └─→ CONFIRMED (by Supplier) ✓
  │                 └─→ RECEIVED ✅
  │                       └─→ COMPLETED 🎉
  │
  └─→ REJECTED ❌
        (Order cancelled)
```

### **Status Details**

| Status | Badge | Meaning | Action Required |
|--------|-------|---------|-----------------|
| `pending_verification` | 🟡 Yellow | Awaiting manager review | Approve/Reject |
| `approved` | ✅ Green | Manager approved | Send to Supplier |
| `sent_to_supplier` | 📧 Cyan | Sent to supplier | Wait for confirmation |
| `confirmed` | ✓ Green | Supplier confirmed | Wait for delivery |
| `received` | ✅ Green | Delivered successfully | Record quality check |
| `completed` | 🎉 Green | Fully processed | Archive |
| `rejected` | ❌ Red | Rejected by manager | Cannot proceed |
| `cancelled` | ❌ Red | Cancelled | Cannot proceed |

---

## 🔧 Core Features & Operations

### **1. Create Purchase Order**

**File**: [supplierOrdersService.js](frontend/src/services/supplierOrdersService.js)

**Function**: `createPurchaseOrder(orderData)`

**Flow**:
```
1. Manager clicks "Create New Order" button
   ↓
2. Modal opens with form:
   - Select Supplier (dropdown)
   - Enter items:
     * Product name
     * Quantity
     * Unit price
   - Select expected delivery date
   - Add delivery address
   - Add special notes
   ↓
3. System calculates:
   - Subtotal (sum of line items)
   - Tax (18% VAT - Uganda standard)
   - Total amount
   ↓
4. Order data sent to Supabase:
   - Auto-generates PO number: PO-20251218-0001
   - Sets status: 'pending_approval'
   - Initializes payment fields:
     * amount_paid_ugx: 0
     * balance_due_ugx: total
     * payment_status: 'unpaid'
   ↓
5. Order created successfully ✅
6. Supplier receives notification
7. Order appears in "Active Orders" list
```

**Data Structure**:
```javascript
{
  id: UUID,
  po_number: "PO-20251218-0001",        // Auto-generated
  supplier_id: UUID,
  supplier_name: "Coca-Cola Uganda",
  
  // Items
  items: [
    {
      product_name: "Coca-Cola 500ml",
      quantity: 100,
      unit_price: 3500,
      line_total: 350000
    },
    // ... more items
  ],
  
  // Amounts
  subtotal_ugx: 350000,
  tax_ugx: 63000,                      // 18% VAT
  total_amount_ugx: 413000,
  
  // Delivery
  expected_delivery_date: "2025-12-20",
  delivery_address: "Kampala Branch",
  delivery_instructions: "Special handling",
  
  // Status & Dates
  status: "pending_approval",           // Current workflow status
  order_date: "2025-12-18T14:30:00Z",
  created_at: "2025-12-18T14:30:00Z",
  
  // Payment Tracking
  amount_paid_ugx: 0,
  balance_due_ugx: 413000,
  payment_status: "unpaid",             // unpaid|half_paid|paid
  
  // Approval
  approved_by: null,                    // Set when approved
  approved_at: null,
  approved_notes: null,
  
  // Metadata
  priority: "normal",                   // urgent|high|normal|low
  notes: "Order for inventory replenishment",
  created_by: "manager_name"
}
```

---

### **2. Approve Orders**

**Function**: `approvePurchaseOrder(orderId, approvedBy)`

**Process**:
```
1. Manager views pending orders (yellow badge: PENDING APPROVAL)
   ↓
2. Reviews order details:
   - Items requested
   - Quantities
   - Unit prices
   - Total amount
   - Supplier information
   ↓
3. Clicks "APPROVE ORDER" (green button)
   ↓
4. System updates database:
   - status: "pending_approval" → "approved"
   - approved_by: "manager_name"
   - approved_at: current timestamp
   ↓
5. Notification sent to supplier
   ↓
6. Order moves to "Approved" section ✅
7. Manager can now "Send to Supplier"
```

**Status Change**:
```
BEFORE: pending_approval 🟡
AFTER:  approved ✅
```

---

### **3. Reject Orders**

**Function**: `rejectPurchaseOrder(orderId, reason, rejectedBy)`

**Process**:
```
1. Manager reviews order and decides to reject
   ↓
2. Clicks "REJECT" (red button)
   ↓
3. Modal appears asking for rejection reason:
   - Budget constraints
   - Poor supplier history
   - Quality concerns
   - Timing issues
   - Other (custom reason)
   ↓
4. Manager enters reason and confirms
   ↓
5. System updates:
   - status: "pending_approval" → "rejected"
   - rejection_reason: [reason provided]
   - rejected_by: "manager_name"
   - rejected_at: timestamp
   ↓
6. Supplier notification: Order rejected
   ↓
7. Order marked as CANCELLED ❌
```

---

### **4. Send to Supplier**

**Function**: `sendOrderToSupplier(orderId, managerId)`

**Process**:
```
1. Manager finds order with status "APPROVED" ✅
   ↓
2. Reviews order one final time
   ↓
3. Clicks "SEND TO SUPPLIER" (blue button)
   ↓
4. System action:
   - Creates communication record
   - Sends email to supplier
   - Updates status: "approved" → "sent_to_supplier"
   - Records sent_at timestamp
   ↓
5. Supplier receives notification with:
   - PO number
   - Items requested
   - Expected delivery date
   - Special instructions
   ↓
6. Order now shows status: 📧 SENT TO SUPPLIER
```

**Communication Logged**:
```javascript
{
  supplier_id: UUID,
  communication_type: "purchase_order_sent",
  reference_id: po_number,
  message: "Purchase order PO-20251218-0001 sent",
  sent_by: "manager_name",
  sent_at: timestamp,
  status: "sent"
}
```

---

### **5. Track Order Status**

**Dashboard Filters & Search**:

```
🔍 Search:
- By PO number: "PO-20251218"
- By supplier: "Coca-Cola"
- By person: "John Manager"

🏷️ Filter by Status:
- All Orders
- 🟡 Pending Approval
- ✅ Approved
- 📧 Sent to Supplier
- ✓ Confirmed
- ✅ Received
- 🎉 Completed
- ❌ Rejected/Cancelled

🚨 Filter by Priority:
- 🔥 Urgent (red)
- ⚠️ High (orange)
- 📋 Normal (blue)
- 📝 Low (gray)
```

---

### **6. Record Payments**

**Payment Tracking**:

```
Order Total: 413,000 UGX

Payment Status Options:
├─ 💰 UNPAID (0 paid)
├─ ⚠️ HALF PAID (≈206,500 paid)
└─ ✅ PAID (413,000 paid)

Manager can:
1. View balance due
2. Record partial payments
3. Mark as fully paid
4. Generate payment receipts
```

**Payment Fields**:
```javascript
{
  amount_paid_ugx: 0,           // Initially
  balance_due_ugx: 413000,      // Full amount
  payment_status: "unpaid",     // Initially
  
  payment_records: [
    {
      amount: 200000,
      date: "2025-12-19",
      method: "Bank Transfer",
      reference: "TXN-12345"
    },
    {
      amount: 213000,
      date: "2025-12-20",
      method: "Mobile Money (MTN)",
      reference: "MTN-67890"
    }
  ],
  
  fully_paid_at: "2025-12-20T10:30:00Z"
}
```

---

### **7. View Order Details**

**Complete Order Modal Shows**:

```
┌─────────────────────────────────────┐
│ ORDER DETAILS                       │
├─────────────────────────────────────┤
│                                     │
│ PO-20251218-0001 ✅ APPROVED       │
│                                     │
│ Supplier Information:               │
│ • Company: Coca-Cola Uganda         │
│ • Contact: supplier@cocacola.ug     │
│ • Phone: +256-XXX-XXX-XXX           │
│                                     │
│ Order Details:                      │
│ • Ordered By: John Manager          │
│ • Order Date: 18/12/2025 14:30      │
│ • Expected Delivery: 20/12/2025     │
│ • Delivery Address: Kampala Branch  │
│                                     │
│ Items:                              │
│ ┌─────────────────────────────────┐ │
│ │ Coca-Cola 500ml                 │ │
│ │ Qty: 100 | Price: 3,500 UGX     │ │
│ │ Total: 350,000 UGX              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Order Summary:                      │
│ Subtotal:  350,000 UGX             │
│ Tax (18%): 63,000 UGX              │
│ Total:     413,000 UGX             │
│                                     │
│ Payment Status:                     │
│ 💰 Unpaid (0 / 413,000)            │
│                                     │
│ Special Notes:                      │
│ "Handle with care"                  │
│                                     │
│ [APPROVE] [REJECT] [SEND]          │
│                                     │
└─────────────────────────────────────┘
```

---

## 🗄️ Database Tables

### **Primary Tables**

#### **1. purchase_orders**
```sql
purchase_orders (
  id UUID PRIMARY KEY,
  po_number VARCHAR UNIQUE,           -- Auto-generated: PO-YYYY-00001
  supplier_id UUID REFERENCES suppliers(id),
  
  -- Items (stored as JSONB)
  items JSONB,                        -- Array of {product_name, qty, unit_price}
  
  -- Amounts
  subtotal_ugx DECIMAL,
  tax_ugx DECIMAL,
  total_amount_ugx DECIMAL,
  
  -- Delivery
  expected_delivery_date DATE,
  delivery_address TEXT,
  delivery_instructions TEXT,
  
  -- Status
  status VARCHAR,                     -- pending_approval, approved, sent_to_supplier, etc.
  order_date TIMESTAMP,
  
  -- Payment
  amount_paid_ugx DECIMAL DEFAULT 0,
  balance_due_ugx DECIMAL,
  payment_status VARCHAR DEFAULT 'unpaid',
  
  -- Approval
  approved_by VARCHAR,
  approved_at TIMESTAMP,
  approved_notes TEXT,
  
  -- Metadata
  priority VARCHAR DEFAULT 'normal',
  notes TEXT,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### **2. supplier_communications**
```sql
supplier_communications (
  id UUID PRIMARY KEY,
  supplier_id UUID,
  communication_type VARCHAR,         -- purchase_order_sent, delivery_confirmed, etc.
  reference_id VARCHAR,               -- PO number or document ID
  message TEXT,
  sent_by VARCHAR,
  sent_at TIMESTAMP,
  status VARCHAR
)
```

#### **3. supplier_payments**
```sql
supplier_payments (
  id UUID PRIMARY KEY,
  po_id UUID REFERENCES purchase_orders(id),
  amount_ugx DECIMAL,
  payment_date TIMESTAMP,
  payment_method VARCHAR,             -- Bank Transfer, Mobile Money, Cash, etc.
  reference_number VARCHAR,
  recorded_by VARCHAR,
  created_at TIMESTAMP
)
```

#### **4. supplier_deliveries**
```sql
supplier_deliveries (
  id UUID PRIMARY KEY,
  po_id UUID REFERENCES purchase_orders(id),
  delivery_date TIMESTAMP,
  received_by VARCHAR,
  items_received JSONB,               -- What was actually delivered
  quality_check_status VARCHAR,       -- passed, failed, partial
  quality_notes TEXT,
  created_at TIMESTAMP
)
```

---

## 🔄 Data Flow Examples

### **Example 1: Complete Order Lifecycle**

```
MANAGER SIDE:
1. Manager clicks "Create New Order"
   ↓
2. Fills form:
   - Supplier: Coca-Cola Uganda
   - Items: 100x Coca-Cola 500ml @ 3,500 UGX
   - Expected Delivery: 20/12/2025
   - Address: Kampala Branch
   ↓
3. Clicks "Create Purchase Order"
   ↓
4. System:
   - Generates PO: PO-20251218-0001
   - Calculates: Subtotal (350,000) + Tax (63,000) = Total (413,000)
   - Sets status: pending_approval
   - Saves to database
   - Sends notification to supplier
   ↓
5. Manager sees order in "Pending Approval" section (yellow)
   ↓
6. Manager reviews details
   ↓
7. Clicks "APPROVE ORDER"
   ↓
8. System:
   - Updates status: approved
   - Records approved_by and approved_at
   - Sends notification to supplier
   ↓
9. Order moves to "Approved" section (green)
   ↓
10. Manager clicks "SEND TO SUPPLIER"
    ↓
11. System:
    - Sends complete PO to supplier email
    - Updates status: sent_to_supplier
    - Logs communication
    ↓
12. Order shows: 📧 SENT TO SUPPLIER

SUPPLIER SIDE:
1. Receives email with PO details
2. Reviews order
3. Confirms availability
4. Responds to manager (via Supplier Portal)
5. Status updated to: CONFIRMED ✓

DELIVERY:
1. Supplier ships items
2. Delivery arrives at Kampala Branch
3. Manager records delivery:
   - Items received
   - Quality check
   - Status: received ✅
   ↓
4. Payment recorded (if paying on delivery)
5. Order marked: COMPLETED 🎉
```

### **Example 2: Rejected Order**

```
1. Manager reviews pending order
2. Notices:
   - Price too high compared to market
   - Supplier hasn't delivered reliably
   ↓
3. Clicks "REJECT"
   ↓
4. Modal asks for reason
   ↓
5. Manager selects: "Budget constraints"
   ↓
6. System:
   - Updates status: rejected
   - Records rejection_reason
   - Cancels order
   - Notifies supplier
   ↓
7. Order shows: ❌ REJECTED
8. Manager can create new order with different supplier
```

---

## 🔐 Security & Access Control

### **Role-Based Access**

| Action | Manager | Supplier | Admin |
|--------|---------|----------|-------|
| Create Order | ✅ | ❌ | ✅ |
| Approve Order | ✅ | ❌ | ✅ |
| Send to Supplier | ✅ | ❌ | ✅ |
| View Own Orders | ❌ | ✅ | ✅ |
| Confirm Order | ❌ | ✅ | ✅ |
| Record Delivery | ✅ | ❌ | ✅ |
| Record Payment | ✅ | ❌ | ✅ |
| View All Orders | ✅ | ❌ | ✅ |

---

## 💡 Key Features

### **Order Intelligence**
✅ Auto-calculation of 18% VAT (Uganda standard)  
✅ Auto-generated PO numbers (PO-YYYY-00001)  
✅ Payment tracking (unpaid/half paid/paid)  
✅ Real-time status updates  
✅ Priority flagging (🔥 Urgent to 📝 Low)  
✅ Delivery date tracking  
✅ Quality control on receipt  

### **Communication**
✅ Supplier notifications via email  
✅ Communication log (audit trail)  
✅ Special instructions/notes  
✅ Manager approval comments  
✅ Rejection reasons tracked  

### **Financial**
✅ Accurate tax calculation  
✅ Payment tracking per order  
✅ Balance due calculation  
✅ Payment method recording  
✅ Invoice generation  

### **Analytics**
✅ Total orders count  
✅ Pending approvals count  
✅ Orders sent to suppliers  
✅ Total order value in UGX  
✅ Supplier performance metrics  
✅ Delivery performance  
✅ Payment status distribution  

---

## 🛠️ Technical Stack

**Frontend Services**:
- [supplierOrdersService.js](frontend/src/services/supplierOrdersService.js) - Order operations
- [purchaseOrderService.js](frontend/src/services/purchaseOrderService.js) - Purchase order management

**Components**:
- [SupplierOrderManagement.jsx](frontend/src/components/SupplierOrderManagement.jsx) - Dashboard & UI
- Modal components for create/approve/details

**Database**:
- Supabase PostgreSQL backend
- Real-time subscriptions
- Row-Level Security (RLS) policies

**Integration Points**:
- Cashier Portal (inventory replenishment)
- Supplier Portal (order confirmation)
- Admin Portal (oversight & reporting)

---

## 📊 Sample Ugandan Suppliers

Pre-loaded suppliers:
1. **Coca-Cola Uganda**
2. **Pepsi Uganda**
3. **Nile Breweries**
4. **Mukwano Group** (FMCG)
5. **Pearl Dairy**

---

## 🚀 Common Workflows

### **Workflow 1: Routine Stock Replenishment**
```
Manager → Create Order (Coca-Cola, 50 cases)
       → Review & Approve
       → Send to Supplier
       → Wait for delivery
       → Record delivery
       → Record payment
       → Complete
```

### **Workflow 2: Urgent Order**
```
Manager → Create Order (Priority: URGENT 🔥)
       → Fast-track approval
       → Expedite delivery date
       → Send immediately
       → Expedited delivery
       → Quality check
       → Payment
       → Complete
```

### **Workflow 3: Budget-Conscious Order**
```
Manager → Create Order
       → Check total amount
       → Compare with budget
       → If over budget → REJECT (with reason: "Budget constraints")
       → Create new order with fewer items OR lower-cost supplier
       → Continue with new order
```

---

**System Status**: ✅ **Production Ready**  
**Last Updated**: December 18, 2025  
**Uganda-Specific**: ✅ UGX currency, 18% VAT, Mobile Money support
