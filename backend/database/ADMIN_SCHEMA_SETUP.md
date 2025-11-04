# FAREDEAL Admin Schema Setup Guide

## 📋 Overview
This admin schema provides comprehensive admin management capabilities including:
- Activity tracking and audit logs
- Dashboard metrics and analytics
- System configuration management
- Employee access control
- Payment audit trails
- System health monitoring
- API usage tracking
- Error logging and management

## 🚀 Quick Setup

### Step 1: Execute the Admin Schema

1. **Open your Supabase SQL Editor:**
   - Go to https://app.supabase.com
   - Select your FAREDEAL project
   - Navigate to SQL Editor

2. **Run the admin schema:**
   - Open `backend/database/admin-schema.sql`
   - Copy all content
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

### Step 2: Verify Installation

Run this query to verify all tables were created:

```sql
SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE 'admin_%' THEN '✅ Admin Table'
        ELSE '📋 Regular Table'
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'admin_%'
ORDER BY table_name;
```

Expected result: 15 admin tables

## 📊 Admin Tables Created

### 1. Core Admin Tables
- **admin_activity_log** - Track all admin actions
- **admin_dashboard_metrics** - Daily business metrics
- **admin_notifications** - Admin notification system
- **admin_data_storage** - Complex data storage
- **admin_reports** - Generated reports

### 2. Configuration Tables
- **admin_system_config** - System-wide settings
- **admin_config_history** - Configuration change history
- **admin_portal_config** - Portal configurations

### 3. Employee Management Tables
- **admin_employee_access** - Access control settings
- **admin_employee_access_audit** - Access change audit trail
- **admin_bulk_access_operations** - Bulk operation tracking

### 4. Payment Management Tables
- **admin_payment_audit** - Payment change tracking
- **admin_payment_statistics** - Daily payment aggregates

### 5. System Monitoring Tables
- **admin_system_health** - Health check data
- **admin_api_usage** - API usage tracking
- **admin_error_logs** - Error logging

## 👁️ Admin Views Created

### 1. admin_dashboard_overview
Complete dashboard overview with all key metrics:
```sql
SELECT * FROM admin_dashboard_overview;
```

Returns:
- Today's sales and orders
- Employee statistics
- Product and inventory stats
- Customer statistics
- Financial data
- System health indicators

### 2. admin_employee_performance
Employee performance metrics:
```sql
SELECT * FROM admin_employee_performance
ORDER BY total_sales_amount DESC
LIMIT 10;
```

Returns:
- Employee details
- Sales performance
- Activity tracking
- Access status

### 3. admin_payment_summary
Payment transaction summary:
```sql
SELECT * FROM admin_payment_summary
WHERE DATE(created_at) = CURRENT_DATE;
```

Returns:
- Payment details
- Order information
- Supplier data
- Creator information

## ⚙️ Admin Functions Created

### 1. update_admin_dashboard_metrics()
Updates daily dashboard metrics:
```sql
SELECT update_admin_dashboard_metrics();
```

### 2. create_admin_notification()
Create new admin notification:
```sql
SELECT create_admin_notification(
    'admin-user-id'::UUID,
    'Low Stock Alert',
    'Product X is running low on stock',
    'warning',
    'high',
    'inventory'
);
```

### 3. log_admin_activity()
Log admin activity:
```sql
SELECT log_admin_activity(
    'admin-user-id'::UUID,
    'UPDATE_PRODUCT',
    'product',
    'product-id'::UUID,
    '{"changes": {"price": "old->new"}}'::JSONB
);
```

## 🔒 Security Features

### Row Level Security (RLS)
- ✅ Enabled on all sensitive admin tables
- ✅ Admins can access all data
- ✅ Users can only access their own notifications
- ✅ Non-admins have restricted access

### Audit Logging
- Every configuration change is logged
- Employee access changes are tracked
- Payment modifications are audited
- All admin activities are recorded

## 📈 Using the Admin Schema

### Track Admin Activity
```sql
-- Log an admin action
INSERT INTO admin_activity_log (
    admin_id, action, entity_type, entity_id, details
) VALUES (
    auth.uid(),
    'UPDATE_SETTINGS',
    'system_config',
    NULL,
    '{"key": "company_name", "old": "OLD", "new": "NEW"}'::JSONB
);

-- View recent admin activities
SELECT * FROM admin_activity_log
ORDER BY timestamp DESC
LIMIT 20;
```

### Manage Employee Access
```sql
-- Disable employee access
INSERT INTO admin_employee_access (
    employee_id, access_enabled, access_reason, modified_by
) VALUES (
    'employee-uuid',
    FALSE,
    'Violation of policy',
    auth.uid()
) ON CONFLICT (employee_id) 
DO UPDATE SET 
    access_enabled = FALSE,
    access_reason = 'Violation of policy',
    modified_by = auth.uid(),
    modified_at = CURRENT_TIMESTAMP;

-- View access audit trail
SELECT * FROM admin_employee_access_audit
WHERE employee_id = 'employee-uuid'
ORDER BY performed_at DESC;
```

