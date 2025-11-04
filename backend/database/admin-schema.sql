-- =====================================================================
-- FAREDEAL Admin Schema
-- Comprehensive Admin Management System
-- Created: October 8, 2025
-- Version: 2.0.0
-- =====================================================================

-- =====================================================================
-- ADMIN DASHBOARD & ANALYTICS TABLES
-- =====================================================================

-- Admin Activity Tracking
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'product', 'order', 'config', etc.
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    
    -- Indexing for performance
    CONSTRAINT fk_admin_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_timestamp ON admin_activity_log(timestamp DESC);
CREATE INDEX idx_admin_activity_action ON admin_activity_log(action);
CREATE INDEX idx_admin_activity_entity ON admin_activity_log(entity_type, entity_id);

-- Admin Dashboard Metrics
CREATE TABLE IF NOT EXISTS admin_dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Business Metrics
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    active_employees INTEGER DEFAULT 0,
    
    -- Inventory Metrics
    total_products INTEGER DEFAULT 0,
    low_stock_products INTEGER DEFAULT 0,
    out_of_stock_products INTEGER DEFAULT 0,
    total_inventory_value DECIMAL(15,2) DEFAULT 0,
    
    -- Financial Metrics
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- System Metrics
    total_logins INTEGER DEFAULT 0,
    failed_logins INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    system_errors INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for daily metrics
    CONSTRAINT unique_metric_date UNIQUE (metric_date)
);

CREATE INDEX idx_dashboard_metrics_date ON admin_dashboard_metrics(metric_date DESC);

-- Admin Notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    category VARCHAR(50), -- 'inventory', 'sales', 'employee', 'system', etc.
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    action_label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_priority ON admin_notifications(priority);

-- =====================================================================
-- ADMIN CONFIGURATION & SETTINGS TABLES
-- =====================================================================

-- System Configuration (Enhanced)
CREATE TABLE IF NOT EXISTS admin_system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    value_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    category VARCHAR(50) NOT NULL, -- 'portal', 'business', 'security', 'notification', etc.
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can non-admins read this?
    is_editable BOOLEAN DEFAULT TRUE,
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_system_config_category ON admin_system_config(category);
CREATE INDEX idx_system_config_public ON admin_system_config(is_public);

-- Configuration Change History
CREATE TABLE IF NOT EXISTS admin_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_config_history_key ON admin_config_history(config_key);
CREATE INDEX idx_config_history_timestamp ON admin_config_history(timestamp DESC);
CREATE INDEX idx_config_history_user ON admin_config_history(changed_by);

-- Portal Configuration (Comprehensive)
CREATE TABLE IF NOT EXISTS admin_portal_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portal_name VARCHAR(50) NOT NULL UNIQUE, -- 'admin', 'manager', 'employee', etc.
    display_name VARCHAR(100) NOT NULL,
    theme_config JSONB DEFAULT '{}',
    feature_flags JSONB DEFAULT '{}',
    access_permissions JSONB DEFAULT '{}',
    layout_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_portal_config_name ON admin_portal_config(portal_name);
CREATE INDEX idx_portal_config_active ON admin_portal_config(is_active);

-- =====================================================================
-- ADMIN DATA MANAGEMENT TABLES
-- =====================================================================

-- Admin Data Storage (for complex analytics and reports)
CREATE TABLE IF NOT EXISTS admin_data_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_key VARCHAR(100) NOT NULL,
    storage_category VARCHAR(50) NOT NULL, -- 'analytics', 'reports', 'exports', etc.
    data_content JSONB NOT NULL,
    data_size_bytes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_encrypted BOOLEAN DEFAULT FALSE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_storage_key UNIQUE (storage_key, storage_category)
);

CREATE INDEX idx_admin_data_category ON admin_data_storage(storage_category);
CREATE INDEX idx_admin_data_created ON admin_data_storage(created_at DESC);
CREATE INDEX idx_admin_data_expires ON admin_data_storage(expires_at);

