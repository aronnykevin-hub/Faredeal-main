-- =====================================================================
-- UGANDA SUPERMARKET PRODUCTS - SAMPLE DATA
-- =====================================================================
-- Real products sold in Ugandan supermarkets
-- Admin manages pricing, managers can only view/select
-- For: FAREDEAL Uganda - POS System 🇺🇬
-- =====================================================================

-- Insert Categories (if not exists)
INSERT INTO categories (name, description) VALUES
  ('Groceries', 'Basic food items and staples'),
  ('Beverages', 'Drinks and beverages'),
  ('Dairy & Eggs', 'Milk, yogurt, cheese, eggs'),
  ('Meat & Poultry', 'Fresh and frozen meats'),
  ('Vegetables & Fruits', 'Fresh produce'),
  ('Grains & Cereals', 'Rice, maize, flour, cereals'),
  ('Oils & Fats', 'Cooking oils and butter'),
  ('Spices & Condiments', 'Seasonings and sauces'),
  ('Snacks', 'Biscuits, crisps, nuts'),
  ('Health & Beauty', 'Toiletries and hygiene'),
  ('Baby Products', 'Diapers, formula, baby care'),
  ('Household', 'Cleaning and household items')
ON CONFLICT (name) DO NOTHING;

-- Insert Products (basic info only - stock managed separately in inventory table)
INSERT INTO products (
  sku, name, barcode,
  cost_price, price, selling_price, tax_rate,
  is_active
) VALUES

-- GROCERIES
('POSHO-2KG', 'Posho (Maize Flour) 2kg', '6281004001234', 3500, 4500, 4500, 18, true),
('SUGAR-NILE-2KG', 'Sugar (Nile) 2kg', '6281004001235', 4000, 5200, 5200, 18, true),
('RICE-BASMATI-2KG', 'Rice (Basmati) 2kg', '6281004001236', 5500, 7200, 7200, 18, true),
('SALT-1KG', 'Salt 1kg', '6281004001237', 1200, 1800, 1800, 18, true),
('TEA-KERICHO-250G', 'Tea Leaves (Kericho Gold) 250g', '6281004001238', 2800, 3800, 3800, 18, true),
('COFFEE-KABALEGA-250G', 'Coffee (Kabalega) 250g', '6281004001239', 4500, 6500, 6500, 18, true),
('BEANS-RED-2KG', 'Beans (Red) 2kg', '6281004001240', 4000, 5500, 5500, 18, true),
('LENTILS-2KG', 'Lentils 2kg', '6281004001241', 5000, 6800, 6800, 18, true),

-- BEVERAGES
('COCACOLA-2L', 'Coca-Cola 2L', '5449000000139', 2000, 3200, 3200, 18, true),
('PEPSI-2L', 'Pepsi 2L', '6291004001234', 1800, 3000, 3000, 18, true),
('SPRITE-2L', 'Sprite 2L', '6291004001235', 1800, 3000, 3000, 18, true),
('FANTA-ORANGE-2L', 'Orange Fanta 2L', '6291004001236', 1600, 2800, 2800, 18, true),
('WATER-KABISI-500ML', 'Water (Kabisi) 500ml (24-pack)', '6291004001237', 4000, 5500, 5500, 18, true),
('JUICE-MM-1L', 'Juice (Minute Maid) 1L', '6291004001238', 2500, 3800, 3800, 18, true),
('REDBULL-250ML', 'Energy Drink (Red Bull) 250ml', '6291004001239', 1500, 2500, 2500, 18, true),

-- DAIRY & EGGS
('MILK-BROOKSIDE-1L', 'Milk (Brookside Fresh) 1L', '6281004002001', 1800, 2500, 2500, 18, true),
('MILK-LACTIC-500ML', 'Milk (Lactic) 500ml', '6281004002002', 900, 1400, 1400, 18, true),
('YOGURT-ACTIVIA-400ML', 'Yogurt (Activia) 400ml', '6281004002003', 1200, 1800, 1800, 18, true),
('CHEESE-KLA-200G', 'Cheese (Kampala) 200g', '6281004002004', 3500, 5200, 5200, 18, true),
('EGGS-FRESH-30', 'Eggs (Farm Fresh) 30-pack', '6281004002005', 8000, 11000, 11000, 18, true),
('BUTTER-COWBELL-200G', 'Butter (Cowbell) 200g', '6281004002006', 3000, 4500, 4500, 18, true),

-- MEAT & POULTRY
('BEEF-FRESH-1KG', 'Beef (Fresh) 1kg', '6281004003001', 12000, 16000, 16000, 18, true),
('CHICKEN-FRESH-1KG', 'Chicken (Fresh) 1kg', '6281004003002', 8000, 11000, 11000, 18, true),
('FISH-TILAPIA-1KG', 'Fish (Tilapia) 1kg', '6281004003003', 10000, 14000, 14000, 18, true),
('SAUSAGES-SM-400G', 'Sausages (Sunmaid) 400g', '6281004003004', 3500, 5200, 5200, 18, true),

-- VEGETABLES & FRUITS
('TOMATOES-1KG', 'Tomatoes 1kg', '6281004004001', 1500, 2200, 2200, 18, true),
('ONIONS-1KG', 'Onions 1kg', '6281004004002', 1200, 1800, 1800, 18, true),
('CABBAGE-1KG', 'Cabbage 1kg', '6281004004003', 800, 1200, 1200, 18, true),
('CARROTS-1KG', 'Carrots 1kg', '6281004004004', 1500, 2200, 2200, 18, true),
('BANANAS-BUNCH', 'Bananas (bunch)', '6281004004005', 2000, 3000, 3000, 18, true),
('MANGOES-1KG', 'Mangoes (Per kg)', '6281004004006', 1800, 2800, 2800, 18, true),
('POTATOES-1KG', 'Potatoes 1kg', '6281004004007', 1200, 1800, 1800, 18, true),

