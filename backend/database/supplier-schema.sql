-- =====================================================================
-- FAREDEAL SUPPLIER PORTAL DATABASE SCHEMA
-- =====================================================================
-- Business: FAREDEAL POS System
-- Country: Uganda
-- Currency: UGX (Ugandan Shillings)
-- Purpose: Complete supplier relationship and procurement management
-- Created: October 8, 2025
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. SUPPLIER PROFILES
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    business_type VARCHAR(50) CHECK (business_type IN ('manufacturer', 'wholesaler', 'distributor', 'importer', 'local_producer', 'service_provider')),
    registration_number VARCHAR(100),
    tin_number VARCHAR(50), -- Tax Identification Number
    contact_person_name VARCHAR(255) NOT NULL,
    contact_person_title VARCHAR(100),
    contact_person_phone VARCHAR(20) NOT NULL,
    contact_person_email VARCHAR(255) NOT NULL,
    alternative_contact_phone VARCHAR(20),
    alternative_contact_email VARCHAR(255),
    physical_address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Kampala',
    district VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Uganda',
    postal_address VARCHAR(255),
    website VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(100),
    mobile_money_provider VARCHAR(50), -- 'MTN', 'Airtel', 'None'
    mobile_money_number VARCHAR(20),
    product_categories TEXT[], -- ['beverages', 'snacks', 'dairy', 'electronics', etc.]
    payment_terms VARCHAR(50) DEFAULT 'net_30', -- 'immediate', 'net_7', 'net_15', 'net_30', 'net_60'
    payment_terms_days INTEGER DEFAULT 30,
    credit_limit_ugx DECIMAL(15,2) DEFAULT 0.00,
    current_balance_ugx DECIMAL(15,2) DEFAULT 0.00,
    minimum_order_value_ugx DECIMAL(15,2) DEFAULT 0.00,
    delivery_lead_time_days INTEGER DEFAULT 7,
    quality_rating DECIMAL(3,2) DEFAULT 0.00,
    delivery_rating DECIMAL(3,2) DEFAULT 0.00,
    pricing_rating DECIMAL(3,2) DEFAULT 0.00,
    overall_rating DECIMAL(3,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    total_purchase_value_ugx DECIMAL(15,2) DEFAULT 0.00,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted', 'pending_approval', 'suspended')),
    contract_start_date DATE,
    contract_end_date DATE,
    is_preferred_supplier BOOLEAN DEFAULT false,
    certifications TEXT[], -- ['ISO 9001', 'HACCP', 'Halal', 'Organic']
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 2. SUPPLIER PRODUCTS CATALOG
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL, -- 'piece', 'kg', 'liter', 'carton', 'box'
    pack_size VARCHAR(50), -- '500ml', '1kg', '24pcs', etc.
    supplier_sku VARCHAR(100),
    barcode VARCHAR(100),
    cost_price_ugx DECIMAL(15,2) NOT NULL,
    suggested_retail_price_ugx DECIMAL(15,2),
    minimum_order_quantity INTEGER DEFAULT 1,
    bulk_discount_quantity INTEGER,
    bulk_discount_percentage DECIMAL(5,2),
    lead_time_days INTEGER DEFAULT 7,
    stock_availability VARCHAR(30) DEFAULT 'in_stock' CHECK (stock_availability IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued', 'seasonal')),
    available_quantity INTEGER,
    shelf_life_days INTEGER,
    storage_requirements TEXT,
    quality_specifications TEXT,
    is_active BOOLEAN DEFAULT true,
    last_price_update_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, product_code)
);