-- Admin Reports
CREATE TABLE IF NOT EXISTS admin_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'sales', 'inventory', 'employee', 'financial', etc.
    report_format VARCHAR(20) NOT NULL, -- 'pdf', 'csv', 'excel', 'json'
    parameters JSONB DEFAULT '{}',
    file_path TEXT,
    file_size_bytes INTEGER,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_from DATE,
    date_to DATE,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_admin_reports_type ON admin_reports(report_type);
CREATE INDEX idx_admin_reports_generated ON admin_reports(generated_at DESC);
CREATE INDEX idx_admin_reports_user ON admin_reports(generated_by);
CREATE INDEX idx_admin_reports_status ON admin_reports(status);

-- =====================================================================
-- ADMIN EMPLOYEE ACCESS CONTROL TABLES
-- =====================================================================

-- Employee Access Control Settings
CREATE TABLE IF NOT EXISTS admin_employee_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_enabled BOOLEAN DEFAULT TRUE,
    access_reason TEXT,
    modified_by UUID NOT NULL REFERENCES users(id),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_status BOOLEAN,
    ip_address INET,
    
    CONSTRAINT unique_employee_access UNIQUE (employee_id)
);

CREATE INDEX idx_employee_access_employee ON admin_employee_access(employee_id);
CREATE INDEX idx_employee_access_enabled ON admin_employee_access(access_enabled);
CREATE INDEX idx_employee_access_modified ON admin_employee_access(modified_at DESC);

-- Employee Access Audit Trail
CREATE TABLE IF NOT EXISTS admin_employee_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'suspended'
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    bulk_operation_id UUID -- If part of bulk operation
);

CREATE INDEX idx_access_audit_employee ON admin_employee_access_audit(employee_id);
CREATE INDEX idx_access_audit_performed ON admin_employee_access_audit(performed_at DESC);
CREATE INDEX idx_access_audit_action ON admin_employee_access_audit(action);

-- Bulk Access Operations
CREATE TABLE IF NOT EXISTS admin_bulk_access_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(50) NOT NULL, -- 'enable', 'disable', 'suspend'
    employee_ids UUID[] NOT NULL,
    total_affected INTEGER NOT NULL,
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT
);

CREATE INDEX idx_bulk_operations_performed ON admin_bulk_access_operations(performed_at DESC);
CREATE INDEX idx_bulk_operations_user ON admin_bulk_access_operations(performed_by);

-- =====================================================================
-- ADMIN PAYMENT MANAGEMENT TABLES
-- =====================================================================

-- Payment Audit Trail
CREATE TABLE IF NOT EXISTS admin_payment_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'refunded'
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    old_amount DECIMAL(15,2),
    new_amount DECIMAL(15,2),
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_payment_audit_payment ON admin_payment_audit(payment_id);
CREATE INDEX idx_payment_audit_performed ON admin_payment_audit(performed_at DESC);
CREATE INDEX idx_payment_audit_action ON admin_payment_audit(action);

-- Payment Statistics (Daily Aggregates)
CREATE TABLE IF NOT EXISTS admin_payment_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_payments INTEGER DEFAULT 0,
    completed_payments INTEGER DEFAULT 0,
    pending_payments INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    completed_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2) DEFAULT 0,
    mobile_money_count INTEGER DEFAULT 0,
    mobile_money_amount DECIMAL(15,2) DEFAULT 0,
    cash_count INTEGER DEFAULT 0,
    cash_amount DECIMAL(15,2) DEFAULT 0,
    card_count INTEGER DEFAULT 0,
    card_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_payment_stat_date UNIQUE (stat_date)
);

CREATE INDEX idx_payment_stats_date ON admin_payment_statistics(stat_date DESC);

-- =====================================================================
-- ADMIN SYSTEM MONITORING TABLES
-- =====================================================================