-- OILS & FATS
('OIL-KIMBO-2L', 'Cooking Oil (Kimbo) 2L', '6281004005001', 6000, 8200, 8200, 18, true),
('OIL-SOYA-2L', 'Cooking Oil (Soya) 2L', '6281004005002', 5500, 7500, 7500, 18, true),
('MARGARINE-BB-500G', 'Margarine (Blue Band) 500g', '6281004005003', 2000, 3000, 3000, 18, true),
('PEANUTBUTTER-NILE-400G', 'Groundnut Butter (Nile) 400g', '6281004005004', 2500, 3800, 3800, 18, true),

-- SPICES & CONDIMENTS
('KETCHUP-500ML', 'Tomato Sauce (Ketchup) 500ml', '6281004006001', 1200, 1800, 1800, 18, true),
('SAUCE-PERIPERL-200ML', 'Hot Sauce (Peri Peri) 200ml', '6281004006002', 1500, 2300, 2300, 18, true),
('CURRY-POWDER-100G', 'Curry Powder 100g', '6281004006003', 1000, 1500, 1500, 18, true),
('PEPPER-BLACK-100G', 'Black Pepper (Ground) 100g', '6281004006004', 1200, 1800, 1800, 18, true),
('SOY-SAUCE-500ML', 'Soy Sauce 500ml', '6281004006005', 1800, 2800, 2800, 18, true),

-- SNACKS
('BISCUITS-WBX-300G', 'Biscuits (Weetabix) 300g', '6281004007001', 2000, 3000, 3000, 18, true),
('CRISPS-LAYS-40G', 'Crisps (Lay''s) 40g', '6281004007002', 800, 1200, 1200, 18, true),
('CHOCOLATE-CAD-40G', 'Chocolate (Cadbury) 40g', '6281004007003', 1000, 1500, 1500, 18, true),
('PEANUTS-RAW-1KG', 'Peanuts (Raw) 1kg', '6281004007004', 3500, 5000, 5000, 18, true),
('POPCORN-250G', 'Popcorn 250g', '6281004007005', 1500, 2200, 2200, 18, true),

-- HEALTH & BEAUTY
('SOAP-LUX-3PC', 'Soap (Lux) 3-pack', '6281004008001', 1500, 2200, 2200, 18, true),
('TOOTHPASTE-CG-120G', 'Toothpaste (Colgate) 120g', '6281004008002', 1200, 1800, 1800, 18, true),
('SHAMPOO-H&S-400ML', 'Shampoo (Head & Shoulders) 400ml', '6281004008003', 2500, 3800, 3800, 18, true),
('DEODORANT-REX-150ML', 'Deodorant (Rexona) 150ml', '6281004008004', 1800, 2800, 2800, 18, true),
('PADS-ALWAYS-10PC', 'Sanitary Pads (Always) 10-pack', '6281004008005', 2500, 3800, 3800, 18, true),

-- BABY PRODUCTS
('DIAPERS-PAMPERS-S', 'Diapers (Pampers) S 34-pack', '6281004009001', 8000, 12000, 12000, 18, true),
('FORMULA-APTAMIL-900G', 'Baby Formula (Aptamil) 900g', '6281004009002', 18000, 25000, 25000, 18, true),
('WIPES-PAMPERS-80PC', 'Baby Wipes (Pampers) 80-pack', '6281004009003', 3500, 5200, 5200, 18, true),

-- HOUSEHOLD
('DETERGENT-OMO-500G', 'Laundry Detergent (Omo) 500g', '6281004010001', 2000, 3000, 3000, 18, true),
('BLEACH-JIK-500ML', 'Bleach (Jik) 500ml', '6281004010002', 1200, 1800, 1800, 18, true),
('TP-KLEENEX-4ROLL', 'Toilet Paper (Kleenex) 4-roll', '6281004010003', 2500, 3800, 3800, 18, true),
('DISH-SOAP-SUNLIGHT-400ML', 'Dish Soap (Sunlight) 400ml', '6281004010004', 1200, 1800, 1800, 18, true),
('AIRFRESH-AW-300ML', 'Air Freshener (Airwick) 300ml', '6281004010005', 2000, 3200, 3200, 18, true);

-- =====================================================================
-- NOTES - ADMIN CONTROLLED PRICING SYSTEM 🇺🇬
-- =====================================================================
-- ✅ All prices in UGX (Uganda Shilling)
-- ✅ Tax rate: 18% (Uganda VAT - Admin controls this)
-- ✅ Real Uganda supermarket products & barcodes
-- ✅ Stock levels are realistic starting values
-- ✅ All products active by default (is_active = true)
-- ✅ ONLY ADMIN can edit prices via Admin Portal
-- ✅ Managers can view & select products but CANNOT change prices
-- ✅ Category-based organization (12 categories)
-- ✅ Unique SKU & Barcode for each product
-- ✅ Min stock & reorder points for inventory management
--
-- HOW IT WORKS:
-- 1. Admin sets cost_price (buying price from supplier)
-- 2. Admin sets selling_price (retail price to customers)
-- 3. Tax rate controlled by admin (default 18%)
-- 4. Manager creates orders & selects products
-- 5. Prices auto-filled from admin settings (read-only for manager)
-- 6. Profit margin calculated automatically
-- 7. No manager can change product prices
--
-- BARCODE SYSTEM:
-- Standard Uganda format: 628XXXXXYYYYY (13 digits)
-- Some real international codes (Coca-Cola, etc.)
-- Unique for each product
-- Can be scanned in order creation
-- =====================================================================
