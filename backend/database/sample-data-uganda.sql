-- =====================================================================================
-- FAREDEAL POS - SAMPLE DATA FOR APPLICATION TESTING
-- =====================================================================================
-- This file creates realistic sample data that matches your Uganda-based POS system

-- Insert sample users for each role type
INSERT INTO users (auth_id, email, full_name, phone, role, employee_id, department, access_level, hire_date, salary) VALUES
-- Admin user
(uuid_generate_v4(), 'admin@faredeal.ug', 'System Administrator', '+256-700-000001', 'admin', 'ADMIN-001', 'Administration', 'full', '2023-01-01', 2500000),

-- Manager users
(uuid_generate_v4(), 'manager@faredeal.ug', 'Mukasa James', '+256-700-000002', 'manager', 'MGR-001', 'Operations', 'advanced', '2023-02-01', 1800000),
(uuid_generate_v4(), 'sarah.manager@faredeal.ug', 'Sarah Johnson', '+256-700-000003', 'manager', 'MGR-002', 'Sales', 'standard', '2023-03-15', 1600000),

-- Employee/Cashier users (matching your EmployeePortal profiles)
(uuid_generate_v4(), 'nakato@faredeal.ug', 'Nakato Sarah', '+256-700-000004', 'cashier', 'CASH-UG001', 'Front End Operations', 'standard', '2023-08-15', 800000),
(uuid_generate_v4(), 'okello@faredeal.ug', 'Okello Patrick', '+256-700-000005', 'cashier', 'CASH-UG002', 'Front End Operations', 'standard', '2023-06-10', 750000),
(uuid_generate_v4(), 'asiimwe@faredeal.ug', 'Asiimwe Mary', '+256-700-000006', 'employee', 'EMP-001', 'Inventory', 'standard', '2023-04-20', 700000),

-- Customer users
(uuid_generate_v4(), 'customer1@example.com', 'Namukasa Grace', '+256-700-100001', 'customer', NULL, NULL, NULL, NULL, NULL),
(uuid_generate_v4(), 'customer2@example.com', 'Mubiru John', '+256-700-100002', 'customer', NULL, NULL, NULL, NULL, NULL);

-- Insert sample suppliers (Uganda-based from your mockApi)
INSERT INTO suppliers (company_name, contact_person, email, phone, address, city, district, region, payment_terms, is_local, is_verified, status) VALUES
('Mukwano Group', 'Robert Kabushenga', 'sales@mukwano.co.ug', '+256-414-200-800', 'Plot 1-13 Mukwano Road', 'Kampala', 'Kampala', 'Central', 'Net 7', true, true, 'approved'),
('Tilda Uganda Ltd', 'Sarah Nakato', 'orders@tilda.ug', '+256-414-250-300', 'Industrial Area', 'Kampala', 'Kampala', 'Central', 'Net 15', true, true, 'approved'),
('Fresh Dairy Uganda', 'Robert Kiprotich', 'orders@freshdairy.co.ug', '+256-414-200-900', 'Mbarara Town', 'Mbarara', 'Mbarara', 'Western', '3 days', true, true, 'approved'),
('Sugar Corporation of Uganda', 'Agnes Byarugaba', 'sales@scoul.co.ug', '+256-414-201-000', 'Lugazi', 'Lugazi', 'Mukono', 'Central', '30 days', true, true, 'approved'),
('Unilever Uganda', 'Michael Ssemakula', 'trade@unilever.ug', '+256-414-230-500', 'Port Bell Road', 'Kampala', 'Kampala', 'Central', 'Net 30', true, true, 'approved');

-- Get the supplier IDs for product insertion
-- Note: In a real setup, you'd get these IDs from the database after insertion

