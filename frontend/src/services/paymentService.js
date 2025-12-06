import { supabase } from './supabase';

/**
 * Payment Service for handling payment-related operations
 * Connects with the Supabase database schema
 */
export class PaymentService {
  
  /**
   * Get payment history for a specific supplier
   * @param {string} supplierId - UUID of the supplier
   * @param {string} status - Filter by payment status (optional)
   * @returns {Promise<Array>} Array of payment records
   */
  static async getSupplierPaymentHistory(supplierId, status = null) {
    try {
      // Query payment_transactions joined with purchase_orders
      let query = supabase
        .from('payment_transactions')
        .select(`
          id,
          transaction_number,
          amount_paid,
          payment_method,
          payment_date,
          payment_reference,
          payment_notes,
          confirmed_by_supplier,
          confirmation_date,
          confirmation_notes,
          created_at,
          purchase_orders!inner (
            id,
            po_number,
            total_amount_ugx,
            order_date,
            supplier_id
          )
        `)
        .eq('purchase_orders.supplier_id', supplierId)
        .order('payment_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching supplier payment history:', error);
        throw error;
      }

      // Transform the data to match the frontend format
      return data.map(payment => ({
        id: payment.transaction_number || payment.id,
        date: payment.payment_date || payment.created_at,
        amount: parseFloat(payment.amount_paid || 0),
        status: payment.confirmed_by_supplier ? 'confirmed' : 'pending',
        paymentMethod: payment.payment_method,
        reference: payment.payment_reference || payment.transaction_number,
        orderId: payment.purchase_orders?.po_number || payment.purchase_orders?.id,
        orderAmount: parseFloat(payment.purchase_orders?.total_amount_ugx || 0),
        orderDate: payment.purchase_orders?.order_date,
        confirmed: payment.confirmed_by_supplier,
        confirmationDate: payment.confirmation_date,
        notes: payment.payment_notes,
        currency: 'UGX'
      }));

    } catch (error) {
      console.error('Payment service error:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Get payment statistics for a supplier
   * @param {string} supplierId - UUID of the supplier
   * @returns {Promise<Object>} Payment statistics
   */
  static async getSupplierPaymentStats(supplierId) {
    try {
      // Get all payment transactions for this supplier
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          amount_paid,
          confirmed_by_supplier,
          purchase_orders!inner (
            supplier_id,
            total_amount_ugx,
            payment_status
          )
        `)
        .eq('purchase_orders.supplier_id', supplierId);

      if (error) throw error;

      const confirmed = data.filter(p => p.confirmed_by_supplier);
      const pending = data.filter(p => !p.confirmed_by_supplier);

      const stats = {
        total: data.length,
        confirmed: confirmed.length,
        pending: pending.length,
        totalAmount: data.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0),
        confirmedAmount: confirmed.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0),
        pendingAmount: pending.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  /**
   * Get all payment history for manager view
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of payment records
   */
  static async getAllPaymentHistory(filters = {}) {
    try {
      let query = supabase
        .from('payment_transactions')
        .select(`
          id,
          transaction_number,
          amount_paid,
          payment_method,
          payment_date,
          payment_reference,
          payment_notes,
          confirmed_by_supplier,
          confirmation_date,
          created_at,
          purchase_orders!inner (
            id,
            po_number,
            total_amount_ugx,
            order_date,
            supplier_id,
            users!purchase_orders_supplier_id_fkey (
              id,
              full_name,
              email,
              phone_number
            )
          )
        `)
        .order('payment_date', { ascending: false });

      // Apply filters
      if (filters.supplierId) {
        query = query.eq('orders.supplier_id', filters.supplierId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data for manager view
      return data.map(payment => ({
        id: payment.id,
        paymentId: payment.reference_number || payment.id,
        supplier: {
          id: payment.orders?.suppliers?.id,
          name: payment.orders?.suppliers?.name,
          contact: payment.orders?.suppliers?.contact_person,
          email: payment.orders?.suppliers?.email
        },
        order: {
          id: payment.orders?.id,
          number: payment.orders?.order_number,
          date: payment.orders?.order_date,
          total: payment.orders?.total_amount
        },
        amount: parseFloat(payment.amount),
        currency: payment.currency || 'UGX',
        status: payment.status,
        paymentMethod: payment.payment_method,
        reference: payment.reference_number || payment.transaction_id,
        date: payment.created_at,
        processedAt: payment.processed_at,
        network: payment.network,
        mobileNumber: payment.mobile_number,
        notes: payment.notes
      }));

    } catch (error) {
      console.error('Error fetching all payment history:', error);
      throw error;
    }
  }

  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Created payment record
   */
  static async createPayment(paymentData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          order_id: paymentData.orderId,
          payment_method: paymentData.paymentMethod,
          amount: paymentData.amount,
          currency: paymentData.currency || 'UGX',
          mobile_number: paymentData.mobileNumber,
          network: paymentData.network,
          reference_number: paymentData.reference,
          status: paymentData.status || 'pending',
          notes: paymentData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {string} paymentId - Payment ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional update data
   * @returns {Promise<Object>} Updated payment record
   */
  static async updatePaymentStatus(paymentId, newStatus, additionalData = {}) {
    try {
      const updateData = {
        status: newStatus,
        ...additionalData
      };

      if (newStatus === 'completed') {
        updateData.processed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Calculate due date based on payment terms
   * @param {string} createdDate - Payment creation date
   * @param {number} termsDays - Payment terms in days
   * @returns {string} Due date
   */
  static calculateDueDate(createdDate, termsDays = 30) {
    const date = new Date(createdDate);
    date.setDate(date.getDate() + termsDays);
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate days overdue
   * @param {string} createdDate - Payment creation date
   * @param {string} status - Payment status
   * @param {number} termsDays - Payment terms in days
   * @returns {number} Days overdue (0 if not overdue)
   */
  static calculateDaysOverdue(createdDate, status, termsDays = 30) {
    if (status === 'completed') return 0;
    
    const dueDate = new Date(this.calculateDueDate(createdDate, termsDays));
    const today = new Date();
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Get payment method statistics
   * @param {string} supplierId - Supplier ID (optional)
   * @returns {Promise<Object>} Payment method breakdown
   */
  static async getPaymentMethodStats(supplierId = null) {
    try {
      let query = supabase
        .from('payments')
        .select('payment_method, amount, status');

      if (supplierId) {
        query = query.eq('orders.supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = data.reduce((acc, payment) => {
        const method = payment.payment_method;
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0, completed: 0 };
        }
        acc[method].count++;
        acc[method].amount += parseFloat(payment.amount);
        if (payment.status === 'completed') {
          acc[method].completed++;
        }
        return acc;
      }, {});

      return stats;
    } catch (error) {
      console.error('Error fetching payment method stats:', error);
      throw error;
    }
  }
}

export default PaymentService;