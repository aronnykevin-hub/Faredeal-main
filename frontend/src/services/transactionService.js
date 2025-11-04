// ===================================================
// 🧾 TRANSACTION SERVICE
// Handle sales transactions, receipts, and reports
// ===================================================

import { supabase } from './supabase';

class TransactionService {
  
  // ===================================================
  // SAVE TRANSACTION
  // ===================================================
  async saveTransaction(transactionData) {
    try {
      const {
        items,
        subtotal,
        tax,
        total,
        paymentMethod,
        paymentReference,
        paymentFee,
        amountPaid,
        changeGiven,
        customer,
        cashier,
        register,
        location
      } = transactionData;

      // Generate transaction ID and receipt number
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
      const receiptNumber = await this.generateReceiptNumber();

      // Prepare transaction record
      const transactionRecord = {
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        
        // Cashier info
        cashier_name: cashier?.name || 'Cashier',
        register_number: register || 'POS-001',
        store_location: location || 'Kampala Main Branch',
        
        // Financial
        subtotal: parseFloat(subtotal),
        tax_amount: parseFloat(tax),
        tax_rate: 18.00, // Uganda VAT
        total_amount: parseFloat(total),
        
        // Payment
        payment_method: paymentMethod?.id || 'cash',
        payment_provider: paymentMethod?.name || 'Cash',
        payment_reference: paymentReference || transactionId,
        amount_paid: parseFloat(amountPaid || total),
        change_given: parseFloat(changeGiven || 0),
        payment_fee: parseFloat(paymentFee || 0),
        
        // Customer
        customer_name: customer?.name || 'Walk-in Customer',
        customer_phone: customer?.phone || null,
        
        // Items
        items_count: items.length,
        
        // Status
        status: 'completed',
        transaction_date: new Date().toISOString(),
        transaction_time: new Date().toLocaleTimeString('en-UG'),
      };

      // Insert transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('sales_transactions')
        .insert(transactionRecord)
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Transaction insert error:', transactionError);
        throw transactionError;
      }

      console.log('✅ Transaction saved:', transaction);

      // Insert transaction items
      const transactionItems = items.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku || null,
        product_barcode: item.barcode || null,
        category_name: item.categoryName || item.category || 'General',
        unit_price: parseFloat(item.selling_price || item.price),
        quantity: parseInt(item.quantity),
        line_total: parseFloat(item.selling_price || item.price) * parseInt(item.quantity),
        tax_included: true,
        tax_amount: (parseFloat(item.selling_price || item.price) * parseInt(item.quantity)) * 0.18
      }));

      const { error: itemsError } = await supabase
        .from('sales_transaction_items')
        .insert(transactionItems);

      if (itemsError) {
        console.error('❌ Transaction items insert error:', itemsError);
        // Don't throw - transaction is saved, items can be manually added
      } else {
        console.log('✅ Transaction items saved:', transactionItems.length);
      }

      return {
        success: true,
        transaction,
        receiptNumber,
        transactionId
      };

    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===================================================
  // GENERATE RECEIPT NUMBER
  // ===================================================
  async generateReceiptNumber() {
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      // Get today's transaction count
      const { count, error } = await supabase
        .from('sales_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('transaction_date', new Date().setHours(0, 0, 0, 0))
        .lte('transaction_date', new Date().setHours(23, 59, 59, 999));

      if (error) {
        console.error('Error counting transactions:', error);
      }

      const counter = (count || 0) + 1;
      const receiptNumber = `RCP-${today}-${String(counter).padStart(4, '0')}`;
      
      return receiptNumber;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      // Fallback to timestamp-based
      return `RCP-${Date.now()}`;
    }
  }

  // ===================================================
  // GET TRANSACTION BY ID
  // ===================================================
  async getTransaction(transactionId) {
    try {
      const { data: transaction, error: transactionError } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (transactionError) throw transactionError;

      const { data: items, error: itemsError } = await supabase
        .from('sales_transaction_items')
        .select('*')
        .eq('transaction_id', transactionId);

      if (itemsError) throw itemsError;

      return {
        success: true,
        transaction: {
          ...transaction,
          items
        }
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===================================================
  // GET TRANSACTION BY RECEIPT NUMBER
  // ===================================================
  async getTransactionByReceipt(receiptNumber) {
    try {
      const { data: transaction, error: transactionError } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('receipt_number', receiptNumber)
        .single();

      if (transactionError) throw transactionError;

      const { data: items, error: itemsError } = await supabase
        .from('sales_transaction_items')
        .select('*')
        .eq('transaction_id', transaction.id);

      if (itemsError) throw itemsError;

      return {
        success: true,
        transaction: {
          ...transaction,
          items
        }
      };
    } catch (error) {
      console.error('Error fetching transaction by receipt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===================================================
  // GET TODAY'S TRANSACTIONS
  // ===================================================
  async getTodaysTransactions(cashierId = null) {
    try {
      // Get today's date range as ISO strings
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('sales_transactions')
        .select('*')
        .gte('transaction_date', startOfDay.toISOString())
        .lte('transaction_date', endOfDay.toISOString())
        .order('transaction_date', { ascending: false });

      if (cashierId) {
        query = query.eq('cashier_id', cashierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        transactions: data || [],
        count: data?.length || 0,
        totalSales: (data || []).reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0)
      };
    } catch (error) {
      console.error('Error fetching today\'s transactions:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        count: 0,
        totalSales: 0
      };
    }
  }

  // ===================================================
  // GET TRANSACTIONS BY DATE RANGE
  // ===================================================
  async getTransactionsByDateRange(startDate, endDate, cashierId = null) {
    try {
      let query = supabase
        .from('sales_transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (cashierId) {
        query = query.eq('cashier_id', cashierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        transactions: data,
        count: data.length,
        totalSales: data.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        totalTax: data.reduce((sum, t) => sum + parseFloat(t.tax_amount || 0), 0)
      };
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        count: 0,
        totalSales: 0
      };
    }
  }

  // ===================================================
  // GET DAILY REPORT
  // ===================================================
  async getDailyReport(date = new Date()) {
    try {
      const reportDate = new Date(date).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_sales_reports')
        .select('*')
        .eq('report_date', reportDate)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      if (!data) {
        // Generate report for the day
        return await this.generateDailyReport(date);
      }

      return {
        success: true,
        report: data
      };
    } catch (error) {
      console.error('Error fetching daily report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===================================================
  // GENERATE DAILY REPORT
  // ===================================================
  async generateDailyReport(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all transactions for the day
      const { data: transactions, error: transError } = await supabase
        .from('sales_transactions')
        .select('*')
        .gte('transaction_date', startOfDay.toISOString())
        .lte('transaction_date', endOfDay.toISOString())
        .eq('status', 'completed');

      if (transError) throw transError;

      // Calculate report metrics
      const report = {
        report_date: new Date(date).toISOString().split('T')[0],
        total_transactions: transactions.length,
        total_sales_ugx: transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        total_tax_collected: transactions.reduce((sum, t) => sum + parseFloat(t.tax_amount || 0), 0),
        total_discounts_given: transactions.reduce((sum, t) => sum + parseFloat(t.discount_amount || 0), 0),
        
        // Payment methods
        cash_transactions: transactions.filter(t => t.payment_method === 'cash').length,
        cash_amount: transactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        momo_transactions: transactions.filter(t => t.payment_method === 'momo').length,
        momo_amount: transactions.filter(t => t.payment_method === 'momo').reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        airtel_transactions: transactions.filter(t => t.payment_method === 'airtel').length,
        airtel_amount: transactions.filter(t => t.payment_method === 'airtel').reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        card_transactions: transactions.filter(t => t.payment_method === 'card').length,
        card_amount: transactions.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        
        // Performance
        average_basket_size: transactions.length > 0 ? transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) / transactions.length : 0,
        largest_transaction: Math.max(...transactions.map(t => parseFloat(t.total_amount || 0)), 0),
        smallest_transaction: transactions.length > 0 ? Math.min(...transactions.map(t => parseFloat(t.total_amount || 0))) : 0,
        total_items_sold: transactions.reduce((sum, t) => sum + parseInt(t.items_count || 0), 0),
      };

      return {
        success: true,
        report
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===================================================
  // LOG RECEIPT PRINT
  // ===================================================
  async logReceiptPrint(transactionId, receiptNumber, printType = 'original', format = 'thermal') {
    try {
      const { data, error } = await supabase
        .from('receipt_print_log')
        .insert({
          transaction_id: transactionId,
          receipt_number: receiptNumber,
          print_type: printType,
          print_format: format
        });

      if (error) throw error;

      // Update transaction
      await supabase
        .from('sales_transactions')
        .update({ receipt_printed: true })
        .eq('id', transactionId);

      return { success: true };
    } catch (error) {
      console.error('Error logging receipt print:', error);
      return { success: false, error: error.message };
    }
  }

  // ===================================================
  // SEARCH TRANSACTIONS
  // ===================================================
  async searchTransactions(searchTerm) {
    try {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .or(`receipt_number.ilike.%${searchTerm}%,transaction_id.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      return {
        success: true,
        transactions: data,
        count: data.length
      };
    } catch (error) {
      console.error('Error searching transactions:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        count: 0
      };
    }
  }

  // ===================================================
  // VOID TRANSACTION
  // ===================================================
  async voidTransaction(transactionId, reason, voidedBy) {
    try {
      const { data, error } = await supabase
        .from('sales_transactions')
        .update({
          status: 'voided',
          voided_at: new Date().toISOString(),
          voided_by: voidedBy,
          void_reason: reason
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        transaction: data
      };
    } catch (error) {
      console.error('Error voiding transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TransactionService();