-- =====================================================================
-- 3. PURCHASE ORDERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    ordered_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    items JSONB NOT NULL, -- Array of {supplier_product_id, product_name, quantity, unit_price, total}
    subtotal_ugx DECIMAL(15,2) NOT NULL,
    discount_ugx DECIMAL(15,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_ugx DECIMAL(15,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    shipping_cost_ugx DECIMAL(15,2) DEFAULT 0.00,
    total_amount_ugx DECIMAL(15,2) NOT NULL,
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    payment_due_date DATE,
    delivery_address TEXT,
    delivery_instructions TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent_to_supplier', 'confirmed', 'partially_received', 'received', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 4. DELIVERIES
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    delivery_date DATE NOT NULL,
    delivery_time TIME,
    delivered_by_supplier VARCHAR(255), -- Name of delivery person from supplier
    delivery_vehicle_number VARCHAR(50),
    received_by UUID NOT NULL REFERENCES users(id),
    items JSONB NOT NULL, -- Array of {supplier_product_id, product_name, ordered_qty, delivered_qty, accepted_qty, rejected_qty, reason}
    total_items_ordered INTEGER NOT NULL,
    total_items_delivered INTEGER NOT NULL,
    total_items_accepted INTEGER NOT NULL,
    total_items_rejected INTEGER DEFAULT 0,
    delivery_status VARCHAR(30) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'partially_delivered', 'rejected', 'returned')),
    quality_check_status VARCHAR(30) DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'passed', 'failed', 'conditional')),
    quality_check_notes TEXT,
    rejection_reasons JSONB, -- Array of {product_id, quantity, reason, condition}
    condition_on_arrival VARCHAR(30), -- 'excellent', 'good', 'acceptable', 'poor', 'damaged'
    packaging_condition VARCHAR(30),
    temperature_compliant BOOLEAN,
    documentation_complete BOOLEAN DEFAULT true,
    delivery_note_number VARCHAR(100),
    invoice_number VARCHAR(100),
    photos TEXT[], -- Array of photo URLs for proof of delivery/condition
    delivery_rating DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 5. SUPPLIER INVOICES
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_invoice_number VARCHAR(100), -- Supplier's own invoice number
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    delivery_id UUID REFERENCES supplier_deliveries(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    invoice_type VARCHAR(30) DEFAULT 'purchase' CHECK (invoice_type IN ('purchase', 'credit_note', 'debit_note', 'adjustment')),
    items JSONB NOT NULL,
    subtotal_ugx DECIMAL(15,2) NOT NULL,
    discount_ugx DECIMAL(15,2) DEFAULT 0.00,
    tax_ugx DECIMAL(15,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    other_charges_ugx DECIMAL(15,2) DEFAULT 0.00,
    total_amount_ugx DECIMAL(15,2) NOT NULL,
    amount_paid_ugx DECIMAL(15,2) DEFAULT 0.00,
    balance_due_ugx DECIMAL(15,2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'disputed')),
    payment_terms VARCHAR(50),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed', 'paid', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    dispute_reason TEXT,
    dispute_raised_at TIMESTAMP WITH TIME ZONE,
    dispute_resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attachment_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 6. SUPPLIER PAYMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    invoice_id UUID REFERENCES supplier_invoices(id),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'mobile_money', 'cheque', 'cash', 'credit_card')),
    payment_reference VARCHAR(100), -- Bank reference, mobile money transaction ID, etc.
    amount_ugx DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'UGX',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    mobile_money_provider VARCHAR(50),
    mobile_money_number VARCHAR(20),
    cheque_number VARCHAR(50),
    payment_purpose TEXT,
    paid_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed', 'cancelled')),
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 7. SUPPLIER PERFORMANCE EVALUATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    total_orders INTEGER NOT NULL,
    total_purchase_value_ugx DECIMAL(15,2) NOT NULL,
    on_time_deliveries INTEGER NOT NULL,
    on_time_delivery_rate DECIMAL(5,2) NOT NULL,
    late_deliveries INTEGER DEFAULT 0,
    average_delay_days DECIMAL(5,2) DEFAULT 0.00,
    quality_acceptance_rate DECIMAL(5,2) NOT NULL,
    rejected_items_count INTEGER DEFAULT 0,
    rejected_items_value_ugx DECIMAL(15,2) DEFAULT 0.00,
    invoice_accuracy_rate DECIMAL(5,2) NOT NULL,
    payment_disputes INTEGER DEFAULT 0,
    pricing_competitiveness DECIMAL(3,2) NOT NULL, -- 1-5 rating
    product_availability_rate DECIMAL(5,2) NOT NULL,
    communication_responsiveness DECIMAL(3,2) NOT NULL, -- 1-5 rating
    documentation_quality DECIMAL(3,2) NOT NULL, -- 1-5 rating
    compliance_with_terms DECIMAL(3,2) NOT NULL, -- 1-5 rating
    overall_quality_rating DECIMAL(3,2) NOT NULL,
    overall_delivery_rating DECIMAL(3,2) NOT NULL,
    overall_pricing_rating DECIMAL(3,2) NOT NULL,
    overall_performance_rating DECIMAL(3,2) NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    action_items TEXT[],
    evaluated_by UUID REFERENCES users(id),
    evaluation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 8. SUPPLIER CONTRACTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('supply_agreement', 'framework_agreement', 'exclusive_agreement', 'non_disclosure', 'service_level')),
    contract_title VARCHAR(255) NOT NULL,
    contract_description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_terms TEXT,
    auto_renewal BOOLEAN DEFAULT false,
    payment_terms TEXT NOT NULL,
    delivery_terms TEXT,
    quality_standards TEXT,
    price_adjustment_terms TEXT,
    termination_clause TEXT,
    penalties_clause TEXT,
    minimum_purchase_commitment_ugx DECIMAL(15,2),
    contract_value_ugx DECIMAL(15,2),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'expired', 'terminated', 'renewed')),
    signed_by_supplier VARCHAR(255),
    signed_by_company UUID REFERENCES users(id),
    supplier_signature_date DATE,
    company_signature_date DATE,
    contract_document_url TEXT,
    attachment_urls TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 9. SUPPLIER COMMUNICATION LOG
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('phone_call', 'email', 'meeting', 'whatsapp', 'site_visit', 'complaint', 'inquiry', 'negotiation')),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    communication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    initiated_by VARCHAR(20) CHECK (initiated_by IN ('company', 'supplier')),
    contact_person_name VARCHAR(255),
    company_representative UUID REFERENCES users(id),
    related_po_id UUID REFERENCES purchase_orders(id),
    related_invoice_id UUID REFERENCES supplier_invoices(id),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 10. SUPPLIER PRICE HISTORY
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    supplier_product_id UUID NOT NULL REFERENCES supplier_products(id),
    old_price_ugx DECIMAL(15,2) NOT NULL,
    new_price_ugx DECIMAL(15,2) NOT NULL,
    price_change_percentage DECIMAL(5,2) NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 11. SUPPLIER ALERTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('payment_due', 'payment_overdue', 'contract_expiring', 'poor_performance', 'delivery_delay', 'quality_issue', 'price_increase', 'stock_shortage')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'urgent')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'invoice', 'po', 'contract', 'delivery'
    related_entity_id UUID,
    action_required TEXT,
    assigned_to UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 12. SUPPLIER DOCUMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('business_license', 'tax_certificate', 'bank_statement', 'insurance', 'certification', 'product_catalog', 'price_list', 'contract', 'invoice', 'other')),
    document_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_kb INTEGER,
    issue_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 13. SUPPLIER ACTIVITY LOG
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    entity_type VARCHAR(50), -- 'po', 'invoice', 'payment', 'delivery', 'contract', etc.
    entity_id UUID,
    performed_by UUID REFERENCES users(id),
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Supplier Profiles
CREATE INDEX idx_supplier_profiles_supplier_code ON supplier_profiles(supplier_code);
CREATE INDEX idx_supplier_profiles_business_name ON supplier_profiles(business_name);
CREATE INDEX idx_supplier_profiles_status ON supplier_profiles(status);
CREATE INDEX idx_supplier_profiles_contact_email ON supplier_profiles(contact_person_email);