-- Insert sample products (matching your frontend product data)
WITH supplier_ids AS (
  SELECT id, company_name FROM suppliers WHERE company_name IN ('Mukwano Group', 'Tilda Uganda Ltd', 'Fresh Dairy Uganda', 'Sugar Corporation of Uganda', 'Unilever Uganda')
),
category_ids AS (
  SELECT id, name FROM categories WHERE name IN ('Groceries', 'Cooking Oils', 'Grains & Cereals', 'Dairy & Spreads', 'Beverages')
)
INSERT INTO products (sku, barcode, name, description, category_id, supplier_id, cost_price, selling_price, weight, unit, min_stock_level, max_stock_level, country_of_origin, is_local_product, tags) 
SELECT 
  'MUK-OIL-2L' as sku,
  '6291018012345' as barcode,
  'Mukwano Cooking Oil 2L' as name,
  'Pure sunflower cooking oil' as description,
  (SELECT id FROM category_ids WHERE name = 'Cooking Oils') as category_id,
  (SELECT id FROM supplier_ids WHERE company_name = 'Mukwano Group') as supplier_id,
  9500 as cost_price,
  12000 as selling_price,
  2.0 as weight,
  'bottle' as unit,
  20 as min_stock_level,
  100 as max_stock_level,
  'Uganda' as country_of_origin,
  true as is_local_product,
  ARRAY['cooking', 'oil', 'sunflower'] as tags

UNION ALL

