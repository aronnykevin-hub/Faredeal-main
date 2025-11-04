# Inventory Tables - Setup Guide

## ✅ Complete Inventory Database System

### 📦 What Was Created

A comprehensive inventory management database with 8 core tables and full automation.

---

## 🗄️ Tables Created

### **1. categories**
Product categorization and hierarchy
- Supports nested categories (parent_id)
- Image URLs for visual display
- Sort ordering capability

### **2. suppliers**
Supplier/vendor management
- Company and contact information
- Payment terms and credit limits
- Rating system (0-5 stars)
- Link to user accounts

### **3. products**
Product catalog
- SKU and barcode tracking
- Cost and selling prices
- Category and supplier relationships
- Images and specifications (JSONB)
- Service vs physical product tracking

### **4. inventory**
Core stock management
- Current stock levels
- Reserved stock (for pending orders)
- **Auto-calculated available stock** (current - reserved)
- Min/max stock levels
- Reorder points and quantities
- Warehouse and bin locations
- **Auto-updating status** (in_stock, low_stock, out_of_stock)

### **5. inventory_movements**
Complete stock movement history
- Tracks every stock change
- Movement types: purchase, sale, adjustment, return, transfer, damage, theft
- Reference tracking (links to POs, sales, etc.)
- Cost tracking per movement
- **Auto-logged** when inventory changes

### **6. stock_adjustments**
Manual adjustment audit log
- Tracks who made adjustments
- Before/after quantities
- Adjustment reasons
- Approval tracking

### **7. purchase_orders**
Purchase order management
- PO number generation
- Status tracking (draft → received)
- Expected and actual delivery dates
- Totals with tax and shipping
- Approval workflow

### **8. purchase_order_items**
PO line items
- Products and quantities ordered
- Quantity received tracking
- Unit costs and totals
- Notes per line item

---

## 🚀 Deployment Steps

### **Step 1: Create Tables**
```sql
-- In Supabase SQL Editor, run:
-- File: create-inventory-tables.sql
```
This will create all 8 tables with proper relationships, indexes, and constraints.

### **Step 2: Add Sample Data (Optional)**
```sql
-- In Supabase SQL Editor, run:
-- File: sample-products-inventory.sql
```
This adds 6 sample products with inventory levels for testing.

### **Step 3: Verify Setup**
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE tablename IN (
  'categories', 'suppliers', 'products', 'inventory',
  'inventory_movements', 'stock_adjustments', 
  'purchase_orders', 'purchase_order_items'
);

-- Check sample data
SELECT 
  p.name,
  i.current_stock,
  i.status,
  s.company_name as supplier
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.is_active = true;
```

---

## ⚡ Automated Features

### **Auto-Updating Status**
Inventory status automatically updates based on stock levels:
- `current_stock = 0` → `out_of_stock`
- `current_stock <= minimum_stock` → `low_stock`
- `current_stock > minimum_stock` → `in_stock`

### **Auto-Calculated Available Stock**
```sql
available_stock = current_stock - reserved_stock
```
Always up-to-date, can't be manually edited (GENERATED ALWAYS).

### **Auto-Logged Movements**
Every time inventory.current_stock changes, a movement record is automatically created in inventory_movements table.

### **Auto-Updated Timestamps**
All tables have `updated_at` that automatically updates on any change.

---

## 📊 Database Relationships

```
suppliers ──┐
            ├──→ products ──→ inventory ──→ inventory_movements
categories ─┘                    │              
                                 └──→ stock_adjustments
                                 
suppliers ──→ purchase_orders ──→ purchase_order_items ──→ products
```

---

## 🔒 Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Public read**: categories (active only), products (active only)
- **Authenticated read/write**: All other tables
- **Protected**: inventory_movements (insert only, no delete/update)

---

## 🎯 Common Queries

### **Check Low Stock Items**
```sql
SELECT 
  p.name,
  p.sku,
  i.current_stock,
  i.minimum_stock,
  i.status
FROM products p
JOIN inventory i ON i.product_id = p.id
WHERE i.current_stock <= i.minimum_stock
  AND p.is_active = true
ORDER BY i.current_stock ASC;
```

### **View Stock Movement History**
```sql
SELECT 
  p.name,
  im.movement_type,
  im.quantity,
  im.previous_stock,
  im.new_stock,
  im.created_at
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
ORDER BY im.created_at DESC
LIMIT 50;
```

### **Get Products Needing Reorder**
```sql
SELECT 
  p.name,
  p.sku,
  i.current_stock,
  i.reorder_point,
  i.reorder_quantity,
  s.company_name as supplier