-- Supplier Products
CREATE INDEX idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product_code ON supplier_products(product_code);
CREATE INDEX idx_supplier_products_category ON supplier_products(category);
CREATE INDEX idx_supplier_products_is_active ON supplier_products(is_active);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_ordered_by ON purchase_orders(ordered_by);

-- Deliveries
CREATE INDEX idx_supplier_deliveries_delivery_number ON supplier_deliveries(delivery_number);
CREATE INDEX idx_supplier_deliveries_po_id ON supplier_deliveries(purchase_order_id);
CREATE INDEX idx_supplier_deliveries_supplier_id ON supplier_deliveries(supplier_id);
CREATE INDEX idx_supplier_deliveries_delivery_date ON supplier_deliveries(delivery_date);
CREATE INDEX idx_supplier_deliveries_status ON supplier_deliveries(delivery_status);

-- Invoices
CREATE INDEX idx_supplier_invoices_invoice_number ON supplier_invoices(invoice_number);
CREATE INDEX idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_po_id ON supplier_invoices(purchase_order_id);
CREATE INDEX idx_supplier_invoices_payment_status ON supplier_invoices(payment_status);
CREATE INDEX idx_supplier_invoices_due_date ON supplier_invoices(due_date);

-- Payments
CREATE INDEX idx_supplier_payments_payment_number ON supplier_payments(payment_number);
CREATE INDEX idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_invoice_id ON supplier_payments(invoice_id);
CREATE INDEX idx_supplier_payments_payment_date ON supplier_payments(payment_date);
CREATE INDEX idx_supplier_payments_status ON supplier_payments(status);

