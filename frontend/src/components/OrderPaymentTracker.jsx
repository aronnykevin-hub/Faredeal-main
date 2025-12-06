// =====================================================================
// ORDER PAYMENT TRACKER COMPONENT - Interactive Payment Management
// =====================================================================
// Shows payment progress with ability to add payments
// Used in both Manager and Supplier portals
// =====================================================================

import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiPlus, FiCheck, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '../services/supabase';

const OrderPaymentTracker = ({ order, onPaymentAdded, showAddPayment = false, userRole = 'viewer' }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  const [unconfirmedCount, setUnconfirmedCount] = useState(0);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    reference: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch payment transactions for this order
  useEffect(() => {
    if (order?.id) {
      fetchPaymentTransactions();
    }
  }, [order?.id]);

  const fetchPaymentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('purchase_order_id', order.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      setPaymentTransactions(data || []);
      setUnconfirmedCount(data?.filter(t => !t.confirmed_by_supplier).length || 0);
    } catch (error) {
      console.error('Error fetching payment transactions:', error);
    }
  };

  // Calculate payment percentage
  const paymentPercentage = order.total_amount_ugx > 0
    ? ((order.amount_paid_ugx || 0) / order.total_amount_ugx * 100)
    : 0;

  // Get status color
  const getStatusColor = () => {
    if (paymentPercentage >= 100) return 'text-green-600';
    if (paymentPercentage >= 50) return 'text-blue-600';
    if (paymentPercentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get progress bar color
  const getProgressColor = () => {
    if (paymentPercentage >= 100) return 'bg-green-500';
    if (paymentPercentage >= 50) return 'bg-blue-500';
    if (paymentPercentage > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format currency
  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Handle payment submission
  const handleAddPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount > order.balance_due_ugx) {
      alert(`Payment amount cannot exceed balance due: ${formatUGX(order.balance_due_ugx)}`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call the record_payment_with_tracking function
      const { data, error } = await supabase.rpc('record_payment_with_tracking', {
        p_order_id: order.id,
        p_amount_paid: amount,
        p_payment_method: paymentData.method,
        p_payment_reference: paymentData.reference || null,
        p_payment_date: new Date().toISOString(),
        p_notes: paymentData.notes || null,
        p_paid_by: user?.id
      });

      if (error) throw error;

      alert(
        `✅ Payment Recorded Successfully!\n\n` +
        `Transaction Number: ${data}\n` +
        `Amount: ${formatUGX(amount)}\n` +
        `Method: ${paymentData.method.toUpperCase()}`
      );

      // Reset form
      setPaymentData({
        amount: '',
        method: 'cash',
        reference: '',
        notes: ''
      });
      setShowPaymentModal(false);

      // Refresh transactions
      await fetchPaymentTransactions();

      // Notify parent
      if (onPaymentAdded) {
        onPaymentAdded();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FiDollarSign className="text-blue-600" />
          Payment Progress
        </h3>
        {showAddPayment && order.balance_due_ugx > 0 && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
          >
            <FiPlus /> Add Payment
          </button>
        )}
      </div>

      {/* Payment Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Total Amount */}
        <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Total Amount</div>
          <div className="text-xl font-bold text-blue-600">
            {formatUGX(order.total_amount_ugx)}
          </div>
        </div>

        {/* Amount Paid */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-400 shadow-md">
          <div className="text-xs text-green-700 mb-1 font-semibold uppercase tracking-wide flex items-center gap-1">
            <FiCheck className="text-green-600" /> Paid
          </div>
          <div className="text-2xl font-extrabold text-green-700">
            {formatUGX(order.amount_paid_ugx || 0)}
          </div>
        </div>

        {/* Balance Due */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg border-2 border-red-400 shadow-md">
          <div className="text-xs text-red-700 mb-1 font-semibold uppercase tracking-wide flex items-center gap-1">
            <FiAlertCircle className="text-red-600" /> Balance
          </div>
          <div className="text-2xl font-extrabold text-red-700">
            {formatUGX(order.balance_due_ugx || 0)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 bg-white p-4 rounded-lg border-2 border-gray-300 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Payment Progress</span>
          <span className={`text-2xl font-extrabold ${getStatusColor()}`}>
            {paymentPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 flex items-center justify-end pr-2 shadow-md`}
            style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
          >
            {paymentPercentage > 5 && (
              <FiCheck className="text-white text-sm animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Payment Status Badge */}
      <div className="flex items-center justify-between gap-3">
        {paymentPercentage >= 100 ? (
          <div className="flex items-center gap-2 text-base font-bold text-green-700 bg-green-100 px-4 py-2 rounded-lg border-2 border-green-500 shadow-md flex-1">
            <FiCheck className="text-xl" /> FULLY PAID
          </div>
        ) : paymentPercentage > 0 ? (
          <div className="flex items-center gap-2 text-base font-bold text-yellow-700 bg-yellow-100 px-4 py-2 rounded-lg border-2 border-yellow-500 shadow-md flex-1">
            <FiClock className="text-xl" /> PARTIALLY PAID
          </div>
        ) : (
          <div className="flex items-center gap-2 text-base font-bold text-red-700 bg-red-100 px-4 py-2 rounded-lg border-2 border-red-500 shadow-md flex-1">
            <FiAlertCircle className="text-xl" /> UNPAID
          </div>
        )}
        
        {/* Payment Method */}
        {order.payment_method && (
          <div className="text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-lg border-2 border-gray-300 shadow-sm">
            💳 {order.payment_method.toUpperCase()}
          </div>
        )}
      </div>

      {/* Confirmation Status Indicator */}
      {paymentTransactions.length > 0 && (
        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-gray-300 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheckCircle className={unconfirmedCount === 0 ? 'text-green-500 text-lg' : 'text-yellow-500 text-lg'} />
              <span className="font-bold text-sm text-gray-700">
                {unconfirmedCount === 0 ? 'All Payments Confirmed' : 'Confirmation Status'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="font-bold text-green-600">{paymentTransactions.filter(t => t.confirmed_by_supplier).length}</span>
                <span className="text-gray-500"> Confirmed</span>
              </div>
              {unconfirmedCount > 0 && (
                <div className="text-xs">
                  <span className="font-bold text-yellow-600">{unconfirmedCount}</span>
                  <span className="text-gray-500"> Pending</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Show recent transactions */}
          {paymentTransactions.length > 0 && (
            <div className="mt-3 space-y-2">
              {paymentTransactions.slice(0, 3).map((transaction) => (
                <div 
                  key={transaction.id} 
                  className={`flex items-center justify-between p-2 rounded-md text-xs ${
                    transaction.confirmed_by_supplier 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {transaction.confirmed_by_supplier ? (
                      <FiCheck className="text-green-600" />
                    ) : (
                      <FiClock className="text-yellow-600" />
                    )}
                    <span className="font-mono font-bold text-gray-700">
                      {transaction.transaction_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {formatUGX(transaction.amount_paid)}
                    </span>
                    {transaction.confirmed_by_supplier && transaction.confirmation_date && (
                      <span className="text-gray-500">
                        ✓ {new Date(transaction.confirmation_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {paymentTransactions.length > 3 && (
                <div className="text-center text-xs text-gray-500 pt-1">
                  +{paymentTransactions.length - 3} more transactions
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="text-green-600" />
              Add Payment
            </h3>

            {/* Order Info */}
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <div className="text-sm text-gray-600 mb-1">PO: {order.po_number}</div>
              <div className="text-lg font-bold text-gray-800">
                Balance Due: {formatUGX(order.balance_due_ugx)}
              </div>
            </div>

            {/* Payment Amount */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount (UGX) *
              </label>
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter amount"
                max={order.balance_due_ugx}
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Payment Reference */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Transaction reference"
              />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows="3"
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPaymentTracker;
