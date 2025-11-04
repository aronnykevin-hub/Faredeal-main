-- ============================================================================
-- INVENTORY SYSTEM TABLES - COMPLETE DEPLOYMENT
-- ============================================================================
-- This creates all necessary tables for the inventory management system
-- Run this in Supabase SQL Editor
--
-- Tables Created:
-- 1. categories - Product categories
-- 2. suppliers - Supplier information
-- 3. products - Product catalog
-- 4. inventory - Stock levels and locations
-- 5. inventory_movements - Stock movement tracking
-- 6. stock_adjustments - Manual stock adjustments log
-- 7. purchase_orders - Purchase orders from suppliers
-- 8. purchase_order_items - Line items for purchase orders
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUMS (Create if not exists)
-- ============================================================================

-- Create enums only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification', 'blocked');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
        CREATE TYPE inventory_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'discontinued');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
        CREATE TYPE inventory_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'return', 'transfer', 'damage', 'theft', 'reorder', 'manual_adjust');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        CREATE TYPE purchase_status AS ENUM ('draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled');
    END IF;
END $$;

-- ============================================================================
-- TABLE 1: CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parent_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN parent_id UUID;
    END IF;
END $$;

-- Add self-referencing foreign key after table creation (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_categories_parent'
    ) THEN
        ALTER TABLE categories 
        ADD CONSTRAINT fk_categories_parent 
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ============================================================================
-- TABLE 2: SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    tax_number VARCHAR(50),
    business_license VARCHAR(100),
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add is_active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add rating column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' AND column_name = 'rating'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN rating DECIMAL(3,2) DEFAULT 0;
    END IF;

    -- Add rating check constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'suppliers_rating_check'
    ) THEN
        ALTER TABLE suppliers ADD CONSTRAINT suppliers_rating_check CHECK (rating >= 0 AND rating <= 5);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- ============================================================================
-- TABLE 3: PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
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
    tax_rate DECIMAL(5,2) DEFAULT 0,
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

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_supplier_id_fkey'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF;

    -- Add check constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_price_check'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_cost_price_check CHECK (cost_price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_selling_price_check'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_selling_price_check CHECK (selling_price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_tax_rate_check'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_tax_rate_check CHECK (tax_rate >= 0 AND tax_rate <= 100);
    END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ============================================================================
-- TABLE 4: INVENTORY (Main Stock Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    minimum_stock INTEGER DEFAULT 0 CHECK (minimum_stock >= 0),
    maximum_stock INTEGER DEFAULT 1000 CHECK (maximum_stock >= 0),
    reorder_point INTEGER DEFAULT 10 CHECK (reorder_point >= 0),
    reorder_quantity INTEGER DEFAULT 50 CHECK (reorder_quantity >= 0),
    status inventory_status DEFAULT 'in_stock',
    location VARCHAR(100),
    warehouse VARCHAR(100) DEFAULT 'Main Warehouse',
    bin_location VARCHAR(50),
    last_counted_at TIMESTAMP WITH TIME ZONE,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_max_greater_than_min CHECK (maximum_stock >= minimum_stock)
);

-- Create indexes (with checks for column existence)
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Only create status index if status column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
    END IF;
END $$;

-- Only create low_stock index if columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'current_stock'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'minimum_stock'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, minimum_stock) 
        WHERE current_stock <= minimum_stock;
    END IF;
END $$;

-- ============================================================================
-- TABLE 5: INVENTORY MOVEMENTS (Stock Movement History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    movement_type inventory_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_number VARCHAR(100),
    reference_type VARCHAR(50), -- 'sale', 'purchase_order', 'adjustment', etc.
    reference_id UUID,
    cost_per_unit DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    location VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at DESC);

