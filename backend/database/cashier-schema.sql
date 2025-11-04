-- =====================================================================
-- FAREDEAL CASHIER PORTAL DATABASE SCHEMA
-- =====================================================================
-- Business: FAREDEAL POS System
-- Country: Uganda
-- Currency: UGX (Ugandan Shillings)
-- Purpose: Complete cashier operations management
-- Created: October 8, 2025
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. CASHIER PROFILES
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cashier_code VARCHAR(20) UNIQUE NOT NULL,
    terminal_id VARCHAR(50),
    assigned_counter VARCHAR(50),
    shift_preference VARCHAR(20) CHECK (shift_preference IN ('morning', 'afternoon', 'evening', 'night', 'flexible')),
    payment_methods_authorized TEXT[], -- ['cash', 'mobile_money', 'card', 'credit']
    max_transaction_limit DECIMAL(15,2) DEFAULT 10000000.00,
    discount_authorization_level VARCHAR(20) DEFAULT 'basic', -- 'basic', 'standard', 'advanced', 'manager'
    can_process_returns BOOLEAN DEFAULT true,
    can_void_transactions BOOLEAN DEFAULT false,
    training_status VARCHAR(20) DEFAULT 'active' CHECK (training_status IN ('training', 'active', 'senior', 'supervisor')),
    performance_rating DECIMAL(3,2) DEFAULT 0.00,
    total_transactions_processed INTEGER DEFAULT 0,
    total_sales_amount DECIMAL(15,2) DEFAULT 0.00,
    average_transaction_time INTEGER DEFAULT 0, -- in seconds
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    last_shift_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 2. CASHIER SHIFTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id) ON DELETE CASCADE,
    shift_number VARCHAR(50) UNIQUE NOT NULL,
    shift_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    opening_cash_ugx DECIMAL(15,2) DEFAULT 0.00,
    closing_cash_ugx DECIMAL(15,2) DEFAULT 0.00,
    expected_cash_ugx DECIMAL(15,2) DEFAULT 0.00,
    cash_variance_ugx DECIMAL(15,2) DEFAULT 0.00,
    total_transactions INTEGER DEFAULT 0,
    total_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    cash_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    mobile_money_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    card_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    credit_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    returns_amount_ugx DECIMAL(15,2) DEFAULT 0.00,
    discounts_given_ugx DECIMAL(15,2) DEFAULT 0.00,
    void_transactions INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled', 'disputed')),
    notes TEXT,
    supervisor_id UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 3. CASHIER TRANSACTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    shift_id UUID REFERENCES cashier_shifts(id),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'return', 'exchange', 'void', 'refund')),
    customer_id UUID REFERENCES users(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    items JSONB NOT NULL, -- Array of {product_id, name, quantity, unit_price, total, tax}
    subtotal_ugx DECIMAL(15,2) NOT NULL,
    discount_ugx DECIMAL(15,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_reason TEXT,
    tax_ugx DECIMAL(15,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    total_amount_ugx DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- 'cash', 'mobile_money', 'visa', 'mastercard', 'credit', 'mixed'
    payment_details JSONB, -- {cash: amount, mobile_money: {provider, reference, amount}, card: {type, last4, amount}}
    amount_paid_ugx DECIMAL(15,2) NOT NULL,
    change_given_ugx DECIMAL(15,2) DEFAULT 0.00,
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0,
    transaction_duration INTEGER, -- in seconds
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'voided', 'returned', 'disputed')),
    void_reason TEXT,
    voided_by UUID REFERENCES users(id),
    voided_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 4. CASH DRAWER OPERATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_drawer_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    shift_id UUID REFERENCES cashier_shifts(id),
    operation_type VARCHAR(30) NOT NULL CHECK (operation_type IN ('open', 'close', 'cash_in', 'cash_out', 'drop', 'reconciliation')),
    amount_ugx DECIMAL(15,2) NOT NULL,
    denomination_breakdown JSONB, -- {50000: count, 20000: count, 10000: count, 5000: count, etc.}
    reason TEXT,
    authorized_by UUID REFERENCES users(id),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 5. CASHIER RETURNS AND REFUNDS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    original_transaction_id UUID REFERENCES cashier_transactions(id),
    return_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('full_return', 'partial_return', 'exchange', 'damaged', 'defective')),
    items JSONB NOT NULL, -- Array of returned items
    original_amount_ugx DECIMAL(15,2) NOT NULL,
    return_amount_ugx DECIMAL(15,2) NOT NULL,
    restocking_fee_ugx DECIMAL(15,2) DEFAULT 0.00,
    refund_method VARCHAR(30) NOT NULL, -- 'cash', 'original_payment', 'store_credit', 'exchange'
    refund_reference VARCHAR(100),
    reason TEXT NOT NULL,
    condition_of_goods VARCHAR(30), -- 'unused', 'used', 'damaged', 'defective'
    authorization_level VARCHAR(20) DEFAULT 'cashier', -- 'cashier', 'supervisor', 'manager'
    authorized_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 6. CASHIER CUSTOMER INTERACTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    customer_id UUID REFERENCES users(id),
    interaction_type VARCHAR(30) NOT NULL CHECK (interaction_type IN ('assistance', 'complaint', 'inquiry', 'feedback', 'issue_resolution')),
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolution TEXT,
    resolution_time INTEGER, -- in minutes
    customer_satisfaction VARCHAR(20), -- 'very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'
    escalated_to UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================================