FROM products p
JOIN inventory i ON i.product_id = p.id
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE i.current_stock <= i.reorder_point
  AND p.is_active = true
ORDER BY i.current_stock ASC;
```

### **Calculate Total Inventory Value**
```sql
SELECT 
  COUNT(*) as total_products,
  SUM(i.current_stock) as total_units,
  SUM(i.current_stock * p.cost_price) as inventory_value_cost,
  SUM(i.current_stock * p.selling_price) as inventory_value_retail
FROM products p
JOIN inventory i ON i.product_id = p.id
WHERE p.is_active = true
  AND p.track_inventory = true;
```

### **Top Suppliers by Product Count**
```sql
SELECT 
  s.company_name,
  COUNT(p.id) as product_count,
  SUM(i.current_stock) as total_stock
FROM suppliers s
LEFT JOIN products p ON p.supplier_id = s.id
LEFT JOIN inventory i ON i.product_id = p.id
WHERE s.is_active = true
GROUP BY s.id, s.company_name
ORDER BY product_count DESC;
```

---

## 🔧 Maintenance Tasks

### **Update Product Stock**
```sql
UPDATE inventory
SET current_stock = 100
WHERE product_id = (SELECT id FROM products WHERE sku = 'IP15PM-256-BLU');
```
*Movement log automatically created!*

### **Add New Product with Inventory**
```sql
-- Step 1: Insert product
INSERT INTO products (sku, name, cost_price, selling_price, is_active)
VALUES ('NEW-SKU-001', 'New Product', 50000, 75000, true)
RETURNING id;

-- Step 2: Create inventory record
INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock)
VALUES ('[product_id_from_step_1]', 0, 10, 100);
```

### **Manual Stock Adjustment**
```sql
-- Log the adjustment
INSERT INTO stock_adjustments (
  product_id,
  adjustment_type,
  quantity_before,
  quantity_adjusted,
  quantity_after,
  reason,
  created_by
)
SELECT 
  id,
  'recount',
  (SELECT current_stock FROM inventory WHERE product_id = id),
  25,
  (SELECT current_stock FROM inventory WHERE product_id = id) + 25,
  'Physical count adjustment',
  auth.uid()
FROM products WHERE sku = 'IP15PM-256-BLU';

-- Update the inventory
UPDATE inventory
SET current_stock = current_stock + 25
WHERE product_id = (SELECT id FROM products WHERE sku = 'IP15PM-256-BLU');
```

---

## 🐛 Troubleshooting

### **Issue: Tables already exist**
```sql
-- Drop tables if you need to recreate (CAUTION: Deletes all data!)
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
```

### **Issue: RLS blocking access**
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'inventory';

-- Temporarily disable RLS (development only)
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;

-- Re-enable when ready
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
```

### **Issue: Foreign key constraint violations**
Make sure you create data in this order:
1. categories (no dependencies)
2. suppliers (no dependencies)
3. products (needs categories and suppliers)
4. inventory (needs products)
5. purchase_orders (needs suppliers)
6. purchase_order_items (needs purchase_orders and products)

---

## 📈 Performance Tips

### **Indexes Created**
All common query patterns have indexes:
- Product SKU and barcode lookups
- Product name search (trigram index)
- Category and supplier filters
- Inventory status filtering
- Low stock queries
- Movement history by date

### **Query Optimization**
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM products WHERE sku = 'IP15PM-256-BLU';

-- Should show "Index Scan" not "Seq Scan"
```

---

## ✅ Integration with Frontend

The **ProductInventoryInterface** component is already configured to use these tables:

- **Loads products** with JOIN to inventory and suppliers
- **Updates stock** via inventory table
- **Logs movements** automatically via triggers
- **Calculates status** based on stock levels

Just ensure your Supabase connection is configured in `services/supabase.js`.

---

## 📝 Next Steps

1. ✅ **Run create-inventory-tables.sql** - Deploy database schema
2. ✅ **Run sample-products-inventory.sql** - Add test data
3. ✅ **Test in Admin Portal** - Navigate to Inventory section
4. 📋 **Configure RLS policies** - Adjust based on your roles
5. 📋 **Add real products** - Replace sample data with actual inventory
6. 📋 **Setup purchase orders** - Implement PO workflow
7. 📋 **Create reports** - Build analytics dashboards

---

## 🎉 Status

**✅ COMPLETE**: Full inventory database system with 8 tables, auto-triggers, and RLS policies

**Files Created**:
- `create-inventory-tables.sql` - Complete database schema
- `sample-products-inventory.sql` - Sample data for testing
- `INVENTORY_TABLES_GUIDE.md` - This documentation

**Last Updated**: Today

**Ready for Production**: Yes (adjust RLS policies as needed)
