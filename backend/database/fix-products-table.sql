-- ============================================================================
-- DIAGNOSTIC AND FIX FOR PRODUCTS TABLE
-- This will check if the table exists and create it if needed
-- ============================================================================

-- Step 1: Check if products table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE 'Products table does not exist. Creating it now...';
        
        -- Create products table
        CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sku VARCHAR(100) UNIQUE NOT NULL,
            barcode VARCHAR(100) UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category_id UUID,
            supplier_id UUID,
            brand VARCHAR(100),
            model VARCHAR(100),
            cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
            selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
            markup_percentage DECIMAL(5,2),
            tax_rate DECIMAL(5,2) DEFAULT 18,
            weight DECIMAL(8,3),
            dimensions JSONB,
            images JSONB DEFAULT '[]',
            specifications JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT TRUE,
            is_service BOOLEAN DEFAULT FALSE,
            track_inventory BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Products table created successfully!';
    ELSE
        RAISE NOTICE 'Products table already exists. Checking columns...';
    END IF;
END $$;

-- Step 2: Check and add missing columns
DO $$
DECLARE
    col_exists boolean;
BEGIN
    -- Check sku column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'sku'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(100) UNIQUE NOT NULL;
        RAISE NOTICE 'Added sku column';
    END IF;
    
    -- Check cost_price column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'cost_price'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(15,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added cost_price column';
    END IF;
    
    -- Check selling_price column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'selling_price'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN selling_price DECIMAL(15,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added selling_price column';
    END IF;
    
    -- Check brand column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'brand'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN brand VARCHAR(100);
        RAISE NOTICE 'Added brand column';
    END IF;
    
    -- Check markup_percentage column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'markup_percentage'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN markup_percentage DECIMAL(5,2);
        RAISE NOTICE 'Added markup_percentage column';
    END IF;
    
    -- Check tax_rate column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tax_rate'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 18;
        RAISE NOTICE 'Added tax_rate column';
    END IF;
    
    -- Check is_active column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_active'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column';
    END IF;
    
    -- Check track_inventory column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'track_inventory'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE products ADD COLUMN track_inventory BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added track_inventory column';
    END IF;
    
    RAISE NOTICE 'Column check complete!';
END $$;

-- Step 3: Show current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'products'
ORDER BY 
    ordinal_position;