-- 7. CASHIER DAILY REPORTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    report_date DATE NOT NULL,
    shift_ids UUID[] NOT NULL,
    total_shifts INTEGER NOT NULL,
    total_hours_worked DECIMAL(5,2) NOT NULL,
    total_transactions INTEGER NOT NULL,
    total_sales_ugx DECIMAL(15,2) NOT NULL,
    total_returns_ugx DECIMAL(15,2) DEFAULT 0.00,
    net_sales_ugx DECIMAL(15,2) NOT NULL,
    cash_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    mobile_money_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    card_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    credit_sales_ugx DECIMAL(15,2) DEFAULT 0.00,
    average_transaction_value_ugx DECIMAL(15,2) DEFAULT 0.00,
    transactions_per_hour DECIMAL(5,2) DEFAULT 0.00,
    cash_over_short_ugx DECIMAL(15,2) DEFAULT 0.00,
    discounts_given_ugx DECIMAL(15,2) DEFAULT 0.00,
    void_count INTEGER DEFAULT 0,
    customer_interactions INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 8. CASHIER PERFORMANCE METRICS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    total_transactions INTEGER NOT NULL,
    total_sales_ugx DECIMAL(15,2) NOT NULL,
    average_transaction_time INTEGER NOT NULL, -- in seconds
    transactions_per_hour DECIMAL(5,2) NOT NULL,
    accuracy_rate DECIMAL(5,2) NOT NULL, -- percentage
    cash_handling_accuracy DECIMAL(5,2) NOT NULL,
    customer_satisfaction_score DECIMAL(3,2) NOT NULL,
    void_rate DECIMAL(5,2) NOT NULL,
    return_rate DECIMAL(5,2) NOT NULL,
    upselling_success_rate DECIMAL(5,2) DEFAULT 0.00,
    attendance_rate DECIMAL(5,2) NOT NULL,
    punctuality_score DECIMAL(3,2) NOT NULL,
    policy_compliance_score DECIMAL(3,2) NOT NULL,
    overall_rating DECIMAL(3,2) NOT NULL,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    goals TEXT[],
    evaluated_by UUID REFERENCES users(id),
    evaluation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 9. CASHIER ALERTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('cash_variance', 'drawer_shortage', 'transaction_void', 'large_discount', 'suspicious_activity', 'system', 'policy_violation')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'urgent')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_transaction_id UUID REFERENCES cashier_transactions(id),
    related_shift_id UUID REFERENCES cashier_shifts(id),
    action_required TEXT,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 10. CASHIER TRAINING RECORDS
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    training_type VARCHAR(50) NOT NULL, -- 'initial', 'refresher', 'product_knowledge', 'system_update', 'compliance'
    training_title VARCHAR(255) NOT NULL,
    training_description TEXT,
    trainer_id UUID REFERENCES users(id),
    training_date DATE NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    completion_status VARCHAR(20) DEFAULT 'scheduled' CHECK (completion_status IN ('scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
    assessment_score DECIMAL(5,2),
    certificate_issued BOOLEAN DEFAULT false,
    certificate_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 11. CASHIER ACTIVITY LOG
-- =====================================================================
CREATE TABLE IF NOT EXISTS cashier_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES cashier_profiles(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    entity_type VARCHAR(50), -- 'transaction', 'shift', 'customer', 'return', etc.
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Cashier Profiles
CREATE INDEX idx_cashier_profiles_user_id ON cashier_profiles(user_id);
CREATE INDEX idx_cashier_profiles_cashier_code ON cashier_profiles(cashier_code);
CREATE INDEX idx_cashier_profiles_is_active ON cashier_profiles(is_active);

-- Cashier Shifts
CREATE INDEX idx_cashier_shifts_cashier_id ON cashier_shifts(cashier_id);
CREATE INDEX idx_cashier_shifts_shift_date ON cashier_shifts(shift_date);
CREATE INDEX idx_cashier_shifts_status ON cashier_shifts(status);
CREATE INDEX idx_cashier_shifts_date_cashier ON cashier_shifts(shift_date, cashier_id);

-- Cashier Transactions
CREATE INDEX idx_cashier_transactions_cashier_id ON cashier_transactions(cashier_id);
CREATE INDEX idx_cashier_transactions_shift_id ON cashier_transactions(shift_id);
CREATE INDEX idx_cashier_transactions_transaction_number ON cashier_transactions(transaction_number);
CREATE INDEX idx_cashier_transactions_receipt_number ON cashier_transactions(receipt_number);
CREATE INDEX idx_cashier_transactions_customer_id ON cashier_transactions(customer_id);
CREATE INDEX idx_cashier_transactions_created_at ON cashier_transactions(created_at);
CREATE INDEX idx_cashier_transactions_status ON cashier_transactions(status);
CREATE INDEX idx_cashier_transactions_payment_method ON cashier_transactions(payment_method);

-- Cash Drawer Operations
CREATE INDEX idx_drawer_operations_cashier_id ON cashier_drawer_operations(cashier_id);
CREATE INDEX idx_drawer_operations_shift_id ON cashier_drawer_operations(shift_id);
CREATE INDEX idx_drawer_operations_operation_type ON cashier_drawer_operations(operation_type);
CREATE INDEX idx_drawer_operations_created_at ON cashier_drawer_operations(created_at);

-- Cashier Returns
CREATE INDEX idx_cashier_returns_cashier_id ON cashier_returns(cashier_id);
CREATE INDEX idx_cashier_returns_original_transaction_id ON cashier_returns(original_transaction_id);
CREATE INDEX idx_cashier_returns_status ON cashier_returns(status);
CREATE INDEX idx_cashier_returns_created_at ON cashier_returns(created_at);

-- Cashier Customer Interactions
CREATE INDEX idx_customer_interactions_cashier_id ON cashier_customer_interactions(cashier_id);
CREATE INDEX idx_customer_interactions_customer_id ON cashier_customer_interactions(customer_id);
CREATE INDEX idx_customer_interactions_status ON cashier_customer_interactions(status);

-- Cashier Daily Reports
CREATE INDEX idx_daily_reports_cashier_id ON cashier_daily_reports(cashier_id);
CREATE INDEX idx_daily_reports_report_date ON cashier_daily_reports(report_date);

-- Cashier Performance
CREATE INDEX idx_cashier_performance_cashier_id ON cashier_performance(cashier_id);
CREATE INDEX idx_cashier_performance_period ON cashier_performance(evaluation_period_start, evaluation_period_end);

-- Cashier Alerts
CREATE INDEX idx_cashier_alerts_cashier_id ON cashier_alerts(cashier_id);
CREATE INDEX idx_cashier_alerts_is_read ON cashier_alerts(is_read);
CREATE INDEX idx_cashier_alerts_severity ON cashier_alerts(severity);

-- Cashier Training
CREATE INDEX idx_cashier_training_cashier_id ON cashier_training(cashier_id);
CREATE INDEX idx_cashier_training_completion_status ON cashier_training(completion_status);

-- Cashier Activity Log
CREATE INDEX idx_cashier_activity_log_cashier_id ON cashier_activity_log(cashier_id);
CREATE INDEX idx_cashier_activity_log_activity_type ON cashier_activity_log(activity_type);
CREATE INDEX idx_cashier_activity_log_created_at ON cashier_activity_log(created_at);

-- =====================================================================
-- VIEWS
-- =====================================================================

-- Cashier Dashboard Overview
CREATE OR REPLACE VIEW cashier_dashboard_overview AS
SELECT 
    cp.id AS cashier_id,
    cp.cashier_code,
    u.first_name || ' ' || u.last_name AS cashier_name,
    cp.assigned_counter,
    cs.id AS current_shift_id,
    cs.shift_number AS current_shift_number,
    cs.shift_type,
    cs.start_time AS shift_start,
    cs.opening_cash_ugx,
    COALESCE(cs.total_transactions, 0) AS transactions_today,
    COALESCE(cs.total_sales_ugx, 0) AS sales_today_ugx,
    COALESCE(cs.cash_sales_ugx, 0) AS cash_sales_ugx,
    COALESCE(cs.mobile_money_sales_ugx, 0) AS mobile_money_sales_ugx,
    COALESCE(cs.card_sales_ugx, 0) AS card_sales_ugx,
    cp.performance_rating,
    cp.customer_satisfaction_score,
    (SELECT COUNT(*) FROM cashier_alerts WHERE cashier_id = cp.id AND is_read = false) AS unread_alerts,
    (SELECT COUNT(*) FROM cashier_returns WHERE cashier_id = cp.id AND status = 'pending') AS pending_returns
FROM cashier_profiles cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN cashier_shifts cs ON cp.id = cs.cashier_id 
    AND cs.shift_date = CURRENT_DATE 
    AND cs.status = 'open'
WHERE cp.is_active = true;

-- Shift Performance Summary
CREATE OR REPLACE VIEW shift_performance_summary AS
SELECT 
    cs.id AS shift_id,
    cs.shift_number,
    cs.cashier_id,
    cp.cashier_code,
    u.first_name || ' ' || u.last_name AS cashier_name,
    cs.shift_date,
    cs.shift_type,
    cs.start_time,
    cs.end_time,
    EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600 AS hours_worked,
    cs.total_transactions,
    cs.total_sales_ugx,
    CASE 
        WHEN cs.end_time IS NOT NULL AND cs.end_time > cs.start_time THEN
            cs.total_transactions::DECIMAL / NULLIF(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600, 0)
        ELSE 0
    END AS transactions_per_hour,
    cs.cash_variance_ugx,
    cs.discounts_given_ugx,
    cs.returns_amount_ugx,
    cs.void_transactions,
    cs.status
FROM cashier_shifts cs
JOIN cashier_profiles cp ON cs.cashier_id = cp.id
JOIN users u ON cp.user_id = u.id;

-- Top Performing Cashiers
CREATE OR REPLACE VIEW top_cashiers AS
SELECT 
    cp.id AS cashier_id,
    cp.cashier_code,
    u.first_name || ' ' || u.last_name AS cashier_name,
    cp.total_transactions_processed,
    cp.total_sales_amount AS total_sales_ugx,
    cp.performance_rating,
    cp.customer_satisfaction_score,
    cp.average_transaction_time,
    COUNT(DISTINCT cs.id) AS total_shifts,
    AVG(cs.total_transactions) AS avg_transactions_per_shift,
    AVG(cs.total_sales_ugx) AS avg_sales_per_shift_ugx
FROM cashier_profiles cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN cashier_shifts cs ON cp.id = cs.cashier_id AND cs.status = 'closed'
WHERE cp.is_active = true
GROUP BY cp.id, cp.cashier_code, u.first_name, u.last_name, cp.total_transactions_processed, 
         cp.total_sales_amount, cp.performance_rating, cp.customer_satisfaction_score, cp.average_transaction_time
ORDER BY cp.performance_rating DESC, cp.total_sales_amount DESC;

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function to calculate shift performance score
CREATE OR REPLACE FUNCTION calculate_shift_performance(shift_id_param UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    performance_score DECIMAL(3,2);
    shift_record RECORD;
    accuracy_score DECIMAL(3,2);
    efficiency_score DECIMAL(3,2);
    sales_score DECIMAL(3,2);
BEGIN
    SELECT * INTO shift_record FROM cashier_shifts WHERE id = shift_id_param;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    -- Calculate accuracy score (based on cash variance)
    accuracy_score := GREATEST(0, 1 - (ABS(shift_record.cash_variance_ugx) / NULLIF(shift_record.expected_cash_ugx, 0)));
    
    -- Calculate efficiency score (transactions per hour)
    efficiency_score := LEAST(1, shift_record.total_transactions::DECIMAL / 
        (NULLIF(EXTRACT(EPOCH FROM (shift_record.end_time - shift_record.start_time)) / 3600, 0) * 20));
    
    -- Calculate sales score (normalized to target)
    sales_score := LEAST(1, shift_record.total_sales_ugx / 5000000.00); -- Target 5M UGX per shift
    
    -- Overall performance score (weighted average)
    performance_score := (accuracy_score * 0.4 + efficiency_score * 0.3 + sales_score * 0.3);
    
    RETURN ROUND(performance_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update cashier statistics
CREATE OR REPLACE FUNCTION update_cashier_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE cashier_profiles 
        SET 
            total_transactions_processed = (
                SELECT COUNT(*) FROM cashier_transactions 
                WHERE cashier_id = NEW.cashier_id AND status = 'completed'
            ),
            total_sales_amount = (
                SELECT COALESCE(SUM(total_amount_ugx), 0) FROM cashier_transactions 
                WHERE cashier_id = NEW.cashier_id AND status = 'completed'
            ),
            average_transaction_time = (
                SELECT COALESCE(AVG(transaction_duration), 0)::INTEGER FROM cashier_transactions 
                WHERE cashier_id = NEW.cashier_id AND transaction_duration IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id = NEW.cashier_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cashier statistics
CREATE TRIGGER trigger_update_cashier_statistics
AFTER INSERT OR UPDATE ON cashier_transactions
FOR EACH ROW
EXECUTE FUNCTION update_cashier_statistics();

-- Function to auto-generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(50);
    sequence_num INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO sequence_num 
    FROM cashier_transactions 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_number := 'TXN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 6, '0');
    NEW.transaction_number := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transaction number generation
CREATE TRIGGER trigger_generate_transaction_number
BEFORE INSERT ON cashier_transactions
FOR EACH ROW
WHEN (NEW.transaction_number IS NULL)
EXECUTE FUNCTION generate_transaction_number();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE cashier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_drawer_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Cashiers can view their own data
CREATE POLICY cashier_view_own_data ON cashier_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY cashier_view_own_shifts ON cashier_shifts
    FOR SELECT USING (cashier_id IN (SELECT id FROM cashier_profiles WHERE user_id = auth.uid()));

CREATE POLICY cashier_view_own_transactions ON cashier_transactions
    FOR SELECT USING (cashier_id IN (SELECT id FROM cashier_profiles WHERE user_id = auth.uid()));

-- Policy: Managers and admins can view all cashier data
CREATE POLICY managers_view_all_cashiers ON cashier_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() 
            AND role IN ('manager', 'admin', 'super_admin')
        )
    );

-- =====================================================================
-- SAMPLE DATA FOR CASHIERS (UGANDA - FAREDEAL)
-- =====================================================================

-- Insert sample cashier profiles (will insert after users table exists)
-- Example cashiers: Mary Nakato, John Okello, Sarah Nambi, David Musoke

INSERT INTO cashier_profiles (user_id, cashier_code, terminal_id, assigned_counter, shift_preference, payment_methods_authorized, training_status)
SELECT 
    id,
    'CSH-' || LPAD((ROW_NUMBER() OVER ())::TEXT, 3, '0'),
    'TERM-' || (ROW_NUMBER() OVER ()),
    'Counter ' || (ROW_NUMBER() OVER ()),
    'flexible',
    ARRAY['cash', 'mobile_money', 'card'],
    'active'
FROM users 
WHERE role = 'cashier'
LIMIT 5;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE cashier_profiles IS 'Cashier profile information and authorization levels';
COMMENT ON TABLE cashier_shifts IS 'Cashier work shifts with opening/closing balances';
COMMENT ON TABLE cashier_transactions IS 'All POS transactions processed by cashiers';
COMMENT ON TABLE cashier_drawer_operations IS 'Cash drawer operations and reconciliations';
COMMENT ON TABLE cashier_returns IS 'Product returns and refunds processed by cashiers';
COMMENT ON TABLE cashier_customer_interactions IS 'Customer service interactions logged by cashiers';
COMMENT ON TABLE cashier_daily_reports IS 'Daily performance reports for each cashier';
COMMENT ON TABLE cashier_performance IS 'Periodic performance evaluations for cashiers';
COMMENT ON TABLE cashier_alerts IS 'Alerts and notifications for cashiers';
COMMENT ON TABLE cashier_training IS 'Training records and certifications for cashiers';
COMMENT ON TABLE cashier_activity_log IS 'Comprehensive activity log for audit purposes';

-- =====================================================================
-- END OF CASHIER PORTAL SCHEMA
-- =====================================================================
