-- Complete Products Table Migration
-- This adds all missing columns for the inventory management system
-- Run this in your Supabase SQL Editor

-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 18,
ADD COLUMN IF NOT EXISTS weight DECIMAL(8,3),
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN products.brand IS 'Product brand or manufacturer name';
COMMENT ON COLUMN products.model IS 'Product model number';
COMMENT ON COLUMN products.cost_price IS 'Buying price from supplier (UGX)';
COMMENT ON COLUMN products.selling_price IS 'Retail selling price (UGX)';
COMMENT ON COLUMN products.markup_percentage IS 'Calculated markup percentage';
COMMENT ON COLUMN products.tax_rate IS 'Tax rate percentage (default 18% VAT for Uganda)';
COMMENT ON COLUMN products.weight IS 'Product weight in kg';
COMMENT ON COLUMN products.dimensions IS 'Product dimensions {length, width, height, unit}';
COMMENT ON COLUMN products.images IS 'Array of product image URLs';
COMMENT ON COLUMN products.specifications IS 'Additional product specifications';
COMMENT ON COLUMN products.is_active IS 'Whether product is active for sale';
COMMENT ON COLUMN products.is_service IS 'Whether this is a service item (no inventory)';
COMMENT ON COLUMN products.track_inventory IS 'Whether to track inventory for this product';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products(cost_price);
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON products(selling_price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Update existing products with default values
UPDATE products 
SET 
  cost_price = COALESCE(cost_price, 0),
  selling_price = COALESCE(selling_price, 0),
  tax_rate = COALESCE(tax_rate, 18),
  is_active = COALESCE(is_active, TRUE),
  is_service = COALESCE(is_service, FALSE),
  track_inventory = COALESCE(track_inventory, TRUE),
  images = COALESCE(images, '[]'::jsonb),
  specifications = COALESCE(specifications, '{}'::jsonb)
WHERE cost_price IS NULL OR selling_price IS NULL;

-- Make cost_price and selling_price NOT NULL after setting defaults
ALTER TABLE products 
ALTER COLUMN cost_price SET NOT NULL,
ALTER COLUMN selling_price SET NOT NULL;

-- Success message
SELECT 'Products table updated successfully with all columns!' as status;
