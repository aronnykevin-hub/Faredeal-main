# 🚀 SUPPLIER PORTAL - DATABASE INTEGRATION GUIDE

## Overview
This document outlines the changes needed to connect the Supplier Portal's Overview tab to real database data instead of mock data.

## Current State
The SupplierPortal.jsx currently uses hardcoded mock data for:
- Supplier profile information
- Performance metrics (orders, revenue, ratings)
- Order history
- Product catalog
- Revenue charts

## Database Schema Available

### Tables:
1. **suppliers** - Supplier company information
2. **products** - Product catalog (with supplier_id)
3. **inventory** - Stock levels
4. **purchase_orders** - Orders from suppliers
5. **purchase_order_items** - Line items for orders

## Required Changes

### Step 1: Import Supabase Client

```javascript
import { supabase } from '../services/supabase';
```

### Step 2: Convert State to Updatable

Change from:
```javascript
const [supplierProfile] = useState({...});
const [performanceMetrics] = useState({...});
```

To:
```javascript
const [supplierProfile, setSupplierProfile] = useState({...});
const [performanceMetrics, setPerformanceMetrics] = useState({...});
const [orderHistory, setOrderHistory] = useState([]);
const [productCatalog, setProductCatalog] = useState([]);
const [revenueData, setRevenueData] = useState([]);
const [loading, setLoading] = useState(true);
```

### Step 3: Load Data on Mount

```javascript
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  loadSupplierData();

  return () => clearInterval(timer);
}, []);

const loadSupplierData = async () => {
  try {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Get supplier profile
    await loadSupplierProfile(user.id);
    
    // Get supplier stats
    await loadPerformanceMetrics(user.id);
    
    // Get order history
    await loadOrderHistory(user.id);
    
    // Get product catalog
    await loadProductCatalog(user.id);
    
    // Get revenue data
    await loadRevenueData(user.id);
    
  } catch (error) {
    console.error('Error loading supplier data:', error);
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Load Supplier Profile

```javascript
const loadSupplierProfile = async (userId) => {
  try {
    // First try to get from suppliers table
    const { data: supplier, error: suppError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (suppError && suppError.code !== 'PGRST116') {
      throw suppError;
    }

    if (supplier) {
      setSupplierProfile({
        id: supplier.id,
        name: supplier.company_name || 'Your Company',
        contactPerson: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        rating: supplier.rating || 0,
        paymentTerms: `Net ${supplier.payment_terms || 30} Days`,
        creditLimit: supplier.credit_limit || 0,
        businessLicense: supplier.business_license || '',
        taxID: supplier.tax_number || '',
        category: 'Supplier',
        avatar: '🇺🇬',
        status: supplier.is_active ? 'Active' : 'Inactive',
        partnershipYears: calculateYears(supplier.created_at),
        languages: ['English', 'Luganda', 'Swahili'],
        certifications: [],
        specialties: [],
        deliveryAreas: ['Kampala', 'Entebbe', 'Mukono', 'Wakiso', 'Jinja']
      });
    } else {
      // If no supplier record, get from users table
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (user) {
        setSupplierProfile({
          id: userId,
          name: user.full_name || user.username || 'Your Company',
          contactPerson: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          username: user.username,
          avatar: '🇺🇬',
          status: user.is_active ? 'Active' : 'Pending',
          partnershipYears: calculateYears(user.created_at),
          rating: 0,
          creditLimit: 0,
          address: '',
          category: 'Supplier',
          paymentTerms: 'Net 30 Days',
          languages: ['English', 'Luganda', 'Swahili'],
          certifications: [],
          specialties: [],
          deliveryAreas: ['Kampala']
        });
      }
    }
  } catch (error) {
    console.error('Error loading supplier profile:', error);
  }
};

const calculateYears = (createdAt) => {
  if (!createdAt) return 0;
  const years = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 365));
  return years;
};
```

### Step 5: Load Performance Metrics

```javascript
const loadPerformanceMetrics = async (userId) => {
  try {
    // Get supplier ID
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const supplierId = supplier?.id;
    if (!supplierId) {
      console.log('No supplier ID found');
      return;
    }

    // Get total orders
    const { count: totalOrders } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId);

    // Get pending orders
    const { count: pendingOrders } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .in('status', ['pending', 'approved', 'ordered']);

    // Get all orders for calculations
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('total_amount, status, order_date, expected_delivery_date, actual_delivery_date')
      .eq('supplier_id', supplierId);

    // Calculate total revenue (received orders only)
    const totalRevenue = orders
      ?.filter(o => o.status === 'received')
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate on-time delivery
    const deliveredOrders = orders?.filter(o => o.status === 'received') || [];
    const onTimeOrders = deliveredOrders.filter(o => {
      if (!o.expected_delivery_date || !o.actual_delivery_date) return false;
      return new Date(o.actual_delivery_date) <= new Date(o.expected_delivery_date);
    });
    const onTimeDelivery = deliveredOrders.length > 0 
      ? Math.round((onTimeOrders.length / deliveredOrders.length) * 100)
      : 0;

    // Get active products count
    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    setPerformanceMetrics({
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue,
      onTimeDelivery: onTimeDelivery,
      qualityRating: supplier?.rating || 0,
      activeProducts: activeProducts || 0,
      pendingOrders: pendingOrders || 0,
      avgOrderValue: avgOrderValue,
      customerSatisfaction: supplier?.rating || 0,
      mobileMoneyTransactions: 0,
      bankTransferTransactions: 0,
      weeklyGrowth: 0,
      monthlyGrowth: 0,
      exportOrders: 0,
      localOrders: totalOrders || 0,
      seasonalProductsAvailable: 0,
      organicCertifiedProducts: 0
    });
  } catch (error) {
    console.error('Error loading performance metrics:', error);
  }
};
```

### Step 6: Load Order History

```javascript
const loadOrderHistory = async (userId) => {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!supplier?.id) return;

    const { data: orders } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        order_date,
        total_amount,
        status,
        items:purchase_order_items(
          quantity_ordered,
          product:products(name)
        )
      `)
      .eq('supplier_id', supplier.id)
      .eq('status', 'received')
      .order('order_date', { ascending: false })
      .limit(10);

    const formatted = orders?.map(order => ({
      id: order.po_number,
      date: order.order_date,
      items: order.items?.length || 0,
      amount: parseFloat(order.total_amount) || 0,
      status: 'delivered',
      rating: 5,
      products: order.items?.map(item => item.product?.name).filter(Boolean).join(', ') || 'N/A'
    })) || [];

    setOrderHistory(formatted);
  } catch (error) {
    console.error('Error loading order history:', error);
  }
};
```

