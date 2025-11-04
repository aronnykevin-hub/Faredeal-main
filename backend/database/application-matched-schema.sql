-- =====================================================================================
-- FAREDEAL POS SYSTEM - APPLICATION-MATCHED DATABASE SCHEMA
-- =====================================================================================
-- This schema is specifically designed to match your frontend application structure
-- Includes Uganda-specific features, mobile money payments, and portal systems

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For password hashing

-- =====================================================================================
-- CUSTOM TYPES AND ENUMS
-- =====================================================================================

-- User roles matching your application portals
CREATE TYPE user_role AS ENUM (
    'admin',           -- Admin Portal access
    'manager',         -- Manager Portal access  
    'employee',        -- General employee
    'cashier',         -- Employee/Cashier Portal access
    'customer',        -- Customer Portal access
    'supplier'         -- Supplier Portal access
);

-- Order status for POS transactions
CREATE TYPE order_status AS ENUM (
    'pending',
    'processing', 
    'confirmed',
    'completed',
    'cancelled',
    'refunded'
);

-- Payment status tracking
CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);

-- Payment methods matching your PaymentMethods components
CREATE TYPE payment_method AS ENUM (
    'cash',
    'mobile_money',      -- MTN Mobile Money
    'airtel_money',      -- Airtel Money
    'card',              -- Visa/Mastercard
    'bank_transfer',
    'credit'
);

-- Employee access levels from your ManagerPortal
CREATE TYPE access_level AS ENUM (
    'standard',
    'advanced', 
    'full'
);

-- Product condition and status
CREATE TYPE product_status AS ENUM (
    'active',
    'inactive',
    'discontinued',
    'out_of_stock'
);

-- Attendance status for employee tracking
CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'half_day',
    'on_leave'
);

-- =====================================================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================================================

-- Main users table (extends Supabase auth.users)
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar(255) UNIQUE NOT NULL,
    full_name varchar(255) NOT NULL,
    phone varchar(20),
    role user_role NOT NULL DEFAULT 'customer',
    avatar_url text,
    is_active boolean DEFAULT true,
    
    -- Employee-specific fields
    employee_id varchar(50) UNIQUE,
    department varchar(100),
    access_level access_level DEFAULT 'standard',
    hire_date date,
    salary decimal(12,2),
    commission_rate decimal(5,2) DEFAULT 0,
    
    -- Address information
    address text,
    city varchar(100),
    district varchar(100), -- Uganda districts
    postal_code varchar(20),
    country varchar(100) DEFAULT 'Uganda',
    
    -- Activity tracking
    last_login_at timestamptz,
    login_count integer DEFAULT 0,
    
    -- Additional metadata
    metadata jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Role-based permissions (matching your RoleService)
CREATE TABLE user_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    
    -- Permission categories from your roleService.jsx
    users_permissions jsonb DEFAULT '{}',      -- view_users, create_users, etc.
    inventory_permissions jsonb DEFAULT '{}',  -- view_inventory, add_items, etc.
    sales_permissions jsonb DEFAULT '{}',      -- process_sales, view_sales, etc.
    finance_permissions jsonb DEFAULT '{}',    -- view_finances, manage_payments, etc.
    settings_permissions jsonb DEFAULT '{}',   -- view_settings, edit_settings, etc.
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, role)
);

-- =====================================================================================
-- PRODUCT AND INVENTORY MANAGEMENT
-- =====================================================================================

-- Product categories (matching your frontend categories)
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) UNIQUE NOT NULL,
    description text,
    icon varchar(10), -- Emoji icons used in your app
    parent_id uuid REFERENCES categories(id),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers (including Uganda-specific data)