SELECT 
  'COWBOY-RICE-5KG',
  '6291018087654',
  'Cowboy Rice 5kg',
  'Premium quality parboiled rice',
  (SELECT id FROM category_ids WHERE name = 'Grains & Cereals'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Tilda Uganda Ltd'),
  15000,
  18000,
  5.0,
  'bag',
  15,
  80,
  'Uganda',
  true,
  ARRAY['rice', 'staple', 'grains']

UNION ALL

SELECT 
  'BLUEBAND-500G',
  '6291018051234',
  'Blue Band Margarine 500g',
  'Premium margarine for cooking and spreading',
  (SELECT id FROM category_ids WHERE name = 'Dairy & Spreads'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Unilever Uganda'),
  7200,
  8500,
  0.5,
  'tub',
  25,
  120,
  'Uganda',
  true,
  ARRAY['margarine', 'dairy', 'cooking']

UNION ALL

SELECT 
  'SFM-RICE-25KG',
  '6007890123456',
  'Super FM Radio Rice 25kg',
  'Premium quality parboiled rice - bulk pack',
  (SELECT id FROM category_ids WHERE name = 'Grains & Cereals'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Tilda Uganda Ltd'),
  75000,
  95000,
  25.0,
  'bag',
  5,
  50,
  'Uganda',
  true,
  ARRAY['rice', 'bulk', 'wholesale']

UNION ALL

SELECT 
  'FRESH-MILK-1L',
  '6001234567890',
  'Fresh Dairy Milk 1L',
  'Fresh pasteurized milk - 1 liter packet',
  (SELECT id FROM category_ids WHERE name = 'Dairy & Spreads'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Fresh Dairy Uganda'),
  3200,
  4500,
  1.0,
  'packet',
  30,
  200,
  'Uganda',
  true,
  ARRAY['milk', 'dairy', 'fresh']

UNION ALL

SELECT 
  'POSHO-MAIZE-1KG',
  '1234567890123',
  'Posho (Maize Flour) 1kg',
  'Fine maize flour for ugali and posho',
  (SELECT id FROM category_ids WHERE name = 'Grains & Cereals'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Tilda Uganda Ltd'),
  2000,
  2500,
  1.0,
  'bag',
  50,
  300,
  'Uganda',
  true,
  ARRAY['posho', 'maize', 'flour', 'staple']

UNION ALL

SELECT 
  'SUGAR-KAKIRA-1KG',
  '1234567890125',
  'Sugar - Kakira 1kg',
  'Pure white sugar from Kakira Sugar Works',
  (SELECT id FROM category_ids WHERE name = 'Groceries'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Sugar Corporation of Uganda'),
  2300,
  2800,
  1.0,
  'packet',
  40,
  200,
  'Uganda',
  true,
  ARRAY['sugar', 'kakira', 'sweetener']

UNION ALL

SELECT 
  'BEANS-RED-1KG',
  '1234567890127',
  'Beans - Red 1kg',
  'Premium red beans - locally sourced',
  (SELECT id FROM category_ids WHERE name = 'Grains & Cereals'),
  (SELECT id FROM supplier_ids WHERE company_name = 'Tilda Uganda Ltd'),
  2800,
  3200,
  1.0,
  'bag',
  30,
  150,
  'Uganda',
  true,
  ARRAY['beans', 'red', 'protein', 'local'];

-- Insert initial inventory for all products
INSERT INTO inventory (product_id, current_stock, location, last_restocked, average_cost, last_cost)
SELECT 
  p.id,
  CASE 
    WHEN p.sku = 'MUK-OIL-2L' THEN 67
    WHEN p.sku = 'COWBOY-RICE-5KG' THEN 23
    WHEN p.sku = 'BLUEBAND-500G' THEN 45
    WHEN p.sku = 'SFM-RICE-25KG' THEN 8
    WHEN p.sku = 'FRESH-MILK-1L' THEN 85
    WHEN p.sku = 'POSHO-MAIZE-1KG' THEN 150
    WHEN p.sku = 'SUGAR-KAKIRA-1KG' THEN 95
    WHEN p.sku = 'BEANS-RED-1KG' THEN 120
    ELSE 50
  END as current_stock,
  CASE 
    WHEN p.sku LIKE '%OIL%' THEN 'Aisle 2, Shelf C'
    WHEN p.sku LIKE '%RICE%' THEN 'Aisle 1, Shelf A'
    WHEN p.sku LIKE '%DAIRY%' OR p.sku LIKE '%MILK%' THEN 'Aisle 3, Shelf B'
    ELSE 'Main Store'
  END as location,
  CURRENT_TIMESTAMP - INTERVAL '3 days' as last_restocked,
  p.cost_price,
  p.cost_price
FROM products p;

-- Insert sample customers
INSERT INTO customers (first_name, last_name, email, phone, address, city, district, region, total_purchases, total_orders, loyalty_points, customer_since) VALUES
('Namukasa', 'Grace', 'namukasa@gmail.com', '+256-700-100001', 'Plot 15 Kitante Road', 'Kampala', 'Kampala', 'Central', 425000, 15, 850, '2023-06-15'),
('Okello', 'Patrick', 'okello.p@yahoo.com', '+256-700-100002', 'Jinja Road Estate', 'Kampala', 'Kampala', 'Central', 675000, 22, 1350, '2023-04-10'),
('Asiimwe', 'Mary', 'mary.asiimwe@outlook.com', '+256-700-100003', 'Ntinda Shopping Center', 'Kampala', 'Kampala', 'Central', 285000, 12, 570, '2023-09-20'),
('Mubiru', 'John', 'john.mubiru@gmail.com', '+256-700-100004', 'Bugolobi Flats', 'Kampala', 'Kampala', 'Central', 150000, 8, 300, '2023-11-05');

-- Insert sample orders (recent POS transactions)
WITH recent_customers AS (
  SELECT id, first_name, last_name FROM customers LIMIT 4
),
cashier_ids AS (
  SELECT id FROM users WHERE role = 'cashier' LIMIT 2
)
INSERT INTO orders (order_number, customer_id, employee_id, order_type, status, subtotal, tax_amount, total_amount, payment_method, payment_status, order_date) 
SELECT 
  'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-001' as order_number,
  (SELECT id FROM recent_customers WHERE first_name = 'Namukasa') as customer_id,
  (SELECT id FROM cashier_ids LIMIT 1) as employee_id,
  'pos' as order_type,
  'completed' as status,
  125000 as subtotal,
  22500 as tax_amount,
  147500 as total_amount,
  'cash' as payment_method,
  'completed' as payment_status,
  CURRENT_TIMESTAMP - INTERVAL '2 hours' as order_date

UNION ALL

SELECT 
  'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-002',
  (SELECT id FROM recent_customers WHERE first_name = 'Okello'),
  (SELECT id FROM cashier_ids LIMIT 1),
  'pos',
  'completed',
  67500,
  12150,
  79650,
  'mobile_money',
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '1 hour' as order_date

UNION ALL

SELECT 
  'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-003',
  (SELECT id FROM recent_customers WHERE first_name = 'Asiimwe'),
  (SELECT id FROM cashier_ids LIMIT 1),
  'pos',
  'completed',
  185000,
  33300,
  218300,
  'card',
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '30 minutes' as order_date

UNION ALL

SELECT 
  'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-004',
  (SELECT id FROM recent_customers WHERE first_name = 'Mubiru'),
  (SELECT id FROM cashier_ids LIMIT 1),
  'pos',
  'completed',
  32000,
  5760,
  37760,
  'cash',
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '10 minutes' as order_date;

-- Insert order items for the sample orders
WITH order_data AS (
  SELECT id, order_number FROM orders WHERE order_number LIKE 'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '%'
),
product_data AS (
  SELECT id, sku, selling_price FROM products
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, product_sku)
-- Order 1 items (Namukasa Grace - UGX 125,000)
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-001') as order_id,
  (SELECT id FROM product_data WHERE sku = 'MUK-OIL-2L') as product_id,
  2 as quantity,
  12000 as unit_price,
  24000 as total_price,
  'Mukwano Cooking Oil 2L' as product_name,
  'MUK-OIL-2L' as product_sku
UNION ALL
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-001'),
  (SELECT id FROM product_data WHERE sku = 'COWBOY-RICE-5KG'),
  3,
  18000,
  54000,
  'Cowboy Rice 5kg',
  'COWBOY-RICE-5KG'
UNION ALL
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-001'),
  (SELECT id FROM product_data WHERE sku = 'SUGAR-KAKIRA-1KG'),
  5,
  2800,
  14000,
  'Sugar - Kakira 1kg',
  'SUGAR-KAKIRA-1KG'
UNION ALL
-- Order 2 items (Okello Patrick - UGX 67,500)  
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-002'),
  (SELECT id FROM product_data WHERE sku = 'POSHO-MAIZE-1KG'),
  8,
  2500,
  20000,
  'Posho (Maize Flour) 1kg',
  'POSHO-MAIZE-1KG'
UNION ALL
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-002'),
  (SELECT id FROM product_data WHERE sku = 'BEANS-RED-1KG'),
  6,
  3200,
  19200,
  'Beans - Red 1kg',
  'BEANS-RED-1KG'
UNION ALL
-- Order 3 items (Asiimwe Mary - UGX 185,000)
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-003'),
  (SELECT id FROM product_data WHERE sku = 'SFM-RICE-25KG'),
  2,
  95000,
  190000,
  'Super FM Radio Rice 25kg',
  'SFM-RICE-25KG'
UNION ALL
-- Order 4 items (Mubiru John - UGX 32,000)
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-004'),
  (SELECT id FROM product_data WHERE sku = 'FRESH-MILK-1L'),
  4,
  4500,
  18000,
  'Fresh Dairy Milk 1L',
  'FRESH-MILK-1L'
UNION ALL
SELECT 
  (SELECT id FROM order_data WHERE order_number LIKE '%-004'),
  (SELECT id FROM product_data WHERE sku = 'BLUEBAND-500G'),
  2,
  8500,
  17000,
  'Blue Band Margarine 500g',
  'BLUEBAND-500G';

-- Insert payment records for completed orders
INSERT INTO payments (order_id, payment_method, amount, currency, status, processed_at, processed_by, mobile_number, network, transaction_id)
SELECT 
  o.id as order_id,
  o.payment_method,
  o.total_amount as amount,
  'UGX' as currency,
  'completed' as status,
  o.order_date as processed_at,
  o.employee_id as processed_by,
  CASE 
    WHEN o.payment_method = 'mobile_money' THEN '+256-700-100002'
    ELSE NULL 
  END as mobile_number,
  CASE 
    WHEN o.payment_method = 'mobile_money' THEN 'MTN'
    ELSE NULL 
  END as network,
  CASE 
    WHEN o.payment_method = 'mobile_money' THEN 'MTN' || EXTRACT(epoch FROM o.order_date)::bigint
    ELSE NULL 
  END as transaction_id
FROM orders o 
WHERE o.order_number LIKE 'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '%';

-- Insert employee attendance records (last 7 days)
INSERT INTO employee_attendance (employee_id, date, clock_in, clock_out, hours_worked, status)
SELECT 
  u.id as employee_id,
  generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date,
  (generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') + TIME '08:00:00')::timestamptz as clock_in,
  (generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') + TIME '17:00:00')::timestamptz as clock_out,
  INTERVAL '8 hours' as hours_worked,
  'present' as status
FROM users u 
WHERE u.role IN ('employee', 'cashier', 'manager')
AND u.employee_id IS NOT NULL;

-- Insert employee performance records (last 30 days)
INSERT INTO employee_performance (employee_id, performance_date, daily_sales, transactions_processed, items_sold, efficiency_score, customer_satisfaction_score)
SELECT 
  u.id as employee_id,
  generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date as performance_date,
  CASE 
    WHEN u.role = 'cashier' THEN 150000 + (RANDOM() * 100000)::int
    WHEN u.role = 'manager' THEN 300000 + (RANDOM() * 200000)::int
    ELSE 50000 + (RANDOM() * 50000)::int
  END as daily_sales,
  CASE 
    WHEN u.role = 'cashier' THEN 15 + (RANDOM() * 20)::int
    ELSE 5 + (RANDOM() * 10)::int
  END as transactions_processed,
  CASE 
    WHEN u.role = 'cashier' THEN 45 + (RANDOM() * 50)::int
    ELSE 15 + (RANDOM() * 25)::int
  END as items_sold,
  85 + (RANDOM() * 15) as efficiency_score,
  4.0 + (RANDOM() * 1.0) as customer_satisfaction_score
FROM users u 
WHERE u.role IN ('employee', 'cashier', 'manager')
AND u.employee_id IS NOT NULL;

-- Create some notification examples
INSERT INTO notifications (user_id, role, title, message, type, category) VALUES
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), NULL, 'Low Stock Alert', 'Super FM Radio Rice 25kg is running low (8 units remaining)', 'warning', 'inventory'),
((SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'manager', 'Daily Sales Report', 'Today''s sales: UGX 2,847,500 (Target: UGX 3,000,000)', 'info', 'sales'),
(NULL, 'cashier', 'New Product Added', 'Mukwano Cooking Oil 2L has been added to inventory', 'success', 'inventory');

-- Add some initial permissions for roles
INSERT INTO user_permissions (user_id, role, users_permissions, inventory_permissions, sales_permissions, finance_permissions, settings_permissions)
SELECT 
  u.id,
  u.role,
  CASE u.role
    WHEN 'admin' THEN '{"view_users": true, "create_users": true, "edit_users": true, "delete_users": true, "bulk_actions": true, "manage_roles": true}'::jsonb
    WHEN 'manager' THEN '{"view_users": true, "create_users": true, "edit_users": true, "delete_users": false, "bulk_actions": true, "manage_roles": false}'::jsonb
    ELSE '{"view_users": false, "create_users": false, "edit_users": false, "delete_users": false, "bulk_actions": false, "manage_roles": false}'::jsonb
  END,
  CASE u.role
    WHEN 'admin' THEN '{"view_inventory": true, "add_items": true, "edit_items": true, "delete_items": true, "manage_stock": true, "view_reports": true}'::jsonb
    WHEN 'manager' THEN '{"view_inventory": true, "add_items": true, "edit_items": true, "delete_items": false, "manage_stock": true, "view_reports": true}'::jsonb
    WHEN 'cashier' THEN '{"view_inventory": true, "add_items": false, "edit_items": false, "delete_items": false, "manage_stock": false, "view_reports": false}'::jsonb
    ELSE '{}'::jsonb
  END,
  CASE u.role
    WHEN 'admin' THEN '{"process_sales": true, "view_sales": true, "manage_discounts": true, "void_sales": true, "access_reports": true, "manage_refunds": true}'::jsonb
    WHEN 'manager' THEN '{"process_sales": true, "view_sales": true, "manage_discounts": true, "void_sales": true, "access_reports": true, "manage_refunds": false}'::jsonb
    WHEN 'cashier' THEN '{"process_sales": true, "view_sales": false, "manage_discounts": false, "void_sales": false, "access_reports": false, "manage_refunds": false}'::jsonb
    ELSE '{}'::jsonb
  END,
  CASE u.role
    WHEN 'admin' THEN '{"view_finances": true, "manage_payments": true, "handle_refunds": true, "generate_reports": true, "manage_expenses": true, "view_analytics": true}'::jsonb
    WHEN 'manager' THEN '{"view_finances": true, "manage_payments": true, "handle_refunds": false, "generate_reports": true, "manage_expenses": false, "view_analytics": true}'::jsonb
    ELSE '{}'::jsonb
  END,
  CASE u.role
    WHEN 'admin' THEN '{"view_settings": true, "edit_settings": true, "manage_integrations": true, "system_backup": true, "manage_notifications": true, "access_logs": true}'::jsonb
    WHEN 'manager' THEN '{"view_settings": true, "edit_settings": false, "manage_integrations": false, "system_backup": false, "manage_notifications": true, "access_logs": true}'::jsonb
    ELSE '{}'::jsonb
  END
FROM users u
WHERE u.role IN ('admin', 'manager', 'employee', 'cashier');

COMMENT ON SCHEMA public IS 'Sample data inserted for FAREDEAL POS system testing with realistic Uganda-based scenarios.';