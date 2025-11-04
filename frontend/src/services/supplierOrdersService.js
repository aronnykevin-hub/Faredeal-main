// =====================================================================
// SUPPLIER ORDERS SERVICE - FAREDEAL UGANDA
// =====================================================================
// Manages supplier orders, purchase orders, and deliveries
// Integrates with Supabase for real-time supplier management
// =====================================================================

import { supabase } from './supabase';

// =====================================================================
// SUPPLIER MANAGEMENT
// =====================================================================

/**
 * Get all supplier profiles with statistics
 */
export const getAllSuppliers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        purchase_orders(count),
        supplier_invoices(
          balance_due_ugx,
          payment_status
        )
      `)
      .eq('role', 'supplier')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate additional stats for each supplier
    const suppliersWithStats = data.map(supplier => {
      const pendingInvoices = supplier.supplier_invoices?.filter(
        inv => inv.payment_status === 'unpaid' || inv.payment_status === 'partially_paid'
      ).length || 0;

      const totalOutstanding = supplier.supplier_invoices?.reduce(
        (sum, inv) => sum + (parseFloat(inv.balance_due_ugx) || 0), 0
      ) || 0;

      return {
        ...supplier,
        pendingOrders: supplier.purchase_orders?.[0]?.count || 0,
        pendingInvoices,
        totalOutstanding
      };
    });

    return {
      success: true,
      suppliers: suppliersWithStats
    };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get active suppliers only
 */
export const getActiveSuppliers = async () => {
  try {
    console.log('🔍 Fetching active suppliers from users table...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'supplier')
      .eq('is_active', true)
      .order('company_name', { ascending: true });

    if (error) throw error;

    console.log('✅ Fetched suppliers:', data);

    // Map to expected format with business_name and supplier_code
    const mappedSuppliers = data.map(supplier => ({
      ...supplier,
      business_name: supplier.company_name || supplier.full_name || supplier.username,
      supplier_code: `SUP-${supplier.id.toString().slice(-6)}` // Generate code from ID
    }));

    return {
      success: true,
      suppliers: mappedSuppliers
    };
  } catch (error) {
    console.error('Error fetching active suppliers:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Approve or reject supplier
 */
export const updateSupplierStatus = async (supplierId, status, notes = '') => {
  try {
    // Map status to is_active field
    const isActive = status === 'active';
    
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .eq('role', 'supplier')
      .select()
      .single();

    if (error) throw error;

    // Log the activity
    await supabase.from('supplier_activity_log').insert({
      supplier_id: supplierId,
      activity_type: 'status_change',
      activity_description: `Supplier status changed to ${status}`,
      metadata: { new_status: status, notes }
    });

    return {
      success: true,
      supplier: data
    };
  } catch (error) {
    console.error('Error updating supplier status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =====================================================================
// PURCHASE ORDERS MANAGEMENT
// =====================================================================

/**
 * Get all purchase orders with supplier details and payment info
 */
export const getAllPurchaseOrders = async (filters = {}) => {
  try {
    let query = supabase
      .from('purchase_orders')
      .select('*')
      .order('order_date', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }
    if (filters.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Fetch supplier details separately from users table
    const supplierIds = [...new Set(orders.map(o => o.supplier_id))];
    const { data: suppliers } = await supabase
      .from('users')
      .select('id, company_name, full_name, contact_person')
      .eq('role', 'supplier')
      .in('id', supplierIds);

    // Fetch invoice/payment details for each order
    const orderIds = orders.map(o => o.id);
    const { data: invoices } = await supabase
      .from('supplier_invoices')
      .select('purchase_order_id, payment_status, balance_due_ugx, amount_paid_ugx')
      .in('purchase_order_id', orderIds);

    // Create lookups
    const supplierMap = {};
    suppliers?.forEach(s => {
      supplierMap[s.id] = {
        ...s,
        business_name: s.company_name || s.full_name || s.username,
        contact_person_name: s.contact_person || s.full_name
      };
    });

    const invoiceMap = {};
    invoices?.forEach(inv => {
      invoiceMap[inv.purchase_order_id] = inv;
    });

    // Format the data with payment status
    const formattedOrders = orders.map(order => {
      const invoice = invoiceMap[order.id];
      const supplier = supplierMap[order.supplier_id];
      return {
        ...order,
        supplierName: supplier?.business_name || 'Unknown Supplier',
        orderedBy: 'Manager',
        approvedBy: order.approved_by ? 'Approved' : null,
        payment_status: invoice?.payment_status || 'unpaid',
        amount_paid: invoice?.amount_paid_ugx || 0,
        balance_due: invoice?.balance_due_ugx || order.total_amount_ugx
      };
    });

    return {
      success: true,
      orders: formattedOrders
    };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get pending purchase orders (awaiting approval or supplier confirmation)
 */
export const getPendingPurchaseOrders = async () => {
  try {
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .in('status', ['pending_approval', 'approved', 'sent_to_supplier'])
      .order('order_date', { ascending: false });

    if (error) throw error;

    // Fetch supplier details separately
    const supplierIds = [...new Set(orders.map(o => o.supplier_id))];
    const { data: suppliers } = await supabase
      .from('supplier_profiles')
      .select('id, business_name, contact_person_name')
      .in('id', supplierIds);

    // Create supplier lookup
    const supplierMap = {};
    suppliers?.forEach(s => {
      supplierMap[s.id] = s;
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      supplierName: supplierMap[order.supplier_id]?.business_name || 'Unknown Supplier',
      orderedBy: 'Manager',
      items: order.items || []
    }));

    return {
      success: true,
      orders: formattedOrders
    };
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate unique PO number
 */
const generatePONumber = async () => {
  try {
    // Get count of existing orders to generate sequential number
    const { count, error } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error counting orders:', error);
      // Fallback to timestamp-based number
      return `PO-${Date.now()}`;
    }

    // Generate PO number: PO-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const sequence = String((count || 0) + 1).padStart(4, '0');
    
    return `PO-${dateStr}-${sequence}`;
  } catch (err) {
    console.error('Error generating PO number:', err);
    return `PO-${Date.now()}`;
  }
};

/**
 * Create new purchase order
 */
export const createPurchaseOrder = async (orderData) => {
  try {
    const {
      supplierId,
      items,
      expectedDeliveryDate,
      deliveryAddress,
      deliveryInstructions,
      priority,
      notes,
      orderedBy
    } = orderData;

    // Generate PO number
    const poNumber = await generatePONumber();

    // Calculate totals - handle both camelCase and snake_case field names
    const subtotal = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price || item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    
    const taxRate = 18.0; // 18% VAT for Uganda
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    console.log('Order Totals:', { subtotal, taxAmount, totalAmount, items });

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        supplier_id: supplierId,
        order_date: new Date().toISOString(),
        expected_delivery_date: expectedDeliveryDate,
        ordered_by: orderedBy,
        items: items,
        subtotal_ugx: subtotal,
        tax_ugx: taxAmount,
        tax_rate: taxRate,
        total_amount_ugx: totalAmount,
        delivery_address: deliveryAddress,
        delivery_instructions: deliveryInstructions,
        priority: priority || 'normal',
        status: 'pending_approval',
        notes
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      order: data,
      message: 'Purchase order created successfully'
    };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Approve purchase order
 */
export const approvePurchaseOrder = async (orderId, approvedBy) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      order: data,
      message: 'Purchase order approved successfully'
    };
  } catch (error) {
    console.error('Error approving purchase order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Reject purchase order
 */
export const rejectPurchaseOrder = async (orderId, reason, rejectedBy) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_by: rejectedBy,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      order: data,
      message: 'Purchase order rejected'
    };
  } catch (error) {
    console.error('Error rejecting purchase order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send order to supplier (update status)
 */
export const sendOrderToSupplier = async (orderId, managerId) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'sent_to_supplier',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw error;

    // Get supplier info
    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('business_name')
      .eq('id', data.supplier_id)
      .single();

    // Log communication
    await supabase.from('supplier_communications').insert({
      supplier_id: data.supplier_id,
      communication_type: 'email',
      subject: `Purchase Order ${data.po_number}`,
      description: `Purchase order sent to supplier`,
      initiated_by: 'company',
      company_representative: managerId,
      related_po_id: orderId
    });

    return {
      success: true,
      order: data,
      message: `Order sent to ${supplier?.business_name || 'supplier'}`
    };
  } catch (error) {
    console.error('Error sending order to supplier:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mark order as confirmed by supplier
 */
export const confirmOrderBySupplier = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      order: data,
      message: 'Order confirmed by supplier'
    };
  } catch (error) {
    console.error('Error confirming order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =====================================================================
// DELIVERIES MANAGEMENT
// =====================================================================

/**
 * Get all deliveries
 */
export const getAllDeliveries = async (filters = {}) => {
  try {
    let query = supabase
      .from('supplier_deliveries')
      .select('*')
      .order('delivery_date', { ascending: false });

    if (filters.status) {
      query = query.eq('delivery_status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      deliveries: data || []
    };
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Record new delivery
 */
export const recordDelivery = async (deliveryData) => {
  try {
    const {
      purchaseOrderId,
      supplierId,
      deliveryDate,
      deliveryTime,
      deliveredBySupplier,
      deliveryVehicleNumber,
      receivedBy,
      items,
      qualityCheckStatus,
      qualityCheckNotes,
      conditionOnArrival,
      packagingCondition
    } = deliveryData;

    // Calculate item counts
    const totalOrdered = items.reduce((sum, item) => sum + item.orderedQty, 0);
    const totalDelivered = items.reduce((sum, item) => sum + item.deliveredQty, 0);
    const totalAccepted = items.reduce((sum, item) => sum + item.acceptedQty, 0);
    const totalRejected = items.reduce((sum, item) => sum + item.rejectedQty, 0);

    const { data, error } = await supabase
      .from('supplier_deliveries')
      .insert({
        purchase_order_id: purchaseOrderId,
        supplier_id: supplierId,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivered_by_supplier: deliveredBySupplier,
        delivery_vehicle_number: deliveryVehicleNumber,
        received_by: receivedBy,
        items,
        total_items_ordered: totalOrdered,
        total_items_delivered: totalDelivered,
        total_items_accepted: totalAccepted,
        total_items_rejected: totalRejected,
        delivery_status: totalRejected > 0 ? 'partially_delivered' : 'delivered',
        quality_check_status: qualityCheckStatus,
        quality_check_notes: qualityCheckNotes,
        condition_on_arrival: conditionOnArrival,
        packaging_condition: packagingCondition,
        documentation_complete: true
      })
      .select()
      .single();

    if (error) throw error;

    // Update purchase order status
    const newPOStatus = totalDelivered >= totalOrdered ? 'received' : 'partially_received';
    await supabase
      .from('purchase_orders')
      .update({
        status: newPOStatus,
        actual_delivery_date: deliveryDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseOrderId);

    return {
      success: true,
      delivery: data,
      message: 'Delivery recorded successfully'
    };
  } catch (error) {
    console.error('Error recording delivery:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =====================================================================
// STATISTICS AND ANALYTICS
// =====================================================================

/**
 * Get supplier order statistics including payment info
 */
export const getSupplierOrderStats = async () => {
  try {
    // Get counts by status
    const { data: orderStats, error: orderError } = await supabase
      .from('purchase_orders')
      .select('status, total_amount_ugx');

    if (orderError) throw orderError;

    // Get supplier counts
    const { data: supplierData, error: supplierError } = await supabase
      .from('supplier_profiles')
      .select('status');

    if (supplierError) throw supplierError;

    // Get delivery stats
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('supplier_deliveries')
      .select('delivery_status, quality_check_status');

    if (deliveryError) throw deliveryError;

    // Get payment/invoice stats
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .select('payment_status, balance_due_ugx, amount_paid_ugx');

    if (invoiceError) throw invoiceError;

    // Calculate statistics
    const stats = {
      totalOrders: orderStats?.length || 0,
      pendingOrders: orderStats?.filter(o => o.status === 'pending_approval').length || 0,
      approvedOrders: orderStats?.filter(o => o.status === 'approved').length || 0,
      sentOrders: orderStats?.filter(o => o.status === 'sent_to_supplier').length || 0,
      confirmedOrders: orderStats?.filter(o => o.status === 'confirmed').length || 0,
      receivedOrders: orderStats?.filter(o => o.status === 'received').length || 0,
      completedOrders: orderStats?.filter(o => o.status === 'completed').length || 0,
      totalValue: orderStats?.reduce((sum, o) => sum + parseFloat(o.total_amount_ugx || 0), 0) || 0,
      
      totalSuppliers: supplierData?.length || 0,
      activeSuppliers: supplierData?.filter(s => s.status === 'active').length || 0,
      pendingSuppliers: supplierData?.filter(s => s.status === 'pending_approval').length || 0,
      
      totalDeliveries: deliveryData?.length || 0,
      pendingDeliveries: deliveryData?.filter(d => d.delivery_status === 'pending').length || 0,
      completedDeliveries: deliveryData?.filter(d => d.delivery_status === 'delivered').length || 0,
      qualityIssues: deliveryData?.filter(d => d.quality_check_status === 'failed').length || 0,

      // Payment statistics
      paidOrders: invoiceData?.filter(i => i.payment_status === 'paid').length || 0,
      unpaidOrders: invoiceData?.filter(i => i.payment_status === 'unpaid').length || 0,
      partiallyPaidOrders: invoiceData?.filter(i => i.payment_status === 'partially_paid').length || 0,
      overdueOrders: invoiceData?.filter(i => i.payment_status === 'overdue').length || 0,
      totalPaidAmount: invoiceData?.reduce((sum, i) => sum + parseFloat(i.amount_paid_ugx || 0), 0) || 0,
      totalOutstanding: invoiceData?.reduce((sum, i) => sum + parseFloat(i.balance_due_ugx || 0), 0) || 0
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    return {
      success: false,
      error: error.message,
      stats: {
        totalOrders: 0,
        pendingOrders: 0,
        approvedOrders: 0,
        totalValue: 0,
        totalSuppliers: 0,
        activeSuppliers: 0,
        paidOrders: 0,
        unpaidOrders: 0,
        partiallyPaidOrders: 0
      }
    };
  }
};

/**
 * Get recent supplier activity
 */
export const getRecentSupplierActivity = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('supplier_activity_log')
      .select(`
        *,
        supplier:supplier_profiles(business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      activities: data
    };
  } catch (error) {
    console.error('Error fetching supplier activity:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =====================================================================
// ORDER HISTORY MANAGEMENT
// =====================================================================

/**
 * Get order history (completed and cancelled orders)
 */
export const getOrderHistory = async (filters = {}) => {
  try {
    let query = supabase
      .from('purchase_orders')
      .select('*')
      .in('status', ['completed', 'cancelled', 'received'])
      .order('order_date', { ascending: false });

    // Apply filters
    if (filters.startDate) {
      query = query.gte('order_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('order_date', filters.endDate);
    }
    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Fetch supplier details
    const supplierIds = [...new Set(orders.map(o => o.supplier_id))];
    const { data: suppliers } = await supabase
      .from('supplier_profiles')
      .select('id, business_name')
      .in('id', supplierIds);

    // Fetch invoice details
    const orderIds = orders.map(o => o.id);
    const { data: invoices } = await supabase
      .from('supplier_invoices')
      .select('purchase_order_id, payment_status, balance_due_ugx, amount_paid_ugx')
      .in('purchase_order_id', orderIds);

    // Create lookups
    const supplierMap = {};
    suppliers?.forEach(s => {
      supplierMap[s.id] = s;
    });

    const invoiceMap = {};
    invoices?.forEach(inv => {
      invoiceMap[inv.purchase_order_id] = inv;
    });

    // Format the data
    const formattedOrders = orders.map(order => {
      const invoice = invoiceMap[order.id];
      return {
        ...order,
        supplierName: supplierMap[order.supplier_id]?.business_name || 'Unknown Supplier',
        payment_status: invoice?.payment_status || 'unpaid',
        amount_paid: invoice?.amount_paid_ugx || 0,
        balance_due: invoice?.balance_due_ugx || order.total_amount_ugx
      };
    });

    return {
      success: true,
      orders: formattedOrders
    };
  } catch (error) {
    console.error('Error fetching order history:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =====================================================================
// PAYMENT MANAGEMENT
// =====================================================================

/**
 * Get orders by payment status
 */
export const getOrdersByPaymentStatus = async (paymentStatus) => {
  try {
    // First get invoices by payment status
    const { data: invoices, error: invError } = await supabase
      .from('supplier_invoices')
      .select('purchase_order_id, payment_status, balance_due_ugx, amount_paid_ugx')
      .eq('payment_status', paymentStatus);

    if (invError) throw invError;

    if (!invoices || invoices.length === 0) {
      return { success: true, orders: [] };
    }

    // Get the corresponding purchase orders
    const orderIds = invoices.map(inv => inv.purchase_order_id);
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .in('id', orderIds);

    if (ordersError) throw ordersError;

    // Get supplier details
    const supplierIds = [...new Set(orders.map(o => o.supplier_id))];
    const { data: suppliers } = await supabase
      .from('supplier_profiles')
      .select('id, business_name')
      .in('id', supplierIds);

    // Create lookups
    const supplierMap = {};
    suppliers?.forEach(s => {
      supplierMap[s.id] = s;
    });

    const invoiceMap = {};
    invoices?.forEach(inv => {
      invoiceMap[inv.purchase_order_id] = inv;
    });

    // Format the data
    const formattedOrders = orders.map(order => {
      const invoice = invoiceMap[order.id];
      return {
        ...order,
        supplierName: supplierMap[order.supplier_id]?.business_name || 'Unknown Supplier',
        payment_status: invoice?.payment_status || 'unpaid',
        amount_paid: invoice?.amount_paid_ugx || 0,
        balance_due: invoice?.balance_due_ugx || order.total_amount_ugx
      };
    });

    return {
      success: true,
      orders: formattedOrders
    };
  } catch (error) {
    console.error('Error fetching orders by payment status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Record payment for an order
 */
export const recordOrderPayment = async (orderId, paymentData) => {
  try {
    const {
      amountPaid,
      paymentMethod,
      paymentReference,
      paymentNotes,
      paidBy
    } = paymentData;

    // Get the purchase order
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select('id, total_amount_ugx, supplier_id')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Get or create invoice
    let { data: invoice, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .select('*')
      .eq('purchase_order_id', orderId)
      .maybeSingle();

    if (invoiceError) throw invoiceError;

    if (!invoice) {
      // Create new invoice if it doesn't exist
      const { data: newInvoice, error: createError } = await supabase
        .from('supplier_invoices')
        .insert({
          supplier_id: order.supplier_id,
          purchase_order_id: orderId,
          invoice_number: `INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          total_amount_ugx: order.total_amount_ugx,
          balance_due_ugx: order.total_amount_ugx,
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (createError) throw createError;
      invoice = newInvoice;
    }

    // Calculate new payment status
    const currentPaid = parseFloat(invoice.amount_paid_ugx || 0);
    const newTotalPaid = currentPaid + parseFloat(amountPaid);
    const totalAmount = parseFloat(invoice.total_amount_ugx);
    const newBalance = totalAmount - newTotalPaid;

    let newPaymentStatus;
    if (newBalance <= 0) {
      newPaymentStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newPaymentStatus = 'partially_paid';
    } else {
      newPaymentStatus = 'unpaid';
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from('supplier_invoices')
      .update({
        amount_paid_ugx: newTotalPaid,
        balance_due_ugx: newBalance > 0 ? newBalance : 0,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    if (updateError) throw updateError;

    // Record payment transaction
    const { error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        supplier_id: order.supplier_id,
        invoice_id: invoice.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid_ugx: amountPaid,
        payment_method: paymentMethod || 'bank_transfer',
        payment_reference: paymentReference,
        notes: paymentNotes,
        paid_by: paidBy,
        status: 'approved'
      });

    if (paymentError) throw paymentError;

    return {
      success: true,
      message: `Payment recorded successfully. Status: ${newPaymentStatus}`,
      paymentStatus: newPaymentStatus,
      amountPaid: newTotalPaid,
      balanceDue: newBalance > 0 ? newBalance : 0
    };
  } catch (error) {
    console.error('Error recording payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  getAllSuppliers,
  getActiveSuppliers,
  updateSupplierStatus,
  getAllPurchaseOrders,
  getPendingPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  sendOrderToSupplier,
  confirmOrderBySupplier,
  getAllDeliveries,
  recordDelivery,
  getSupplierOrderStats,
  getRecentSupplierActivity,
  getOrderHistory,
  getOrdersByPaymentStatus,
  recordOrderPayment
};