-- Performance
CREATE INDEX idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX idx_supplier_performance_period ON supplier_performance(evaluation_period_start, evaluation_period_end);

-- Contracts
CREATE INDEX idx_supplier_contracts_supplier_id ON supplier_contracts(supplier_id);
CREATE INDEX idx_supplier_contracts_status ON supplier_contracts(status);
CREATE INDEX idx_supplier_contracts_dates ON supplier_contracts(start_date, end_date);

-- Communications
CREATE INDEX idx_supplier_communications_supplier_id ON supplier_communications(supplier_id);
CREATE INDEX idx_supplier_communications_date ON supplier_communications(communication_date);
CREATE INDEX idx_supplier_communications_status ON supplier_communications(status);

-- Alerts
CREATE INDEX idx_supplier_alerts_supplier_id ON supplier_alerts(supplier_id);
CREATE INDEX idx_supplier_alerts_is_read ON supplier_alerts(is_read);
CREATE INDEX idx_supplier_alerts_severity ON supplier_alerts(severity);

-- Activity Log
CREATE INDEX idx_supplier_activity_log_supplier_id ON supplier_activity_log(supplier_id);
CREATE INDEX idx_supplier_activity_log_activity_type ON supplier_activity_log(activity_type);
CREATE INDEX idx_supplier_activity_log_created_at ON supplier_activity_log(created_at);

-- =====================================================================
-- VIEWS
-- =====================================================================

-- Supplier Dashboard Overview
CREATE OR REPLACE VIEW supplier_dashboard_overview AS
SELECT 
    sp.id AS supplier_id,
    sp.supplier_code,
    sp.business_name,
    sp.contact_person_name,
    sp.contact_person_phone,
    sp.contact_person_email,
    sp.status,
    sp.overall_rating,
    sp.current_balance_ugx,
    sp.total_orders,
    sp.total_purchase_value_ugx,
    (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = sp.id AND status = 'pending_approval') AS pending_orders,
    (SELECT COUNT(*) FROM supplier_invoices WHERE supplier_id = sp.id AND payment_status = 'unpaid') AS unpaid_invoices,
    (SELECT COALESCE(SUM(balance_due_ugx), 0) FROM supplier_invoices WHERE supplier_id = sp.id AND payment_status IN ('unpaid', 'partially_paid')) AS total_outstanding_ugx,
    (SELECT COUNT(*) FROM supplier_deliveries WHERE supplier_id = sp.id AND delivery_date = CURRENT_DATE) AS deliveries_today,
    (SELECT COUNT(*) FROM supplier_alerts WHERE supplier_id = sp.id AND is_read = false) AS unread_alerts
FROM supplier_profiles sp
WHERE sp.status = 'active';

