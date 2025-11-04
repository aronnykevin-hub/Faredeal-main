// ===================================================
// 📊 TRANSACTION HISTORY & REPORTS
// View past transactions, daily/weekly/monthly reports
// Works for Employee, Manager, and Admin portals
// ===================================================

import React, { useState, useEffect } from 'react';
import { FiSearch, FiCalendar, FiDownload, FiEye, FiPrinter, FiFilter, FiRefreshCw, FiDollarSign, FiTrendingUp, FiShoppingCart, FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';
import transactionService from '../services/transactionService';
import Receipt from './Receipt';

const TransactionHistory = ({ cashierId = null, viewMode = 'cashier' }) => {
  // viewMode: 'cashier' (own transactions), 'manager' (all transactions), 'admin' (all + analytics)
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [dailyReport, setDailyReport] = useState(null);
  const [statsData, setStatsData] = useState({
    totalTransactions: 0,
    totalSales: 0,
    averageBasket: 0,
    totalItems: 0
  });

  useEffect(() => {
    loadTransactions();
    loadDailyReport();
  }, [dateFilter]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, paymentFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let result;
      
      switch (dateFilter) {
        case 'today':
          result = await transactionService.getTodaysTransactions(cashierId);
          break;
        case 'week':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          result = await transactionService.getTransactionsByDateRange(
            weekStart.toISOString(),
            new Date().toISOString(),
            cashierId
          );
          break;
        case 'month':
          const monthStart = new Date();
          monthStart.setDate(1);
          result = await transactionService.getTransactionsByDateRange(
            monthStart.toISOString(),
            new Date().toISOString(),
            cashierId
          );
          break;
        case 'year':
          const yearStart = new Date();
          yearStart.setMonth(0, 1);
          result = await transactionService.getTransactionsByDateRange(
            yearStart.toISOString(),
            new Date().toISOString(),
            cashierId
          );
          break;
        default:
          result = await transactionService.getTodaysTransactions(cashierId);
      }

      if (result.success) {
        setTransactions(result.transactions);
        setFilteredTransactions(result.transactions);
        
        // Calculate stats
        setStatsData({
          totalTransactions: result.count,
          totalSales: result.totalSales || 0,
          averageBasket: result.count > 0 ? (result.totalSales / result.count) : 0,
          totalItems: result.transactions.reduce((sum, t) => sum + (t.items_count || 0), 0)
        });
        
        toast.success(`✅ Loaded ${result.count} transaction${result.count !== 1 ? 's' : ''}`);
      } else {
        toast.error('❌ Failed to load transactions');
        setTransactions([]);
        setFilteredTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('❌ Error loading transactions');
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReport = async () => {
    try {
      const result = await transactionService.getDailyReport();
      if (result.success) {
        setDailyReport(result.report);
      }
    } catch (error) {
      console.error('Error loading daily report:', error);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_phone?.includes(searchTerm)
      );
    }

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(t => t.payment_method === paymentFilter);
    }

    setFilteredTransactions(filtered);
  };

  const handleViewReceipt = async (transaction) => {
    try {
      // Get full transaction with items
      const result = await transactionService.getTransaction(transaction.id);
      
      if (result.success) {
        const receiptData = {
          receiptNumber: transaction.receipt_number,
          transactionId: transaction.transaction_id,
          timestamp: transaction.transaction_date,
          amount: transaction.total_amount,
          paymentMethod: transaction.payment_provider,
          receipt: {
            items: result.transaction.items,
            subtotal: transaction.subtotal,
            tax: transaction.tax_amount,
            total: transaction.total_amount,
            cashier: transaction.cashier_name,
            register: transaction.register_number
          }
        };
        
        setSelectedTransaction(receiptData);
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
      toast.error('❌ Failed to load receipt');
    }
  };

  const handleDownloadReport = () => {
    if (!dailyReport) {
      toast.error('❌ No report data available');
      return;
    }

    const reportText = `
FAREDEAL UGANDA - DAILY SALES REPORT
=====================================

Date: ${dailyReport.report_date}
Generated: ${new Date().toLocaleString('en-UG')}

SUMMARY
-------
Total Transactions: ${dailyReport.total_transactions}
Total Sales: ${formatCurrency(dailyReport.total_sales_ugx)}
Total Tax Collected: ${formatCurrency(dailyReport.total_tax_collected)}
Average Basket: ${formatCurrency(dailyReport.average_basket_size)}

PAYMENT METHODS
---------------
Cash: ${dailyReport.cash_transactions} transactions - ${formatCurrency(dailyReport.cash_amount)}
Mobile Money: ${dailyReport.momo_transactions} transactions - ${formatCurrency(dailyReport.momo_amount)}
Airtel Money: ${dailyReport.airtel_transactions} transactions - ${formatCurrency(dailyReport.airtel_amount)}
Card: ${dailyReport.card_transactions} transactions - ${formatCurrency(dailyReport.card_amount)}

PERFORMANCE
-----------
Largest Transaction: ${formatCurrency(dailyReport.largest_transaction)}
Smallest Transaction: ${formatCurrency(dailyReport.smallest_transaction)}
Total Items Sold: ${dailyReport.total_items_sold}

Generated by FAREDEAL POS System
www.faredeal.ug
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daily-Report-${dailyReport.report_date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('📥 Report downloaded!');
  };

  const handlePrintReport = () => {
    if (!dailyReport) {
      toast.error('❌ No report data available');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Report - ${dailyReport.report_date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
          h2 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 5px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #e5e7eb; }
          .header-info { text-align: center; margin-bottom: 20px; color: #6b7280; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>🏪 FAREDEAL UGANDA - DAILY SALES REPORT</h1>
        <div class="header-info">
          <p><strong>Report Date:</strong> ${dailyReport.report_date}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString('en-UG')}</p>
        </div>

        <h2>📊 Sales Summary</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Transactions</td><td>${dailyReport.total_transactions}</td></tr>
          <tr><td>Total Sales</td><td>${formatCurrency(dailyReport.total_sales_ugx)}</td></tr>
          <tr><td>Total Tax Collected</td><td>${formatCurrency(dailyReport.total_tax_collected)}</td></tr>
          <tr><td>Average Basket Size</td><td>${formatCurrency(dailyReport.average_basket_size)}</td></tr>
          <tr><td>Total Items Sold</td><td>${dailyReport.total_items_sold}</td></tr>
        </table>

        <h2>💳 Payment Methods Breakdown</h2>
        <table>
          <tr><th>Method</th><th>Transactions</th><th>Amount</th></tr>
          <tr><td>💵 Cash</td><td>${dailyReport.cash_transactions}</td><td>${formatCurrency(dailyReport.cash_amount)}</td></tr>
          <tr><td>📱 Mobile Money (MTN)</td><td>${dailyReport.momo_transactions}</td><td>${formatCurrency(dailyReport.momo_amount)}</td></tr>
          <tr><td>📱 Airtel Money</td><td>${dailyReport.airtel_transactions}</td><td>${formatCurrency(dailyReport.airtel_amount)}</td></tr>
          <tr><td>💳 Card</td><td>${dailyReport.card_transactions}</td><td>${formatCurrency(dailyReport.card_amount)}</td></tr>
        </table>

        <h2>📈 Performance Metrics</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Largest Transaction</td><td>${formatCurrency(dailyReport.largest_transaction)}</td></tr>
          <tr><td>Smallest Transaction</td><td>${formatCurrency(dailyReport.smallest_transaction)}</td></tr>
        </table>

        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by FAREDEAL POS System | www.faredeal.ug</p>
          <p>🇺🇬 Uganda's Leading Supermarket Management System</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <FiShoppingCart className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Transactions</p>
          <p className="text-3xl font-bold">{statsData.totalTransactions}</p>
          <p className="text-xs opacity-60 mt-1">{dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : dateFilter === 'month' ? 'This Month' : 'This Year'}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <FiDollarSign className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Total Sales</p>
          <p className="text-2xl font-bold">{formatCurrency(statsData.totalSales)}</p>
          <p className="text-xs opacity-60 mt-1">Revenue Generated</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <FiTrendingUp className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Avg Basket</p>
          <p className="text-2xl font-bold">{formatCurrency(statsData.averageBasket)}</p>
          <p className="text-xs opacity-60 mt-1">Per Transaction</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <FiShoppingCart className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Items Sold</p>
          <p className="text-3xl font-bold">{statsData.totalItems}</p>
          <p className="text-xs opacity-60 mt-1">Total Products</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search receipt, customer, phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="today">📅 Today</option>
              <option value="week">📆 Last 7 Days</option>
              <option value="month">📊 This Month</option>
              <option value="year">🗓️ This Year</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="cash">Cash</option>
              <option value="momo">MTN Mobile Money</option>
              <option value="airtel">Airtel Money</option>
              <option value="card">Card</option>
            </select>

            <button
              onClick={loadTransactions}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Report Actions */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleDownloadReport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiDownload className="h-4 w-4" />
            <span>Download Report</span>
          </button>
          
          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FiPrinter className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading transactions...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {transaction.receipt_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(transaction.transaction_date).toLocaleDateString('en-UG')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.transaction_date).toLocaleTimeString('en-UG')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaction.customer_name || 'Walk-in'}</div>
                      {transaction.customer_phone && (
                        <div className="text-xs text-gray-500">{transaction.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        transaction.payment_method === 'momo' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.payment_method === 'airtel' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.payment_provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.items_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(transaction.total_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewReceipt(transaction)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <FiEye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <Receipt
          transaction={{}}
          receiptData={selectedTransaction}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default TransactionHistory;