CREATE TABLE suppliers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id), -- Links to supplier user account
    company_name varchar(255) NOT NULL,
    contact_person varchar(255),
    email varchar(255),
    phone varchar(20),
    
    -- Uganda-specific address fields
    address text,
    city varchar(100),
    district varchar(100),
    region varchar(100), -- Central, Eastern, Northern, Western
    postal_code varchar(20),
    
    -- Business details
    tax_id varchar(100),
    business_license varchar(100),
    payment_terms varchar(100) DEFAULT 'Net 30',
    currency varchar(10) DEFAULT 'UGX',
    
    -- Performance metrics
    rating decimal(3,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    total_value decimal(15,2) DEFAULT 0,
    last_order_date date,
    
    -- Status and verification
    status varchar(50) DEFAULT 'pending', -- pending, approved, suspended
    is_local boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Products table (enhanced for Uganda market)
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku varchar(100) UNIQUE NOT NULL,
    barcode varchar(50) UNIQUE,
    qr_code text,
    
    -- Basic product info
    name varchar(255) NOT NULL,
    description text,
    brand varchar(100),
    
    -- Categorization
    category_id uuid REFERENCES categories(id),
    supplier_id uuid REFERENCES suppliers(id),
    
    -- Pricing (UGX)
    cost_price decimal(12,2) NOT NULL CHECK (cost_price >= 0),
    selling_price decimal(12,2) NOT NULL CHECK (selling_price >= 0),
    wholesale_price decimal(12,2),
    
    -- Physical attributes
    weight decimal(10,3), -- in kg
    dimensions jsonb, -- {length, width, height, unit}
    unit varchar(50) DEFAULT 'piece', -- piece, kg, liter, etc.
    
    -- Inventory alerts
    min_stock_level integer DEFAULT 10,
    max_stock_level integer DEFAULT 100,
    reorder_level integer DEFAULT 15,
    
    -- Uganda-specific fields
    country_of_origin varchar(100) DEFAULT 'Uganda',
    is_local_product boolean DEFAULT true,
    tax_rate decimal(5,2) DEFAULT 18, -- Uganda VAT rate
    
    -- Product status and features
    status product_status DEFAULT 'active',
    is_featured boolean DEFAULT false,
    is_perishable boolean DEFAULT false,
    expiry_days integer, -- Days until expiry for perishable items
    
    -- Tags and metadata
    tags text[],
    images text[],
    metadata jsonb DEFAULT '{}',
    
    -- Audit fields
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Inventory tracking (real-time stock levels)
CREATE TABLE inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    
    -- Stock levels
    current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock integer DEFAULT 0 CHECK (reserved_stock >= 0), -- Orders pending fulfillment
    available_stock integer GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- Location tracking
    location varchar(100) DEFAULT 'main_store', -- Aisle-Shelf format from your app
    bin_location varchar(50), -- Specific shelf location
    
    -- Restock information
    last_restocked timestamptz,
    next_reorder_date date,
    supplier_lead_time integer DEFAULT 7, -- days
    
    -- Cost tracking
    average_cost decimal(12,2), -- Weighted average cost
    last_cost decimal(12,2), -- Most recent purchase cost
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, location)
);

-- Stock movements (audit trail)
CREATE TABLE stock_movements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id uuid REFERENCES products(id),
    
    -- Movement details
    movement_type varchar(50) NOT NULL, -- restock, sale, adjustment, transfer, return
    quantity_change integer NOT NULL, -- positive for increase, negative for decrease
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    
    -- Reference information
    reference_id uuid, -- Order ID, Purchase Order ID, etc.
    reference_type varchar(50), -- order, purchase_order, adjustment
    
    -- Additional details
    unit_cost decimal(12,2),
    total_cost decimal(12,2),
    reason text,
    notes text,
    
    -- Audit fields
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- CUSTOMER MANAGEMENT
-- =====================================================================================