### Create Notifications
```sql
-- Create low stock notification
INSERT INTO admin_notifications (
    admin_id, title, message, type, priority, category
) VALUES (
    'admin-uuid',
    'Low Stock Alert',
    '5 products are below minimum stock level',
    'warning',
    'high',
    'inventory'
);

-- View unread notifications
SELECT * FROM admin_notifications
WHERE admin_id = auth.uid()
    AND is_read = FALSE
ORDER BY created_at DESC;
```

### Monitor System Health
```sql
-- Record health check
INSERT INTO admin_system_health (
    database_status, api_status, storage_status,
    database_response_time_ms, api_response_time_ms
) VALUES (
    'healthy', 'healthy', 'healthy',
    45, 120
);

-- View recent health checks
SELECT * FROM admin_system_health
ORDER BY check_timestamp DESC
LIMIT 10;
```

### Generate Reports
```sql
-- Create a sales report
INSERT INTO admin_reports (
    report_name, report_type, report_format,
    parameters, generated_by, date_from, date_to
) VALUES (
    'Daily Sales Report',
    'sales',
    'pdf',
    '{"include_details": true}'::JSONB,
    auth.uid(),
    CURRENT_DATE,
    CURRENT_DATE
);

-- View reports
SELECT * FROM admin_reports
WHERE generated_by = auth.uid()
ORDER BY generated_at DESC;
```

## 🎯 Default Data Inserted

### System Configuration
- Company name: FAREDEAL
- Currency: UGX
- Tax rate: 18%
- Portal names for all portals
- Notification settings
- Security settings

### Portal Configurations
- Admin Portal
- Manager Portal
- Employee Portal
- Cashier Portal
- Customer Portal
- Supplier Portal
- Delivery Portal

### Initial Metrics
- Dashboard metrics for current date

## 🔄 Scheduled Tasks

### Daily Tasks (Recommended)
```sql
-- Run daily at midnight
SELECT update_admin_dashboard_metrics();

-- Clean up old data (older than 90 days)
DELETE FROM admin_activity_log 
WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM admin_api_usage 
WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';
```

## 📊 Sample Queries

### Admin Dashboard Summary
```sql
SELECT * FROM admin_dashboard_overview;
```

### Top Performing Employees
```sql
SELECT 
    full_name,
    department,
    total_sales,
    total_sales_amount,
    month_sales
FROM admin_employee_performance
WHERE access_enabled = TRUE
ORDER BY total_sales_amount DESC
LIMIT 10;
```

### Recent Admin Activities
```sql
SELECT 
    u.email as admin_email,
    aal.action,
    aal.entity_type,
    aal.timestamp,
    aal.details
FROM admin_activity_log aal
JOIN users u ON aal.admin_id = u.id
WHERE DATE(aal.timestamp) = CURRENT_DATE
ORDER BY aal.timestamp DESC;
```

### Payment Audit Trail
```sql
SELECT 
    ps.reference_number,
    pa.action,
    pa.old_status,
    pa.new_status,
    pa.performed_at,
    u.email as performed_by
FROM admin_payment_audit pa
JOIN admin_payment_summary ps ON pa.payment_id = ps.id
JOIN users u ON pa.performed_by = u.id
ORDER BY pa.performed_at DESC
LIMIT 20;
```

### System Health Trends
```sql
SELECT 
    DATE(check_timestamp) as date,
    AVG(database_response_time_ms) as avg_db_response,
    AVG(api_response_time_ms) as avg_api_response,
    COUNT(*) FILTER (WHERE database_status != 'healthy') as db_issues
FROM admin_system_health
WHERE check_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(check_timestamp)
ORDER BY date DESC;
```

## 🛠️ Maintenance

### Weekly Maintenance
```sql
-- Vacuum analyze admin tables
VACUUM ANALYZE admin_activity_log;
VACUUM ANALYZE admin_api_usage;
VACUUM ANALYZE admin_error_logs;

-- Update statistics
ANALYZE admin_dashboard_metrics;
ANALYZE admin_employee_access;
```

### Monthly Maintenance
```sql
-- Archive old data (move to archive tables if needed)
-- Clean up expired data
DELETE FROM admin_reports 
WHERE expires_at < CURRENT_TIMESTAMP;

DELETE FROM admin_data_storage 
WHERE expires_at < CURRENT_TIMESTAMP;

-- Update all dashboard metrics
SELECT update_admin_dashboard_metrics();
```

## 🐛 Troubleshooting

### Check Table Existence
```sql
SELECT COUNT(*) as admin_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'admin_%';
```
Expected: 15 tables

### Check RLS Policies
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename LIKE 'admin_%';
```

### Check Indexes
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'admin_%'
ORDER BY tablename, indexname;
```

## 📞 Support

If you encounter any issues:
1. Check the Supabase dashboard for errors
2. Verify all prerequisite tables exist (users, products, etc.)
3. Ensure proper permissions are set
4. Check the SQL execution log for errors

---

**Admin Schema v2.0.0** - Created October 8, 2025
For FAREDEAL POS System