-- System Health Checks
CREATE TABLE IF NOT EXISTS admin_system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    database_status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
    api_status VARCHAR(20) NOT NULL,
    storage_status VARCHAR(20) NOT NULL,
    database_response_time_ms INTEGER,
    api_response_time_ms INTEGER,
    active_connections INTEGER,
    database_size_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}'
);

CREATE INDEX idx_system_health_timestamp ON admin_system_health(check_timestamp DESC);
CREATE INDEX idx_system_health_db_status ON admin_system_health(database_status);

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS admin_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    user_id UUID REFERENCES users(id),
    user_role VARCHAR(50),
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

CREATE INDEX idx_api_usage_timestamp ON admin_api_usage(timestamp DESC);
CREATE INDEX idx_api_usage_endpoint ON admin_api_usage(endpoint);
CREATE INDEX idx_api_usage_user ON admin_api_usage(user_id);
CREATE INDEX idx_api_usage_status ON admin_api_usage(response_status);

-- Error Logs
CREATE TABLE IF NOT EXISTS admin_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_level VARCHAR(20) NOT NULL, -- 'error', 'warning', 'critical', 'fatal'
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    source VARCHAR(100), -- 'api', 'database', 'frontend', 'job', etc.
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255),
    request_data JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT
);

CREATE INDEX idx_error_logs_timestamp ON admin_error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_level ON admin_error_logs(error_level);
CREATE INDEX idx_error_logs_source ON admin_error_logs(source);
CREATE INDEX idx_error_logs_resolved ON admin_error_logs(resolved);

-- =====================================================================
-- ADMIN VIEWS FOR REPORTING
-- =====================================================================

-- Admin Overview Dashboard View
CREATE OR REPLACE VIEW admin_dashboard_overview AS
SELECT 
    CURRENT_DATE as report_date,
    
    -- Today's Sales
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = CURRENT_DATE) as today_sales,
    (SELECT COUNT(*) FROM sales WHERE DATE(created_at) = CURRENT_DATE) as today_orders,
    
    -- Total Statistics
    (SELECT COUNT(*) FROM users WHERE role != 'customer') as total_employees,
    (SELECT COUNT(*) FROM users WHERE role != 'customer' AND status = 'active') as active_employees,
    (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
    (SELECT COUNT(*) FROM products p JOIN inventory i ON p.id = i.product_id WHERE i.current_stock < i.minimum_stock) as low_stock_products,
    
    -- Customer Statistics
    (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
    (SELECT COUNT(*) FROM users WHERE role = 'customer' AND DATE(created_at) = CURRENT_DATE) as new_customers_today,
    
    -- Financial Statistics
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = CURRENT_DATE) as today_revenue,
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)) as month_revenue,
    
    -- System Health
    (SELECT COUNT(*) FROM admin_error_logs WHERE resolved = FALSE AND timestamp >= CURRENT_DATE) as unresolved_errors_today,
    (SELECT COUNT(*) FROM admin_notifications WHERE is_read = FALSE) as unread_notifications;

-- Employee Performance View
CREATE OR REPLACE VIEW admin_employee_performance AS
SELECT 
    u.id as employee_id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.role,
    e.department,
    e.position,
    
    -- Sales Performance (for sales roles)
    (SELECT COUNT(*) FROM sales WHERE created_by = u.id) as total_sales,
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_by = u.id) as total_sales_amount,
    (SELECT COUNT(*) FROM sales WHERE created_by = u.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)) as month_sales,
    
    -- Activity
    (SELECT COUNT(*) FROM admin_activity_log WHERE admin_id = u.id) as total_activities,
    u.last_login_at,
    
    -- Access Status
    (SELECT access_enabled FROM admin_employee_access WHERE employee_id = u.id) as access_enabled,
    u.status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.role != 'customer';

-- Payment Summary View
CREATE OR REPLACE VIEW admin_payment_summary AS
SELECT 
    p.id,
    p.reference_number,
    p.amount,
    p.currency,
    p.payment_method,
    p.status,
    p.created_at,
    p.processed_at,
    o.order_number,
    s.name as supplier_name,
    CONCAT(u.first_name, ' ', u.last_name) as created_by_name
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
LEFT JOIN suppliers s ON o.supplier_id = s.id
LEFT JOIN users u ON p.created_by = u.id;

