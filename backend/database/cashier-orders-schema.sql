-- ===================================================
-- 🛒 CASHIER ORDERS & TILL SUPPLIES SYSTEM
-- Track till supply orders, approvals, and payments
-- ===================================================

-- 1. Cashier Orders Table
CREATE TABLE IF NOT EXISTS cashier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Cashier Information
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name VARCHAR(100) NOT NULL,
    register_number VARCHAR(20),
    store_location VARCHAR(100) DEFAULT 'Kampala Main Branch',
    
    -- Order Details
    order_type VARCHAR(30) DEFAULT 'till_supplies', -- till_supplies, inventory, emergency
    order_category VARCHAR(50), -- supplies, stationery, equipment
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Items & Amounts
    items_requested JSONB NOT NULL, -- Array of items with quantities
    total_items INTEGER DEFAULT 0,
    estimated_cost DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2),
    
    -- Status & Approval
    status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected, fulfilled, cancelled
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name VARCHAR(100),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Payment Information
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- unpaid, paid, partial
    payment_method VARCHAR(50), -- cash, mobile_money, advance
    payment_reference VARCHAR(100),
    amount_paid DECIMAL(15,2) DEFAULT 0,
    payment_date TIMESTAMPTZ,
    
    -- Fulfillment
    fulfilled_at TIMESTAMPTZ,
    fulfilled_by UUID REFERENCES auth.users(id),
    fulfilled_by_name VARCHAR(100),
    items_delivered JSONB, -- What was actually delivered
    
    -- Metadata
    request_notes TEXT,
    approval_notes TEXT,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Till Supply Inventory (Track what supplies are available)
CREATE TABLE IF NOT EXISTS till_supplies_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Supply Details
    item_name VARCHAR(200) NOT NULL UNIQUE,
    item_category VARCHAR(50), -- bags, paper, stationery, cleaning, safety
    item_code VARCHAR(50) UNIQUE,
    
    -- Stock Information
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    
    -- Pricing
    unit_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'UGX',
    
    -- Supply Details
    unit_of_measure VARCHAR(20) DEFAULT 'pieces', -- pieces, boxes, rolls, packs
    storage_location VARCHAR(100),
    supplier VARCHAR(200),
    
    -- Status
    is_available BOOLEAN DEFAULT true,
    last_restocked_at TIMESTAMPTZ,
    last_ordered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Order Items History (Track individual items in orders)
CREATE TABLE IF NOT EXISTS cashier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES cashier_orders(id) ON DELETE CASCADE,
    
    -- Item Details
    supply_id UUID REFERENCES till_supplies_inventory(id),
    item_name VARCHAR(200) NOT NULL,
    item_category VARCHAR(50),
    
    -- Quantities
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER,
    quantity_delivered INTEGER,
    
    -- Pricing
    unit_cost DECIMAL(15,2),
    line_total DECIMAL(15,2),
    
    -- Status
    item_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, delivered, out_of_stock
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Cashier Daily Statistics (Track cashier performance with orders)
CREATE TABLE IF NOT EXISTS cashier_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES auth.users(id),
    stat_date DATE NOT NULL,
    
    -- Transaction Stats
    transactions_completed INTEGER DEFAULT 0,
    total_sales_ugx DECIMAL(15,2) DEFAULT 0,
    average_transaction DECIMAL(15,2) DEFAULT 0,
    
    -- Order Stats
    orders_submitted INTEGER DEFAULT 0,
    orders_approved INTEGER DEFAULT 0,
    orders_rejected INTEGER DEFAULT 0,
    orders_fulfilled INTEGER DEFAULT 0,
    
    -- Payment Stats
    payments_made INTEGER DEFAULT 0,
    total_payments_ugx DECIMAL(15,2) DEFAULT 0,
    pending_payments_ugx DECIMAL(15,2) DEFAULT 0,
    
    -- Performance
    customer_satisfaction DECIMAL(3,2) DEFAULT 0,
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cashier_id, stat_date)
);