### Step 7: Load Product Catalog

```javascript
const loadProductCatalog = async (userId) => {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!supplier?.id) return;

    const { data: products } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        selling_price,
        category:categories(name),
        inventory(current_stock, status)
      `)
      .eq('supplier_id', supplier.id)
      .order('name');

    const formatted = products?.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category?.name || 'Uncategorized',
      price: parseFloat(product.selling_price) || 0,
      stock: product.inventory?.[0]?.current_stock || 0,
      status: 'active',
      unit: 'unit',
      season: 'year-round'
    })) || [];

    setProductCatalog(formatted);
  } catch (error) {
    console.error('Error loading product catalog:', error);
  }
};
```

### Step 8: Load Revenue Data (for charts)

```javascript
const loadRevenueData = async (userId) => {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!supplier?.id) return;

    // Get orders from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('total_amount, status, order_date')
      .eq('supplier_id', supplier.id)
      .eq('status', 'received')
      .gte('order_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('order_date');

    // Group by month
    const revenueByMonth = {};
    orders?.forEach(order => {
      const month = new Date(order.order_date).toLocaleDateString('en-US', { month: 'short' });
      if (!revenueByMonth[month]) {
        revenueByMonth[month] = { name: month, revenue: 0, orders: 0, products: 0 };
      }
      revenueByMonth[month].revenue += parseFloat(order.total_amount) || 0;
      revenueByMonth[month].orders += 1;
    });

    setRevenueData(Object.values(revenueByMonth));
  } catch (error) {
    console.error('Error loading revenue data:', error);
  }
};
```

## Testing Steps

1. **Run SQL Script**: Make sure `create-inventory-tables.sql` has been executed
2. **Login as Supplier**: Use a supplier account
3. **Check Console**: Look for any errors
4. **Verify Data**: Check if real data loads or if fallback mock data is used
5. **Test Features**: Try interacting with overview widgets

## Fallback Strategy

If database is empty or user has no supplier record:
- Show "No data available" messages
- Display zero values for metrics
- Show empty states for lists
- Keep mock data as commented backup

## Files to Update

1. `frontend/src/pages/SupplierPortal.jsx` - Main portal file
2. `frontend/src/services/inventoryService.js` - Already created
3. Create sample data SQL if needed

## Next Steps

1. Update the useState declarations
2. Add the data loading functions
3. Update the useEffect hook
4. Test with real data
5. Add loading states and error handling
6. Update UI to show "No data" states

## Sample Data

To test, run this SQL in Supabase to create sample supplier data:

```sql
-- Insert sample supplier
INSERT INTO suppliers (user_id, company_name, contact_person, email, phone, address, payment_terms, credit_limit, is_active, rating)
SELECT 
  id,
  'Sample Supplier Ltd',
  full_name,
  email,
  phone,
  'Kampala, Uganda',
  30,
  50000000,
  true,
  4.5
FROM users
WHERE role = 'supplier'
LIMIT 1;

-- Insert sample products
INSERT INTO products (sku, name, supplier_id, selling_price, cost_price, is_active)
SELECT 
  'PROD-' || generate_series(1,10),
  'Sample Product ' || generate_series(1,10),
  id,
  15000 + (random() * 50000)::int,
  10000 + (random() * 30000)::int,
  true
FROM suppliers
LIMIT 10;
```

---

This guide provides everything needed to convert the Supplier Portal Overview from mock data to real database data!