-- Customer profiles (separate from users for better organization)
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id), -- Links to user account if registered
    
    -- Basic info
    first_name varchar(100),
    last_name varchar(100),
    email varchar(255),
    phone varchar(20),
    
    -- Address (Uganda format)
    address text,
    city varchar(100),
    district varchar(100),
    region varchar(100),
    postal_code varchar(20),
    
    -- Customer metrics
    total_purchases decimal(15,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    
    -- Preferences
    preferred_payment_method payment_method,
    communication_preferences jsonb DEFAULT '{}', -- SMS, Email, WhatsApp
    
    -- Status
    is_active boolean DEFAULT true,
    customer_since date DEFAULT CURRENT_DATE,
    last_purchase_date date,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- ORDER AND SALES SYSTEM
-- =====================================================================================

-- Orders table (matching your POS system)
CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number varchar(50) UNIQUE NOT NULL,
    
    -- Customer and employee
    customer_id uuid REFERENCES customers(id),
    employee_id uuid REFERENCES users(id), -- Cashier who processed the order
    
    -- Order details
    order_type varchar(50) DEFAULT 'pos', -- pos, delivery, online, takeaway
    status order_status DEFAULT 'pending',
    
    -- Financial details (UGX)
    subtotal decimal(12,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount decimal(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount decimal(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount decimal(12,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Payment information
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    payment_reference varchar(255), -- Mobile money transaction ID
    
    -- Delivery information (for delivery orders)
    delivery_address jsonb,
    delivery_date date,
    delivery_time time,
    delivery_instructions text,
    
    -- Additional fields
    notes text,
    loyalty_points_earned integer DEFAULT 0,
    loyalty_points_used integer DEFAULT 0,
    
    -- Timestamps
    order_date timestamptz DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamptz,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Order items (products in each order)
CREATE TABLE order_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    
    -- Item details
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price decimal(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price decimal(12,2) NOT NULL CHECK (total_price >= 0),
    
    -- Discount applied to this item
    discount_amount decimal(12,2) DEFAULT 0,
    
    -- Product snapshot (in case product details change)
    product_name varchar(255),
    product_sku varchar(100),
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- PAYMENT SYSTEM (Mobile Money + Traditional)
-- =====================================================================================

-- Payment transactions
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id),
    
    -- Payment details
    payment_method payment_method NOT NULL,
    amount decimal(12,2) NOT NULL CHECK (amount > 0),
    currency varchar(10) DEFAULT 'UGX',
    
    -- Mobile money specific fields
    mobile_number varchar(20), -- For MTN/Airtel Mobile Money
    network varchar(50), -- MTN, Airtel, etc.
    transaction_id varchar(255), -- Mobile money transaction ID
    
    -- Card payment fields
    card_last_four varchar(4),
    card_type varchar(50), -- Visa, Mastercard
    
    -- Status and timestamps
    status payment_status DEFAULT 'pending',
    processed_at timestamptz,
    
    -- Additional fields
    fees decimal(12,2) DEFAULT 0, -- Transaction fees
    exchange_rate decimal(10,4) DEFAULT 1, -- For foreign currency
    reference_number varchar(255),
    notes text,
    
    -- Audit
    processed_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- EMPLOYEE MANAGEMENT (Portal Features)
-- =====================================================================================

-- Employee attendance (from your EmployeePortal)
CREATE TABLE employee_attendance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id uuid REFERENCES users(id),
    
    -- Attendance details
    date date NOT NULL,
    clock_in timestamptz,
    clock_out timestamptz,
    break_start timestamptz,
    break_end timestamptz,
    
    -- Calculated fields
    hours_worked interval,
    overtime_hours interval,
    
    -- Status
    status attendance_status DEFAULT 'present',
    notes text,
    
    -- Approval (for leave requests, etc.)
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, date)
);

-- Employee performance metrics (Manager Portal analytics)
CREATE TABLE employee_performance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id uuid REFERENCES users(id),
    
    -- Performance period
    performance_date date NOT NULL,
    week_number integer,
    month_number integer,
    year integer,
    
    -- Sales metrics (for cashiers)
    daily_sales decimal(15,2) DEFAULT 0,
    transactions_processed integer DEFAULT 0,
    items_sold integer DEFAULT 0,
    average_transaction_value decimal(12,2) DEFAULT 0,
    
    -- Efficiency metrics
    efficiency_score decimal(5,2), -- percentage
    customer_satisfaction_score decimal(3,2), -- out of 5
    accuracy_rate decimal(5,2), -- percentage
    
    -- Goals and achievements
    sales_target decimal(15,2),
    target_achieved boolean DEFAULT false,
    achievements text[],
    
    -- Additional metrics
    late_arrivals integer DEFAULT 0,
    early_departures integer DEFAULT 0,
    customer_complaints integer DEFAULT 0,
    customer_compliments integer DEFAULT 0,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, performance_date)
);

-- =====================================================================================
-- SYSTEM CONFIGURATION AND LOGS
-- =====================================================================================

-- System settings (Admin Portal configuration)
CREATE TABLE system_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key varchar(100) UNIQUE NOT NULL,
    value jsonb NOT NULL,
    category varchar(100), -- payment, inventory, users, etc.
    description text,
    
    -- Access control
    is_public boolean DEFAULT false, -- Can non-admins read this setting?
    
    updated_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (for tracking important changes)
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    table_name varchar(100) NOT NULL,
    record_id uuid,
    action varchar(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values jsonb,
    new_values jsonb,
    
    -- Who and when
    user_id uuid REFERENCES users(id),
    ip_address inet,
    user_agent text,
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (for real-time updates)
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipient
    user_id uuid REFERENCES users(id),
    role user_role, -- Can target specific roles
    
    -- Notification details
    title varchar(255) NOT NULL,
    message text NOT NULL,
    type varchar(50) DEFAULT 'info', -- info, warning, error, success
    category varchar(50), -- order, inventory, system, etc.
    
    -- Status
    is_read boolean DEFAULT false,
    read_at timestamptz,
    
    -- Additional data
    action_url text, -- Link for user to take action
    metadata jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz
);

-- =====================================================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update inventory when orders are completed
CREATE OR REPLACE FUNCTION update_inventory_on_order_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when order status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Decrease inventory for each order item
        UPDATE inventory 
        SET current_stock = current_stock - oi.quantity,
            updated_at = CURRENT_TIMESTAMP
        FROM order_items oi 
        WHERE oi.order_id = NEW.id 
        AND inventory.product_id = oi.product_id;
        
        -- Insert stock movement records
        INSERT INTO stock_movements (product_id, movement_type, quantity_change, previous_stock, new_stock, reference_id, reference_type, created_by)
        SELECT 
            oi.product_id,
            'sale',
            -oi.quantity,
            inv.current_stock + oi.quantity,
            inv.current_stock,
            NEW.id,
            'order',
            NEW.employee_id
        FROM order_items oi
        JOIN inventory inv ON inv.product_id = oi.product_id
        WHERE oi.order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply inventory update trigger
CREATE TRIGGER trigger_update_inventory_on_order_completion
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order_completion();

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_subtotal decimal(12,2);
    order_tax decimal(12,2);
    order_total decimal(12,2);
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(total_price - discount_amount), 0)
    INTO order_subtotal
    FROM order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate tax (18% Uganda VAT)
    order_tax := order_subtotal * 0.18;
    order_total := order_subtotal + order_tax;
    
    -- Update order totals
    UPDATE orders 
    SET 
        subtotal = order_subtotal,
        tax_amount = order_tax,
        total_amount = order_total,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply order totals calculation triggers
