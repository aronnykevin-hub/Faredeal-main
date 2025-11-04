# 🇺🇬 Enable Manager to Create Orders - FAREDEAL Uganda

## ✅ Quick Fix Guide

The "Create Purchase Order" button in the Manager Portal is now enabled and ready to use!

---

## 🚀 Setup Instructions

### Step 1: Run SQL Script in Supabase

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your FAREDEAL project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Paste the SQL Script**
   - Open file: `backend/sql/01-enable-manager-create-orders.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Script**
   - Click "Run" or press `Ctrl + Enter`
   - Wait for success message: "✅ Manager order creation policies updated successfully!"

---

## 📋 How to Create Orders in Manager Portal

### Step 1: Navigate to Orders Section
1. Log in to Manager Portal
2. Click on **"Suppliers"** or **"Orders"** tab
3. Click the **"Create New Order"** button (green button at top)

### Step 2: Fill Out Order Form

**🏢 Select Supplier:**
- Choose supplier from dropdown (e.g., "testing1 (SUP-6b019b)")

**📦 Add Order Items:**
- **Product Name:** Enter product name (e.g., "beans")
- **Quantity:** Enter quantity (e.g., "1")
- **Unit Price (UGX):** Enter price (e.g., "0" or actual price)
- Click **"+ Add Item"** button

**📅 Delivery Details:**
- **Expected Delivery Date:** Select delivery date
- **Priority Level:** Choose priority (Normal, High, Urgent, etc.)
- **Delivery Address:** Enter address (default: "FAREDEAL Main Store, Kampala")
- **Delivery Instructions:** Add special instructions (optional)
- **Additional Notes:** Add any notes (optional)

### Step 3: Create the Order
- Review all information
- Click **"Create Purchase Order"** button (green button at bottom right)
- Wait for confirmation: "✅ Purchase order created successfully!"

---

## 🎯 Order Status Flow

Once created, orders go through these statuses:

1. **📝 Pending Approval** - Awaiting manager approval
2. **✅ Approved** - Manager approved, ready to send
3. **📧 Sent to Supplier** - Order sent to supplier
4. **✔️ Confirmed** - Supplier confirmed order
5. **🚚 Partially Received** - Some items delivered
6. **📦 Received** - All items delivered
7. **✅ Completed** - Order fully processed

---

## 💰 Order Management Features

### Approve Orders
- Click **"Approve"** button on pending orders
- Order moves to "Approved" status

### Reject Orders
- Click **"Reject"** button
- Enter rejection reason
- Order moves to "Cancelled" status

### Send to Supplier
- Click **"Send to Supplier"** on approved orders
- System logs communication
- Supplier receives notification

### Track Payments
- View payment status: **Paid**, **Half Paid**, **Unpaid**
- Record payments for orders
- Track outstanding balances

---

## 🔧 Troubleshooting

### Button Not Working?

**1. Check Browser Console**
```javascript
// Press F12 to open Developer Tools
// Check for errors in Console tab
```

**2. Verify Supabase Connection**
- Check that SQL script was run successfully
- Verify manager role in users table

**3. Check Manager User ID**
```javascript
// In browser console:
console.log(localStorage.getItem('userId'));
// Should show your manager user ID
```

**4. Verify RLS Policies**
```sql
-- Run in Supabase SQL Editor:
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'purchase_orders';
```

---

## 📊 Features Available

### Manager Can:
✅ Create purchase orders
✅ View all orders
✅ Approve/reject orders
✅ Send orders to suppliers
✅ Track deliveries
✅ Record payments
✅ View order history
✅ Generate reports

### Order Includes:
- Multiple items per order
- Automatic VAT calculation (18%)
- Total amount calculation
- Priority levels
- Delivery tracking
- Payment tracking
- Supplier communication logs

---

## 📱 Mobile Responsive

The Create Order modal is fully responsive and works on:
- 💻 Desktop
- 📱 Mobile phones
- 📲 Tablets

---

## 🆘 Need Help?

**Common Issues:**

1. **"Please select supplier" error**
   - Make sure to select a supplier from dropdown

2. **"Please add at least one item" error**
   - Add at least one item using the "+ Add Item" button

3. **"Please select expected delivery date" error**
   - Choose a delivery date

4. **Button disabled (grayed out)**
   - Check that you've added items to the order
   - Verify all required fields are filled

---

## ✅ Success Indicators

When order is created successfully:
1. ✅ Success message appears: "Purchase order created successfully!"
2. Modal closes automatically
3. Order appears in the orders list
4. Order has "pending_approval" status
5. Manager can view order details

---

## 🇺🇬 FAREDEAL Uganda Business Intelligence

**Contact:**
- 📧 Email: manager@faredeal.ug
- 📞 Phone: +256-700-123456
- 🌐 Website: www.faredeal.ug

**System Version:** v2.0
**Last Updated:** November 4, 2025

---

## 🎉 You're All Set!

The Manager Portal is now fully functional for creating and managing supplier orders!

**Next Steps:**
1. ✅ Run the SQL script in Supabase
2. ✅ Log in to Manager Portal
3. ✅ Click "Create New Order"
4. ✅ Fill out the form
5. ✅ Submit the order
6. ✅ Manage orders from the dashboard

Happy ordering! 🚀🇺🇬
