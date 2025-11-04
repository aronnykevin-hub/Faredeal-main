-- Add brand column to products table
-- Run this in your Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Add comment
COMMENT ON COLUMN products.brand IS 'Product brand or manufacturer name';

-- Create index for faster brand searches
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Update existing products with empty brand to NULL
UPDATE products 
SET brand = NULL 
WHERE brand = '';

-- Success message
SELECT 'Brand column added successfully to products table!' as status;