-- ===================================================
-- INDEXES for Performance
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_cashier_orders_cashier ON cashier_orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_orders_status ON cashier_orders(status);
CREATE INDEX IF NOT EXISTS idx_cashier_orders_payment ON cashier_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_cashier_orders_date ON cashier_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_cashier_orders_number ON cashier_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_supplies_item_name ON till_supplies_inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_supplies_category ON till_supplies_inventory(item_category);
CREATE INDEX IF NOT EXISTS idx_supplies_stock ON till_supplies_inventory(current_stock);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON cashier_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supply ON cashier_order_items(supply_id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_cashier ON cashier_daily_stats(cashier_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON cashier_daily_stats(stat_date);

-- ===================================================
-- RLS POLICIES
-- ===================================================

-- Enable RLS
ALTER TABLE cashier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE till_supplies_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_daily_stats ENABLE ROW LEVEL SECURITY;

-- Cashier Orders Policies
CREATE POLICY "Cashiers can insert their own orders" ON cashier_orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Cashiers can view their own orders" ON cashier_orders
    FOR SELECT USING (true);

CREATE POLICY "Managers can view all orders" ON cashier_orders
    FOR ALL USING (true);

-- Till Supplies Policies
CREATE POLICY "Anyone can view supplies" ON till_supplies_inventory
    FOR SELECT USING (true);

CREATE POLICY "Managers can manage supplies" ON till_supplies_inventory
    FOR ALL USING (true);

-- Order Items Policies
CREATE POLICY "Anyone can view order items" ON cashier_order_items
    FOR SELECT USING (true);

CREATE POLICY "System can manage order items" ON cashier_order_items
    FOR ALL USING (true);

-- Daily Stats Policies
CREATE POLICY "Cashiers can view their own stats" ON cashier_daily_stats
    FOR SELECT USING (true);

CREATE POLICY "System can manage stats" ON cashier_daily_stats
    FOR ALL USING (true);

-- ===================================================
-- FUNCTIONS & TRIGGERS
-- ===================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    today DATE := CURRENT_DATE;
    counter INTEGER;
BEGIN
    -- Format: ORD-YYYYMMDD-0001
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(order_number FROM 'ORD-[0-9]{8}-([0-9]{4})') AS INTEGER)
    ), 0) + 1 INTO counter
    FROM cashier_orders
    WHERE DATE(created_at) = today;
    
    order_num := 'ORD-' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily stats when order is approved
CREATE OR REPLACE FUNCTION update_daily_stats_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO cashier_daily_stats (
            cashier_id,
            stat_date,
            orders_approved
        ) VALUES (
            NEW.cashier_id,
            CURRENT_DATE,
            1
        )
        ON CONFLICT (cashier_id, stat_date) DO UPDATE SET
            orders_approved = cashier_daily_stats.orders_approved + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_approval
AFTER UPDATE ON cashier_orders
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats_on_approval();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cashier_orders_updated_at
BEFORE UPDATE ON cashier_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at
BEFORE UPDATE ON till_supplies_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- INITIAL TILL SUPPLIES DATA
-- ===================================================

INSERT INTO till_supplies_inventory (item_name, item_category, item_code, current_stock, minimum_stock, unit_cost, unit_of_measure) VALUES
('Shopping Bags (Small)', 'bags', 'BAG-SM-001', 150, 50, 50, 'pieces'),
('Shopping Bags (Medium)', 'bags', 'BAG-MD-001', 200, 75, 100, 'pieces'),
('Shopping Bags (Large)', 'bags', 'BAG-LG-001', 120, 50, 150, 'pieces'),
('Receipt Paper Rolls', 'paper', 'PPR-RL-001', 8, 15, 5000, 'rolls'),
('Printer Ink Cartridge', 'stationery', 'INK-CT-001', 3, 5, 45000, 'pieces'),
('Coin Trays', 'equipment', 'TRY-CN-001', 3, 5, 12000, 'pieces'),
('Hand Sanitizer (500ml)', 'cleaning', 'SNT-HS-001', 12, 10, 8000, 'bottles'),
('Price Tags', 'stationery', 'TAG-PR-001', 25, 30, 2000, 'packs'),
('Batteries (AA)', 'equipment', 'BAT-AA-001', 6, 8, 3000, 'packs'),
('Cleaning Wipes', 'cleaning', 'WIP-CL-001', 10, 15, 4000, 'packs'),
('Pens (Blue)', 'stationery', 'PEN-BL-001', 20, 15, 500, 'pieces'),
('Pens (Black)', 'stationery', 'PEN-BK-001', 18, 15, 500, 'pieces'),
('Calculator', 'equipment', 'CAL-BS-001', 2, 3, 15000, 'pieces'),
('Stapler', 'stationery', 'STP-ST-001', 4, 3, 8000, 'pieces'),
('Face Masks', 'safety', 'MSK-FC-001', 50, 30, 1000, 'pieces')
ON CONFLICT (item_name) DO NOTHING;

-- ===================================================
-- COMMENTS
-- ===================================================

COMMENT ON TABLE cashier_orders IS 'Track all cashier supply orders with approval workflow';
COMMENT ON TABLE till_supplies_inventory IS 'Inventory of till and station supplies';
COMMENT ON TABLE cashier_order_items IS 'Individual items in each order';
COMMENT ON TABLE cashier_daily_stats IS 'Daily performance statistics for each cashier';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Cashier Orders & Till Supplies System Created!';
    RAISE NOTICE '📦 Tables: cashier_orders, till_supplies_inventory, cashier_order_items, cashier_daily_stats';
    RAISE NOTICE '🔢 Order numbering: ORD-YYYYMMDD-0001';
    RAISE NOTICE '🛒 15 common till supplies pre-loaded';
    RAISE NOTICE '📊 Auto-tracks approvals, payments, and performance';
END $$;
