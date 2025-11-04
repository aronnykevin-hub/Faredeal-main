-- =====================================================================================
-- FAREDEAL POS - SIMPLE EXECUTABLE SCHEMA
-- =====================================================================================
-- Copy this entire content and paste it into Supabase SQL Editor, then click RUN

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee', 'cashier', 'customer', 'supplier');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'confirmed', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'airtel_money', 'card', 'bank_transfer', 'credit');

-- Main users table
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar(255) UNIQUE NOT NULL,
    full_name varchar(255) NOT NULL,
    phone varchar(20),
    role user_role NOT NULL DEFAULT 'customer',
    avatar_url text,
    is_active boolean DEFAULT true,
    employee_id varchar(50) UNIQUE,
    department varchar(100),
    hire_date date,
    salary decimal(12,2),
    address text,
    city varchar(100),
    district varchar(100),
    country varchar(100) DEFAULT 'Uganda',
    last_login_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) UNIQUE NOT NULL,
    description text,
    icon varchar(10),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name varchar(255) NOT NULL,
    contact_person varchar(255),
    email varchar(255),
    phone varchar(20),
    address text,
    city varchar(100),
    district varchar(100),
    payment_terms varchar(100) DEFAULT 'Net 30',
    rating decimal(3,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku varchar(100) UNIQUE NOT NULL,
    barcode varchar(50) UNIQUE,
    name varchar(255) NOT NULL,
    description text,
    category_id uuid REFERENCES categories(id),
    supplier_id uuid REFERENCES suppliers(id),
    cost_price decimal(12,2) NOT NULL CHECK (cost_price >= 0),
    selling_price decimal(12,2) NOT NULL CHECK (selling_price >= 0),
    weight decimal(10,3),
    unit varchar(50) DEFAULT 'piece',
    min_stock_level integer DEFAULT 10,
    max_stock_level integer DEFAULT 100,
    country_of_origin varchar(100) DEFAULT 'Uganda',
    tax_rate decimal(5,2) DEFAULT 18,
    is_active boolean DEFAULT true,
    tags text[],
    images text[],
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock integer DEFAULT 0 CHECK (reserved_stock >= 0),
    location varchar(100) DEFAULT 'main_store',
    last_restocked timestamptz,
    average_cost decimal(12,2),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location)
);

-- Customers table
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id),
    first_name varchar(100),
    last_name varchar(100),
    email varchar(255),
    phone varchar(20),
    address text,
    city varchar(100),
    district varchar(100),
    total_purchases decimal(15,2) DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number varchar(50) UNIQUE NOT NULL,
    customer_id uuid REFERENCES customers(id),
    employee_id uuid REFERENCES users(id),
    order_type varchar(50) DEFAULT 'pos',
    status order_status DEFAULT 'pending',
    subtotal decimal(12,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount decimal(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount decimal(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount decimal(12,2) NOT NULL CHECK (total_amount >= 0),
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    payment_reference varchar(255),
    notes text,
    order_date timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price decimal(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price decimal(12,2) NOT NULL CHECK (total_price >= 0),
    product_name varchar(255),
    product_sku varchar(100),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES orders(id),
    payment_method payment_method NOT NULL,
    amount decimal(12,2) NOT NULL CHECK (amount > 0),
    currency varchar(10) DEFAULT 'UGX',
    mobile_number varchar(20),
    network varchar(50),
    transaction_id varchar(255),
    status payment_status DEFAULT 'pending',
    processed_at timestamptz,
    processed_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Employee attendance table
CREATE TABLE employee_attendance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id uuid REFERENCES users(id),
    date date NOT NULL,
    clock_in timestamptz,
    clock_out timestamptz,
    hours_worked interval,
    status varchar(50) DEFAULT 'present',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- System settings table
CREATE TABLE system_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key varchar(100) UNIQUE NOT NULL,
    value jsonb NOT NULL,
    category varchar(100),
    description text,
    updated_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id),
    title varchar(255) NOT NULL,
    message text NOT NULL,
    type varchar(50) DEFAULT 'info',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
('Groceries', 'Food and household essentials', '🛒'),
('Electronics', 'Mobile phones and accessories', '📱'),
('Fresh Produce', 'Fruits and vegetables', '🥕'),
('Dairy & Spreads', 'Milk and dairy products', '🥛'),
('Grains & Cereals', 'Rice, maize flour, wheat', '🌾'),
('Cooking Oils', 'Cooking and frying oils', '🛢️'),
('Beverages', 'Drinks and water', '🥤'),
('Health & Beauty', 'Personal care products', '💊');

-- Insert system settings
INSERT INTO system_settings (key, value, category, description) VALUES
('currency', '"UGX"', 'general', 'Default currency'),
('tax_rate', '0.18', 'financial', 'Uganda VAT rate'),
('mobile_money_fee', '0.01', 'payment', 'Mobile money fee percentage'),
('business_name', '"FAREDEAL"', 'general', 'Business name'),
('business_country', '"Uganda"', 'general', 'Business country');

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = auth_id);
CREATE POLICY orders_employee_access ON orders FOR SELECT USING (
    employee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 FAREDEAL POS Database Setup Complete!';
    RAISE NOTICE '✅ Created all tables for your application';
    RAISE NOTICE '📱 Uganda features: Mobile Money, UGX currency';
    RAISE NOTICE '🛒 POS system ready for all portal types';
    RAISE NOTICE '👥 User roles: admin, manager, employee, cashier, customer, supplier';
END $$;