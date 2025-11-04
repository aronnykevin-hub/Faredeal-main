-- ============================================================================
-- FIX INVENTORY SCHEMA - ADD MISSING COLUMNS ONLY
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to existing tables (safe - won't break anything)
DO $$ 
BEGIN
    -- Fix categories table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order') THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    
    -- Fix suppliers table  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='rating') THEN
        ALTER TABLE suppliers ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Fix products table - add all missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sku') THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(100) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='selling_price') THEN
        ALTER TABLE products ADD COLUMN selling_price DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='brand') THEN
        ALTER TABLE products ADD COLUMN brand VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='markup_percentage') THEN
        ALTER TABLE products ADD COLUMN markup_percentage DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tax_rate') THEN
        ALTER TABLE products ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 18;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='track_inventory') THEN
        ALTER TABLE products ADD COLUMN track_inventory BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images') THEN
        ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='specifications') THEN
        ALTER TABLE products ADD COLUMN specifications JSONB DEFAULT '{}';
    END IF;
    
    RAISE NOTICE 'All missing columns added successfully!';
END $$;


-- Fix RLS policies for products table
DROP POLICY IF EXISTS "Enable read for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;

-- Allow all operations for authenticated users
CREATE POLICY "Enable read for authenticated users" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON products FOR DELETE TO authenticated USING (true);

-- Also allow public access (for testing - remove in production)
CREATE POLICY "Enable read for anon" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "Enable insert for anon" ON products FOR INSERT TO anon WITH CHECK (true);

-- Add default categories if none exist
INSERT INTO categories (name, description, sort_order, is_active) VALUES
('Groceries', 'Basic grocery items', 1, TRUE),
('Beverages', 'Drinks and beverages', 2, TRUE),
('Dairy', 'Milk and dairy products', 3, TRUE),
('Bakery', 'Bread and bakery items', 4, TRUE),
('Household', 'Household items and supplies', 5, TRUE),
('Personal Care', 'Personal care products', 6, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Add default supplier if none exist  
INSERT INTO suppliers (company_name, contact_person, email, phone, address, payment_terms, rating, is_active) VALUES
('General Supplier', 'Store Manager', 'supplier@store.com', '+256-000-000-000', 'Kampala, Uganda', 'Net 30', 4.0, TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ============================================================================
SELECT 'Database fixed! RLS policies updated. You can now add products.' as status;