-- ============================================================================
-- TABLE 6: STOCK ADJUSTMENTS (Manual Adjustments Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL, -- 'increase', 'decrease', 'recount'
    quantity_before INTEGER NOT NULL,
    quantity_adjusted INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_adjustments_product_id ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_created_by ON stock_adjustments(created_by);
CREATE INDEX IF NOT EXISTS idx_adjustments_created_at ON stock_adjustments(created_at DESC);

-- ============================================================================
-- TABLE 7: PURCHASE ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status purchase_status DEFAULT 'draft',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON purchase_orders(order_date DESC);

-- ============================================================================
-- TABLE 8: PURCHASE ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost DECIMAL(15,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(15,2) NOT NULL CHECK (total_cost >= 0),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_quantity_received CHECK (quantity_received <= quantity_ordered)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product_id ON purchase_order_items(product_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGER: Auto-update inventory status based on stock levels
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock = 0 THEN
        NEW.status = 'out_of_stock';
    ELSIF NEW.current_stock <= NEW.minimum_stock THEN
        NEW.status = 'low_stock';
    ELSE
        NEW.status = 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_inventory_status ON inventory;
CREATE TRIGGER auto_update_inventory_status
    BEFORE INSERT OR UPDATE OF current_stock, minimum_stock ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- ============================================================================
-- TRIGGER: Log inventory movements automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION log_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.current_stock != NEW.current_stock THEN
        INSERT INTO inventory_movements (
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            notes
        ) VALUES (
            NEW.product_id,
            CASE 
                WHEN NEW.current_stock > OLD.current_stock THEN 'adjustment'::inventory_movement_type
                ELSE 'adjustment'::inventory_movement_type
            END,
            NEW.current_stock - OLD.current_stock,
            OLD.current_stock,
            NEW.current_stock,
            'Auto-logged from inventory update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_log_inventory_movement ON inventory;
CREATE TRIGGER auto_log_inventory_movement
    AFTER UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Drop all existing policies on these tables
    DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
    DROP POLICY IF EXISTS "Allow authenticated users to manage categories" ON categories;
    DROP POLICY IF EXISTS "Allow authenticated read access to suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Allow authenticated users to manage suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Allow public read access to active products" ON products;
    DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products;
    DROP POLICY IF EXISTS "Allow authenticated read access to inventory" ON inventory;
    DROP POLICY IF EXISTS "Allow authenticated users to manage inventory" ON inventory;
    DROP POLICY IF EXISTS "Allow authenticated read access to inventory movements" ON inventory_movements;
    DROP POLICY IF EXISTS "Allow authenticated users to log inventory movements" ON inventory_movements;
    DROP POLICY IF EXISTS "Allow authenticated read access to stock adjustments" ON stock_adjustments;
    DROP POLICY IF EXISTS "Allow authenticated users to create stock adjustments" ON stock_adjustments;
    DROP POLICY IF EXISTS "Allow authenticated read access to purchase orders" ON purchase_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to manage purchase orders" ON purchase_orders;
    DROP POLICY IF EXISTS "Allow authenticated read access to PO items" ON purchase_order_items;
    DROP POLICY IF EXISTS "Allow authenticated users to manage PO items" ON purchase_order_items;
END $$;

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for categories (public read, authenticated write)
DO $$ 
BEGIN
    CREATE POLICY "Allow public read access to categories"
        ON categories FOR SELECT
        TO public
        USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage categories"
        ON categories FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for suppliers (authenticated users only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to suppliers"
        ON suppliers FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage suppliers"
        ON suppliers FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for products (public read active, authenticated manage)
DO $$ 
BEGIN
    CREATE POLICY "Allow public read access to active products"
        ON products FOR SELECT
        TO public
        USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage products"
        ON products FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for inventory (authenticated only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to inventory"
        ON inventory FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage inventory"
        ON inventory FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for inventory_movements (authenticated only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to inventory movements"
        ON inventory_movements FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to log inventory movements"
        ON inventory_movements FOR INSERT
        TO authenticated
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for stock_adjustments (authenticated only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to stock adjustments"
        ON stock_adjustments FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to create stock adjustments"
        ON stock_adjustments FOR INSERT
        TO authenticated
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for purchase_orders (authenticated only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to purchase orders"
        ON purchase_orders FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage purchase orders"
        ON purchase_orders FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policies for purchase_order_items (authenticated only)
DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated read access to PO items"
        ON purchase_order_items FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "Allow authenticated users to manage PO items"
        ON purchase_order_items FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN (
    'categories',
    'suppliers',
    'products',
    'inventory',
    'inventory_movements',
    'stock_adjustments',
    'purchase_orders',
    'purchase_order_items'
)
ORDER BY tablename;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'categories',
    'suppliers',
    'products',
    'inventory',
    'inventory_movements',
    'stock_adjustments',
    'purchase_orders',
    'purchase_order_items'
)
ORDER BY tablename, indexname;

-- Check triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN (
    'categories',
    'suppliers',
    'products',
    'inventory',
    'inventory_movements',
    'stock_adjustments',
    'purchase_orders',
    'purchase_order_items'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- All inventory system tables created successfully!
-- 
-- Next steps:
-- 1. Run sample-products-inventory.sql to add sample data
-- 2. Configure RLS policies if needed for your specific use case
-- 3. Start using the inventory management system
-- ============================================================================