-- Purchase Orders Summary
CREATE OR REPLACE VIEW purchase_orders_summary AS
SELECT 
    po.id AS po_id,
    po.po_number,
    sp.supplier_code,
    sp.business_name AS supplier_name,
    po.order_date,
    po.expected_delivery_date,
    po.total_amount_ugx,
    po.status,
    po.priority,
    u.first_name || ' ' || u.last_name AS ordered_by_name,
    CASE 
        WHEN po.expected_delivery_date < CURRENT_DATE AND po.status NOT IN ('received', 'completed', 'cancelled') THEN 'overdue'
        WHEN po.expected_delivery_date = CURRENT_DATE THEN 'due_today'
        ELSE 'on_track'
    END AS delivery_status
FROM purchase_orders po
JOIN supplier_profiles sp ON po.supplier_id = sp.id
JOIN users u ON po.ordered_by = u.id;

-- Outstanding Invoices
CREATE OR REPLACE VIEW outstanding_invoices AS
SELECT 
    si.id AS invoice_id,
    si.invoice_number,
    si.supplier_invoice_number,
    sp.supplier_code,
    sp.business_name AS supplier_name,
    sp.contact_person_phone,
    si.invoice_date,
    si.due_date,
    si.total_amount_ugx,
    si.amount_paid_ugx,
    si.balance_due_ugx,
    si.payment_status,
    CURRENT_DATE - si.due_date AS days_overdue,
    CASE 
        WHEN si.due_date < CURRENT_DATE THEN 'overdue'
        WHEN si.due_date = CURRENT_DATE THEN 'due_today'
        ELSE 'not_due'
    END AS urgency
FROM supplier_invoices si
JOIN supplier_profiles sp ON si.supplier_id = sp.id
WHERE si.payment_status IN ('unpaid', 'partially_paid')
ORDER BY si.due_date ASC;

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function to calculate supplier overall rating
CREATE OR REPLACE FUNCTION calculate_supplier_rating(supplier_id_param UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    overall_rating DECIMAL(3,2);
    quality_rating DECIMAL(3,2);
    delivery_rating DECIMAL(3,2);
    pricing_rating DECIMAL(3,2);
BEGIN
    SELECT 
        AVG(overall_quality_rating),
        AVG(overall_delivery_rating),
        AVG(overall_pricing_rating)
    INTO quality_rating, delivery_rating, pricing_rating
    FROM supplier_performance
    WHERE supplier_id = supplier_id_param;
    
    IF quality_rating IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Calculate weighted average
    overall_rating := (quality_rating * 0.4 + delivery_rating * 0.4 + pricing_rating * 0.2);
    
    RETURN ROUND(overall_rating, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update supplier statistics
CREATE OR REPLACE FUNCTION update_supplier_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE supplier_profiles 
        SET 
            total_orders = (
                SELECT COUNT(*) FROM purchase_orders 
                WHERE supplier_id = NEW.supplier_id AND status NOT IN ('draft', 'cancelled')
            ),
            total_purchase_value_ugx = (
                SELECT COALESCE(SUM(total_amount_ugx), 0) FROM purchase_orders 
                WHERE supplier_id = NEW.supplier_id AND status NOT IN ('draft', 'cancelled')
            ),
            on_time_delivery_rate = (
                SELECT COALESCE(
                    (COUNT(*) FILTER (WHERE actual_delivery_date <= expected_delivery_date)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
                    0
                )
                FROM purchase_orders 
                WHERE supplier_id = NEW.supplier_id 
                AND status = 'completed'
                AND actual_delivery_date IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id = NEW.supplier_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update supplier statistics
CREATE TRIGGER trigger_update_supplier_statistics
AFTER INSERT OR UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_supplier_statistics();

-- Function to auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(50);
    sequence_num INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO sequence_num 
    FROM purchase_orders 
    WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    new_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(sequence_num::TEXT, 5, '0');
    NEW.po_number := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for PO number generation
CREATE TRIGGER trigger_generate_po_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
WHEN (NEW.po_number IS NULL)
EXECUTE FUNCTION generate_po_number();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Procurement staff can view all suppliers
CREATE POLICY procurement_view_suppliers ON supplier_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() 
            AND role IN ('procurement', 'manager', 'admin', 'super_admin')
        )
    );

-- Policy: Managers and admins can view all data
CREATE POLICY managers_view_all_supplier_data ON purchase_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() 
            AND role IN ('manager', 'admin', 'super_admin')
        )
    );