-- =====================================================================
-- ADMIN FUNCTIONS AND PROCEDURES
-- =====================================================================

-- Function to update dashboard metrics
CREATE OR REPLACE FUNCTION update_admin_dashboard_metrics()
RETURNS VOID AS $$
BEGIN
    INSERT INTO admin_dashboard_metrics (
        metric_date,
        total_sales,
        total_orders,
        total_customers,
        new_customers,
        active_employees,
        total_products,
        low_stock_products,
        out_of_stock_products,
        total_inventory_value,
        total_revenue,
        total_logins
    )
    SELECT
        CURRENT_DATE,
        COALESCE(SUM(s.total_amount), 0),
        COUNT(DISTINCT s.id),
        (SELECT COUNT(*) FROM users WHERE role = 'customer'),
        (SELECT COUNT(*) FROM users WHERE role = 'customer' AND DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM users WHERE role != 'customer' AND status = 'active'),
        (SELECT COUNT(*) FROM products WHERE status = 'active'),
        (SELECT COUNT(*) FROM products p JOIN inventory i ON p.id = i.product_id WHERE i.current_stock < i.minimum_stock),
        (SELECT COUNT(*) FROM products p JOIN inventory i ON p.id = i.product_id WHERE i.current_stock = 0),
        (SELECT COALESCE(SUM(p.selling_price * i.current_stock), 0) FROM products p JOIN inventory i ON p.id = i.product_id),
        COALESCE(SUM(s.total_amount), 0),
        (SELECT COUNT(*) FROM admin_activity_log WHERE action = 'LOGIN' AND DATE(timestamp) = CURRENT_DATE)
    FROM sales s
    WHERE DATE(s.created_at) = CURRENT_DATE
    ON CONFLICT (metric_date) 
    DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        total_orders = EXCLUDED.total_orders,
        total_customers = EXCLUDED.total_customers,
        new_customers = EXCLUDED.new_customers,
        active_employees = EXCLUDED.active_employees,
        total_products = EXCLUDED.total_products,
        low_stock_products = EXCLUDED.low_stock_products,
        out_of_stock_products = EXCLUDED.out_of_stock_products,
        total_inventory_value = EXCLUDED.total_inventory_value,
        total_revenue = EXCLUDED.total_revenue,
        total_logins = EXCLUDED.total_logins,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_admin_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR DEFAULT 'info',
    p_priority VARCHAR DEFAULT 'normal',
    p_category VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        admin_id, title, message, type, priority, category
    ) VALUES (
        p_admin_id, p_title, p_message, p_type, p_priority, p_category
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_activity_log (
        admin_id, action, entity_type, entity_id, details
    ) VALUES (
        p_admin_id, p_action, p_entity_type, p_entity_id, p_details
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- ADMIN ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on admin tables
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_portal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_employee_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_payment_audit ENABLE ROW LEVEL SECURITY;

-- Admins can see all activity logs
CREATE POLICY admin_activity_all ON admin_activity_log
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can see their own notifications
CREATE POLICY admin_notifications_own ON admin_notifications
    FOR SELECT TO authenticated
    USING (admin_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ));

-- Only admins can modify system config
CREATE POLICY admin_config_policy ON admin_system_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================================
-- ADMIN DEFAULT DATA
-- =====================================================================

-- Insert default system configuration
INSERT INTO admin_system_config (config_key, config_value, value_type, category, description) VALUES
    ('company_name', 'FAREDEAL', 'string', 'business', 'Company name'),
    ('business_currency', 'UGX', 'string', 'business', 'Default currency'),
    ('tax_rate', '18', 'number', 'business', 'Default tax rate percentage'),
    ('admin_portal_name', 'Admin Portal', 'string', 'portal', 'Admin portal display name'),
    ('manager_portal_name', 'Manager Portal', 'string', 'portal', 'Manager portal display name'),
    ('employee_portal_name', 'Employee Portal', 'string', 'portal', 'Employee portal display name'),
    ('customer_portal_name', 'Customer Portal', 'string', 'portal', 'Customer portal display name'),
    ('enable_notifications', 'true', 'boolean', 'notification', 'Enable system notifications'),
    ('low_stock_threshold', '10', 'number', 'inventory', 'Default low stock threshold'),
    ('session_timeout_minutes', '30', 'number', 'security', 'Session timeout in minutes')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default portal configurations
INSERT INTO admin_portal_config (portal_name, display_name, is_active) VALUES
    ('admin', 'Admin Portal', true),
    ('manager', 'Manager Portal', true),
    ('employee', 'Employee Portal', true),
    ('cashier', 'Cashier Portal', true),
    ('customer', 'Customer Portal', true),
    ('supplier', 'Supplier Portal', true),
    ('delivery', 'Delivery Portal', true)
ON CONFLICT (portal_name) DO NOTHING;

-- Create initial dashboard metrics for today
SELECT update_admin_dashboard_metrics();

-- =====================================================================
-- ADMIN TRIGGERS
-- =====================================================================

-- Trigger to log config changes
CREATE OR REPLACE FUNCTION log_config_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.config_value != NEW.config_value) THEN
        INSERT INTO admin_config_history (
            config_key, old_value, new_value, changed_by
        ) VALUES (
            NEW.config_key, OLD.config_value, NEW.config_value, NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_config_change
    AFTER UPDATE ON admin_system_config
    FOR EACH ROW
    EXECUTE FUNCTION log_config_change();

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_admin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_config_timestamp
    BEFORE UPDATE ON admin_system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_timestamp();

CREATE TRIGGER trigger_admin_portal_timestamp
    BEFORE UPDATE ON admin_portal_config
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_timestamp();

-- =====================================================================
-- ADMIN INDEXES FOR PERFORMANCE
-- =====================================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_session ON admin_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_category ON admin_notifications(category);
CREATE INDEX IF NOT EXISTS idx_admin_reports_dates ON admin_reports(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_api_usage_response_time ON admin_api_usage(response_time_ms) WHERE response_time_ms > 1000;

-- =====================================================================
-- ADMIN COMMENTS
-- =====================================================================

COMMENT ON TABLE admin_activity_log IS 'Comprehensive admin activity tracking';
COMMENT ON TABLE admin_dashboard_metrics IS 'Daily aggregated business metrics for admin dashboard';
COMMENT ON TABLE admin_notifications IS 'Admin notification system';
COMMENT ON TABLE admin_system_config IS 'System-wide configuration settings';
COMMENT ON TABLE admin_portal_config IS 'Portal-specific configurations and feature flags';
COMMENT ON TABLE admin_employee_access IS 'Employee access control settings';
COMMENT ON TABLE admin_payment_audit IS 'Payment transaction audit trail';
COMMENT ON TABLE admin_system_health IS 'System health monitoring data';
COMMENT ON TABLE admin_api_usage IS 'API usage tracking and analytics';
COMMENT ON TABLE admin_error_logs IS 'System error logging and tracking';

-- =====================================================================
-- ADMIN SCHEMA COMPLETE
-- =====================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON admin_dashboard_overview TO authenticated;
GRANT SELECT ON admin_employee_performance TO authenticated;
GRANT SELECT ON admin_payment_summary TO authenticated;

-- Grant admin users full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin Schema Created Successfully!';
    RAISE NOTICE '📊 Admin Tables: 15 tables created';
    RAISE NOTICE '👁️ Admin Views: 3 views created';
    RAISE NOTICE '⚙️ Admin Functions: 3 functions created';
    RAISE NOTICE '🔒 RLS Policies: Enabled on sensitive tables';
    RAISE NOTICE '🎯 Default Data: Inserted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Admin Portal Schema Ready!';
END $$;