CREATE TRIGGER trigger_calculate_order_totals_on_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

CREATE TRIGGER trigger_calculate_order_totals_on_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

CREATE TRIGGER trigger_calculate_order_totals_on_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance ENABLE ROW LEVEL SECURITY;

-- Users can view/edit their own profile
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = auth_id);

-- Admins and managers can view all users
CREATE POLICY users_admin_access ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

-- Employees can view orders they processed
CREATE POLICY orders_employee_access ON orders
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Customers can view their own orders
CREATE POLICY orders_customer_access ON orders
    FOR SELECT USING (
        customer_id IN (
            SELECT c.id FROM customers c 
            JOIN users u ON u.id = c.user_id 
            WHERE u.auth_id = auth.uid()
        )
    );

-- Admins and managers can view all orders
CREATE POLICY orders_admin_access ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- User indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- Product indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));

-- Order indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_employee_id ON orders(employee_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_date_status ON orders(order_date, status);

-- Payment indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_mobile_number ON payments(mobile_number);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- Inventory indexes
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location);
CREATE INDEX idx_inventory_current_stock ON inventory(current_stock);

-- Performance indexes
CREATE INDEX idx_employee_performance_employee_date ON employee_performance(employee_id, performance_date);
CREATE INDEX idx_employee_attendance_employee_date ON employee_attendance(employee_id, date);

-- Stock movement indexes
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_id, reference_type);

-- =====================================================================================
-- INITIAL DATA SETUP
-- =====================================================================================

-- Insert default categories (matching your frontend)
INSERT INTO categories (name, description, icon) VALUES
('Groceries', 'Food and household essentials', '🛒'),
('Electronics', 'Mobile phones, computers and accessories', '📱'),
('Fresh Produce', 'Fruits and vegetables', '🥕'),
('Dairy & Spreads', 'Milk, yogurt, butter and spreads', '🥛'),
('Grains & Cereals', 'Rice, maize flour, wheat products', '🌾'),
('Cooking Oils', 'Cooking and frying oils', '🛢️'),
('Beverages', 'Soft drinks, juices and water', '🥤'),
('Health & Beauty', 'Personal care and health products', '💊'),
('Home & Garden', 'Household items and cleaning products', '🏠'),
('Clothing', 'Apparel and accessories', '👕');

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description) VALUES
('currency', '"UGX"', 'general', 'Default currency'),
('tax_rate', '0.18', 'financial', 'Uganda VAT rate'),
('mobile_money_fee', '0.01', 'payment', 'Mobile money transaction fee percentage'),
('low_stock_threshold', '10', 'inventory', 'Default low stock alert threshold'),
('business_hours', '{"open": "07:00", "close": "22:00"}', 'general', 'Business operating hours'),
('supported_networks', '["MTN", "Airtel", "UTL"]', 'payment', 'Supported mobile money networks');

-- Insert default admin user (will be created via your registration system)
-- This is just a placeholder for the initial setup

COMMENT ON SCHEMA public IS 'FAREDEAL POS System - Complete database schema matching the frontend application structure with Uganda-specific features, mobile money integration, and multi-portal support.';