-- =====================================================================
-- SAMPLE DATA FOR SUPPLIERS (UGANDA - FAREDEAL)
-- =====================================================================

-- Insert sample Ugandan suppliers
INSERT INTO supplier_profiles (
    supplier_code, business_name, trading_name, business_type,
    contact_person_name, contact_person_phone, contact_person_email,
    physical_address, city, district,
    product_categories, payment_terms, payment_terms_days,
    mobile_money_provider, mobile_money_number
) VALUES
('SUP-001', 'Coca-Cola Uganda Limited', 'Coca-Cola', 'manufacturer',
 'James Mukasa', '+256-772-123456', 'james.mukasa@cocacola.ug',
 'Plot 1-3 Seventh Street Industrial Area', 'Kampala', 'Kampala',
 ARRAY['beverages', 'soft_drinks'], 'net_30', 30,
 'MTN', '256772123456'),

('SUP-002', 'Century Bottling Company', 'Pepsi Uganda', 'distributor',
 'Sarah Namukasa', '+256-701-234567', 'sarah@century.co.ug',
 'Plot 45 Ntinda Industrial Area', 'Kampala', 'Kampala',
 ARRAY['beverages', 'soft_drinks', 'water'], 'net_30', 30,
 'Airtel', '256701234567'),

('SUP-003', 'Nile Breweries Limited', 'Nile Breweries', 'manufacturer',
 'David Okello', '+256-772-345678', 'd.okello@nilebreweries.com',
 'Plot M217 Njeru Industrial Area', 'Jinja', 'Jinja',
 ARRAY['beverages', 'beer', 'alcohol'], 'net_15', 15,
 'MTN', '256772345678'),

('SUP-004', 'Mukwano Industries Ltd', 'Mukwano', 'manufacturer',
 'Grace Nakato', '+256-701-456789', 'grace@mukwano.com',
 '13-15 Sixth Street Industrial Area', 'Kampala', 'Kampala',
 ARRAY['household', 'cooking_oil', 'soap', 'detergents'], 'net_30', 30,
 'MTN', '256701456789'),

('SUP-005', 'Pearl Dairy Farms', 'Fresh Dairy', 'local_producer',
 'Robert Ssemwogerere', '+256-772-567890', 'robert@pearldairy.co.ug',
 'Plot 234 Bombo Road', 'Kampala', 'Wakiso',
 ARRAY['dairy', 'milk', 'yogurt', 'cheese'], 'immediate', 0,
 'Airtel', '256772567890');

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE supplier_profiles IS 'Supplier company profiles and contact information';
COMMENT ON TABLE supplier_products IS 'Products catalog offered by suppliers';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers';
COMMENT ON TABLE supplier_deliveries IS 'Delivery tracking and quality checks';
COMMENT ON TABLE supplier_invoices IS 'Supplier invoices and payment tracking';
COMMENT ON TABLE supplier_payments IS 'Payments made to suppliers';
COMMENT ON TABLE supplier_performance IS 'Periodic performance evaluations';
COMMENT ON TABLE supplier_contracts IS 'Supplier contracts and agreements';
COMMENT ON TABLE supplier_communications IS 'Communication log with suppliers';
COMMENT ON TABLE supplier_price_history IS 'Historical price changes tracking';
COMMENT ON TABLE supplier_alerts IS 'Alerts and notifications for supplier management';
COMMENT ON TABLE supplier_documents IS 'Supplier documents and certifications';
COMMENT ON TABLE supplier_activity_log IS 'Comprehensive activity log for audit';

-- =====================================================================
-- END OF SUPPLIER PORTAL SCHEMA
-- =====================================================================
