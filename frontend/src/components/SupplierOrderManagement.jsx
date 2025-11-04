// =====================================================================
// SUPPLIER ORDER MANAGEMENT COMPONENT - FAREDEAL UGANDA 🇺🇬
// =====================================================================
// Comprehensive supplier order verification and management for managers
// Features: Create PO, Approve/Reject, Send to Supplier, Track Deliveries
// Real-time Supabase integration - NO MOCK DATA
// =====================================================================

import React, { useState, useEffect } from 'react';
import { 
  FiTruck, FiCheckCircle, FiXCircle, FiSend, FiEdit, FiPlus,
  FiPackage, FiDollarSign, FiClock, FiAlertTriangle, FiSearch,
  FiDownload, FiMail, FiPhone, FiMapPin, FiCalendar, FiUser
} from 'react-icons/fi';
import supplierOrdersService from '../services/supplierOrdersService';
import { supabase } from '../services/supabase';

const SupplierOrderManagement = () => {
  // State Management
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({});

  /**
   * Get current manager ID from localStorage or Supabase auth
   */
  const getManagerId = async () => {
    let managerId = localStorage.getItem('userId');
    
    if (!managerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        managerId = user.id;
        localStorage.setItem('userId', user.id);
      }
    }
    
    return managerId;
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false); // NEW: Approval with payment modal
  const [approvalOrderId, setApprovalOrderId] = useState(null); // NEW: Order being approved
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'history'
  
  // NEW: Approval form state
  const [approvalData, setApprovalData] = useState({
    initialPayment: 0,
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0], // Today's date
    nextPaymentDate: '',
    adjustedTotal: null, // For balance adjustments
    adjustmentReason: '',
    notes: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [statusFilter, priorityFilter, paymentFilter, viewMode]);

  /**
   * Load all supplier order data from Supabase
   */
  const loadAllData = async () => {
    setLoading(true);
    try {
      let ordersResponse;
      
      // Load based on view mode
      if (viewMode === 'history') {
        ordersResponse = await supplierOrdersService.getOrderHistory({
          status: statusFilter === 'all' ? null : statusFilter,
          priority: priorityFilter === 'all' ? null : priorityFilter
        });
      } else if (paymentFilter !== 'all') {
        ordersResponse = await supplierOrdersService.getOrdersByPaymentStatus(paymentFilter);
      } else {
        ordersResponse = await supplierOrdersService.getAllPurchaseOrders({
          status: statusFilter === 'all' ? null : statusFilter,
          priority: priorityFilter === 'all' ? null : priorityFilter
        });
      }

      const [suppliersResponse, statsResponse] = await Promise.all([
        supplierOrdersService.getActiveSuppliers(),
        supplierOrdersService.getSupplierOrderStats()
      ]);

      if (ordersResponse.success) {
        setOrders(ordersResponse.orders);
      } else {
        setError(ordersResponse.error);
      }

      if (suppliersResponse.success) {
        setSuppliers(suppliersResponse.suppliers);
      }

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

    } catch (err) {
      console.error('Error loading supplier data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle order approval - Opens modal for payment details
   */
  const handleApproveOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    setApprovalOrderId(orderId);
    setSelectedOrder(order);
    setApprovalData({
      initialPayment: 0,
      paymentMethod: 'cash',
      notes: ''
    });
    setShowApprovalModal(true);
  };
  
  /**
   * Submit order approval with payment
   */
  const submitOrderApproval = async () => {
    try {
      const managerId = await getManagerId();
      if (!managerId) {
        alert('❌ Error: User not authenticated. Please log in again.');
        return;
      }

      const selectedOrderData = orders.find(o => o.id === approvalOrderId);
      
      // Step 1: If balance was adjusted, apply the adjustment first
      if (approvalData.adjustedTotal && approvalData.adjustedTotal !== selectedOrderData.total_amount_ugx) {
        const { data: adjustData, error: adjustError } = await supabase.rpc('adjust_order_balance', {
          p_order_id: approvalOrderId,
          p_new_total_amount: parseFloat(approvalData.adjustedTotal),
          p_adjustment_reason: approvalData.adjustmentReason || 'Manager adjustment',
          p_adjusted_by: managerId,
          p_requires_supplier_acceptance: true
        });

        if (adjustError) {
          console.error('❌ Error adjusting balance:', adjustError);
          alert(`❌ Error: ${adjustError.message}`);
          return;
        }

        if (adjustData && !adjustData.success) {
          alert(`❌ Error: ${adjustData.error}`);
          return;
        }

        console.log('� Balance adjusted:', adjustData);
      }
      
      // Step 2: Approve order with payment details
      console.log('�📝 Approving order with payment:', {
        orderId: approvalOrderId,
        managerId,
        ...approvalData
      });
      
      const { data, error } = await supabase.rpc('approve_order_with_payment', {
        p_order_id: approvalOrderId,
        p_approved_by: managerId,
        p_initial_payment: parseFloat(approvalData.initialPayment) || 0,
        p_payment_method: approvalData.paymentMethod,
        p_payment_date: approvalData.paymentDate ? new Date(approvalData.paymentDate).toISOString() : new Date().toISOString(),
        p_next_payment_date: approvalData.nextPaymentDate || null,
        p_notes: approvalData.notes
      });

      if (error) {
        console.error('❌ Error approving order:', error);
        alert(`❌ Error: ${error.message}`);
        return;
      }
      
      if (data && !data.success) {
        alert(`❌ Error: ${data.error}`);
        return;
      }

      // Show success message with payment details
      let successMsg = '✅ Purchase order approved successfully!\n\n';
      if (data.balance_due > 0) {
        successMsg += `💰 Payment: UGX ${approvalData.initialPayment.toLocaleString()}\n`;
        successMsg += `📊 Balance: UGX ${data.balance_due.toLocaleString()}\n`;
        if (approvalData.nextPaymentDate) {
          successMsg += `📅 Next Payment: ${approvalData.nextPaymentDate}`;
        }
      } else if (approvalData.initialPayment > 0) {
        successMsg += '💚 FULLY PAID!';
      }

      alert(successMsg);
      setShowApprovalModal(false);
      setApprovalData({
        initialPayment: 0,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        nextPaymentDate: '',
        adjustedTotal: null,
        adjustmentReason: '',
        notes: ''
      });
      loadAllData(); // Reload data
    } catch (err) {
      console.error('Error approving order:', err);
      alert('Failed to approve order');
    }
  };

  /**
   * Handle order rejection
   */
  const handleRejectOrder = async (orderId) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      const managerId = await getManagerId();
      if (!managerId) {
        alert('❌ Error: User not authenticated. Please log in again.');
        return;
      }
      
      const response = await supplierOrdersService.rejectPurchaseOrder(orderId, reason, managerId);

      if (response.success) {
        alert('❌ Purchase order rejected');
        loadAllData();
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      alert('Failed to reject order');
    }
  };

  /**
   * Handle send to supplier
   */
  const handleSendToSupplier = async (orderId) => {
    if (!confirm('Send this order to the supplier?')) return;

    try {
      const managerId = await getManagerId();
      if (!managerId) {
        alert('❌ Error: User not authenticated. Please log in again.');
        return;
      }
      
      const response = await supplierOrdersService.sendOrderToSupplier(orderId, managerId);

      if (response.success) {
        alert(`📧 Order sent to ${response.order.supplier?.business_name}`);
        loadAllData();
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (err) {
      console.error('Error sending order:', err);
      alert('Failed to send order');
    }
  };

  /**
   * Format currency to UGX
   */
  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800 border-gray-300',
      'pending_approval': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'sent_to_supplier': 'bg-blue-100 text-blue-800 border-blue-300',
      'confirmed': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'partially_received': 'bg-purple-100 text-purple-800 border-purple-300',
      'received': 'bg-teal-100 text-teal-800 border-teal-300',
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'cancelled': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  /**
   * Get priority color
   */
  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-600',
      'normal': 'bg-blue-100 text-blue-600',
      'high': 'bg-orange-100 text-orange-600',
      'urgent': 'bg-red-100 text-red-600'
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  /**
   * Get payment status color
   */
  const getPaymentStatusColor = (paymentStatus) => {
    const colors = {
      'paid': 'bg-green-100 text-green-800 border-green-300',
      'unpaid': 'bg-red-100 text-red-800 border-red-300',
      'partially_paid': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'overdue': 'bg-orange-100 text-orange-800 border-orange-300',
      'disputed': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[paymentStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  /**
   * Get payment status label
   */
  const getPaymentStatusLabel = (paymentStatus) => {
    const labels = {
      'paid': '✅ PAID',
      'unpaid': '❌ UNPAID',
      'partially_paid': '⚠️ HALF PAID',
      'overdue': '🔴 OVERDUE',
      'disputed': '⚡ DISPUTED'
    };
    return labels[paymentStatus] || paymentStatus?.toUpperCase();
  };

  /**
   * Filter orders based on search term
   */
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.po_number?.toLowerCase().includes(searchLower) ||
      order.supplierName?.toLowerCase().includes(searchLower) ||
      order.orderedBy?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier orders from Supabase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <FiAlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadAllData}
              className="mt-2 text-sm text-red-700 underline hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-yellow-500 via-red-600 to-black rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center mb-2">
              <FiTruck className="mr-3 h-8 w-8" />
              🇺🇬 Supplier Order Verification & Management
            </h2>
            <p className="text-yellow-100 text-lg">
              FAREDEAL Uganda - Complete Supplier & Purchase Order Management System
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition-all duration-300 flex items-center space-x-2 shadow-lg"
          >
            <FiPlus className="h-5 w-5" />
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center space-x-4 mb-4">
        <button
          onClick={() => setViewMode('active')}
          className={`px-8 py-3 rounded-lg font-bold transition-all duration-300 ${
            viewMode === 'active'
              ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📦 Active Orders
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-8 py-3 rounded-lg font-bold transition-all duration-300 ${
            viewMode === 'history'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📚 Order History
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Orders */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-blue-600">Total Orders</h3>
            <FiPackage className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-800">{stats.totalOrders || 0}</p>
          <p className="text-xs text-blue-600 mt-1">{formatUGX(stats.totalValue)}</p>
        </div>

        {/* Pending Approval */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-yellow-600">Pending</h3>
            <FiClock className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-800">{stats.pendingOrders || 0}</p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting action</p>
        </div>

        {/* Completed Orders */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-green-600">Completed</h3>
            <FiCheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-800">{stats.completedOrders || 0}</p>
          <p className="text-xs text-green-600 mt-1">Delivered</p>
        </div>

        {/* Paid Orders */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-emerald-600">✅ Paid</h3>
            <FiDollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.paidOrders || 0}</p>
          <p className="text-xs text-emerald-600 mt-1">{formatUGX(stats.totalPaidAmount)}</p>
        </div>

        {/* Half Paid Orders */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-orange-600">⚠️ Half Paid</h3>
            <FiDollarSign className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-800">{stats.partiallyPaidOrders || 0}</p>
          <p className="text-xs text-orange-600 mt-1">Partial payments</p>
        </div>

        {/* Unpaid Orders */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-red-600">❌ Unpaid</h3>
            <FiAlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-800">{stats.unpaidOrders || 0}</p>
          <p className="text-xs text-red-600 mt-1">{formatUGX(stats.totalOutstanding)}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by PO number, supplier, or ordered by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="sent_to_supplier">Sent to Supplier</option>
                <option value="confirmed">Confirmed</option>
                <option value="received">Received</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-gray-700">Priority:</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">🔥 Urgent</option>
                <option value="high">⚠️ High</option>
                <option value="normal">📋 Normal</option>
                <option value="low">📝 Low</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-gray-700">Payment:</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Payments</option>
                <option value="paid">✅ Paid</option>
                <option value="partially_paid">⚠️ Half Paid</option>
                <option value="unpaid">❌ Unpaid</option>
                <option value="overdue">🔴 Overdue</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(statusFilter !== 'all' || priorityFilter !== 'all' || paymentFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setPaymentFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <FiPackage className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Orders Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters or search term'
                : 'Create your first purchase order to get started'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl p-6 shadow-lg border-2 hover:shadow-xl transition-all duration-300 ${
                order.status === 'pending_approval' ? 'border-yellow-300' :
                order.status === 'approved' ? 'border-green-300' :
                order.status === 'cancelled' ? 'border-red-300' :
                'border-gray-200'
              }`}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{order.po_number}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                      {order.status?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(order.priority)}`}>
                      {order.priority === 'urgent' && '🔥 '}
                      {order.priority === 'high' && '⚠️ '}
                      {order.priority === 'normal' && '📋 '}
                      {order.priority === 'low' && '📝 '}
                      {order.priority?.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPaymentStatusColor(order.payment_status)}`}>
                      {getPaymentStatusLabel(order.payment_status)}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-blue-600 mb-3">{order.supplierName}</h4>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{formatUGX(order.total_amount_ugx)}</p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  
                  {/* Payment Status Visual */}
                  {order.payment_status === 'paid' && (
                    <div className="mt-2 bg-green-100 px-3 py-2 rounded-lg border border-green-300">
                      <p className="text-sm font-bold text-green-800">✅ FULLY PAID</p>
                      {order.last_payment_date && (
                        <p className="text-xs text-green-600">
                          {new Date(order.last_payment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {order.payment_status === 'partially_paid' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center bg-green-50 px-2 py-1 rounded border border-green-200">
                        <span className="text-xs text-gray-600">Paid:</span>
                        <span className="text-sm font-bold text-green-700">{formatUGX(order.amount_paid_ugx || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-red-50 px-2 py-1 rounded border border-red-200">
                        <span className="text-xs text-gray-600">Balance:</span>
                        <span className="text-sm font-bold text-red-700">{formatUGX(order.balance_due_ugx || 0)}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{width: `${((order.amount_paid_ugx || 0) / order.total_amount_ugx) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-1">
                        {(((order.amount_paid_ugx || 0) / order.total_amount_ugx) * 100).toFixed(1)}% paid
                      </p>
                      {order.next_payment_date && (
                        <div className="mt-1 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                          <p className="text-xs text-yellow-700">
                            📅 Next: {new Date(order.next_payment_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {order.payment_status === 'unpaid' && (
                    <div className="mt-2 bg-red-100 px-3 py-2 rounded-lg border border-red-300">
                      <p className="text-sm font-bold text-red-800">❌ UNPAID</p>
                      <p className="text-xs text-red-600">Due: {formatUGX(order.total_amount_ugx)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FiCalendar className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Order Date</p>
                    <p className="font-semibold text-gray-900">{new Date(order.order_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiClock className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Expected Delivery</p>
                    <p className="font-semibold text-gray-900">
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiUser className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Ordered By</p>
                    <p className="font-semibold text-gray-900">{order.orderedBy}</p>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Order Items ({order.items.length})</h5>
                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {item.product_name || item.productName} × {item.quantity}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatUGX((item.unit_price || item.unitPrice) * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-blue-600 font-semibold">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Notes:</strong> {order.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-3 pt-4 border-t border-gray-200">
                {order.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => handleApproveOrder(order.id)}
                      className="flex-1 min-w-[180px] bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg"
                    >
                      <FiCheckCircle className="h-5 w-5" />
                      <span>Approve Order</span>
                    </button>
                    <button
                      onClick={() => handleRejectOrder(order.id)}
                      className="flex-1 min-w-[180px] bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg"
                    >
                      <FiXCircle className="h-5 w-5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
                
                {order.status === 'approved' && (
                  <button
                    onClick={() => handleSendToSupplier(order.id)}
                    className="flex-1 min-w-[180px] bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg"
                  >
                    <FiSend className="h-5 w-5" />
                    <span>Send to Supplier</span>
                  </button>
                )}

                {/* Payment Button - Show if order is received/completed and not fully paid */}
                {(order.status === 'received' || order.status === 'completed') && order.payment_status !== 'paid' && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 min-w-[180px] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2 font-bold shadow-lg"
                  >
                    <FiDollarSign className="h-5 w-5" />
                    <span>Record Payment</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center space-x-2"
                >
                  <FiEdit className="h-5 w-5" />
                  <span>View Details</span>
                </button>

                <button
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all duration-300 flex items-center space-x-2"
                  title="Download PDF"
                >
                  <FiDownload className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAllData();
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && !showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Purchase Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Complete order details would go here */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">PO Number</p>
                  <p className="font-bold text-lg">{selectedOrder.po_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-bold text-lg text-green-600">{formatUGX(selectedOrder.total_amount_ugx)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-semibold">{selectedOrder.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border-2 ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                    {getPaymentStatusLabel(selectedOrder.payment_status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className="font-bold text-lg text-red-600">{formatUGX(selectedOrder.balance_due)}</p>
                </div>
              </div>

              {/* Items Table */}
              {selectedOrder.items && Array.isArray(selectedOrder.items) && (
                <div>
                  <h3 className="font-bold text-lg mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Unit Price</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-3">{item.product_name || item.productName}</td>
                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatUGX(item.unit_price || item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatUGX((item.unit_price || item.unitPrice) * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
            loadAllData();
          }}
        />
      )}
    </div>
  );
};

// =====================================================================
// CREATE ORDER MODAL COMPONENT
// =====================================================================
const CreateOrderModal = ({ suppliers, onClose, onSuccess }) => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [newItem, setNewItem] = useState({
    productName: '',
    quantity: 1,
    unitPrice: 0
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('FAREDEAL Main Store, Kampala');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = () => {
    if (!newItem.productName || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      alert('Please fill in all item details');
      return;
    }

    const item = {
      product_name: newItem.productName,
      quantity: parseInt(newItem.quantity),
      unit_price: parseFloat(newItem.unitPrice),
      total: parseInt(newItem.quantity) * parseFloat(newItem.unitPrice)
    };

    setOrderItems([...orderItems, item]);
    setNewItem({ productName: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18; // 18% VAT
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) {
      alert('Please select a supplier');
      return;
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (!expectedDeliveryDate) {
      alert('Please select expected delivery date');
      return;
    }

    setSubmitting(true);

    try {
      // Get manager ID from localStorage or Supabase auth
      let managerId = localStorage.getItem('userId');
      
      // If no userId in localStorage, try to get from Supabase auth
      if (!managerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          managerId = user.id;
          localStorage.setItem('userId', user.id);
        }
      }
      
      // If still no manager ID, show error
      if (!managerId) {
        alert('❌ Error: User not authenticated. Please log in again.');
        return;
      }
      
      const orderData = {
        supplierId: selectedSupplier,
        items: orderItems,
        expectedDeliveryDate,
        deliveryAddress,
        deliveryInstructions,
        priority,
        notes,
        orderedBy: managerId
      };

      const response = await supplierOrdersService.createPurchaseOrder(orderData);

      if (response.success) {
        alert('✅ Purchase order created successfully!');
        onSuccess();
      } else {
        alert(`❌ Error: ${response.error}`);
      }
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotal();

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🇺🇬 Create New Purchase Order</h2>
              <p className="text-green-100 mt-1">FAREDEAL Uganda - Supplier Order System</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
              disabled={submitting}
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🏢 Select Supplier *
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              required
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.business_name} ({supplier.supplier_code})
                </option>
              ))}
            </select>
          </div>

          {/* Order Items */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📦 Order Items</h3>
            
            {/* Add Item Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newItem.productName}
                    onChange={(e) => setNewItem({...newItem, productName: e.target.value})}
                    placeholder="Enter product name"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    min="1"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Unit Price (UGX)
                  </label>
                  <input
                    type="number"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})}
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center space-x-2 font-semibold"
              >
                <FiPlus className="h-5 w-5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Items List */}
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-3">{item.product_name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatUGX(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatUGX(item.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50 border-t-2 border-green-200">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-bold">Subtotal:</td>
                      <td className="px-4 py-3 text-right font-bold">{formatUGX(totals.subtotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-semibold">VAT (18%):</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatUGX(totals.tax)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-bold text-lg">TOTAL:</td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-green-600">{formatUGX(totals.total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Add your first item above.
              </div>
            )}
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📅 Expected Delivery Date *
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ⚡ Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="low">📝 Low</option>
                <option value="normal">📋 Normal</option>
                <option value="high">⚠️ High</option>
                <option value="urgent">🔥 Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📍 Delivery Address *
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Delivery Instructions
            </label>
            <textarea
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Any special delivery instructions..."
              rows="2"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              💬 Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or requirements..."
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || orderItems.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Order...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="h-5 w-5" />
                  <span>Create Purchase Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// PAYMENT MODAL COMPONENT
// =====================================================================
const PaymentModal = ({ order, onClose, onSuccess }) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(amountPaid);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > parseFloat(order.balance_due)) {
      alert(`Payment amount cannot exceed balance due: ${formatUGX(order.balance_due)}`);
      return;
    }

    setSubmitting(true);

    try {
      const userId = localStorage.getItem('userId') || 'default-manager-id';
      
      const paymentData = {
        amountPaid: amount,
        paymentMethod,
        paymentReference,
        paymentNotes,
        paidBy: userId
      };

      const response = await supplierOrdersService.recordOrderPayment(order.id, paymentData);

      if (response.success) {
        alert(`✅ ${response.message}\n\nAmount Paid: ${formatUGX(amount)}\nNew Balance: ${formatUGX(response.balanceDue)}`);
        onSuccess();
      } else {
        alert(`❌ Error: ${response.error}`);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <FiDollarSign className="mr-3 h-8 w-8" />
                💰 Record Payment - FAREDEAL Uganda
              </h2>
              <p className="text-green-100 mt-1">Order: {order.po_number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
              disabled={submitting}
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <h3 className="font-bold text-lg mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-semibold">{order.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order Total:</span>
                <span className="font-semibold">{formatUGX(order.total_amount_ugx)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Already Paid:</span>
                <span className="font-semibold text-green-600">{formatUGX(order.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="font-bold text-lg">Balance Due:</span>
                <span className="font-bold text-lg text-red-600">{formatUGX(order.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              💵 Payment Amount (UGX) *
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter payment amount"
              min="0"
              max={order.balance_due}
              step="1000"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-lg font-semibold"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum: {formatUGX(order.balance_due)}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              💳 Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              required
            >
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="mobile_money">📱 Mobile Money (MTN/Airtel)</option>
              <option value="cash">💵 Cash</option>
              <option value="cheque">📝 Cheque</option>
              <option value="credit_card">💳 Credit Card</option>
            </select>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔖 Payment Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., TXN123456789, Cheque #12345"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Payment Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Payment Notes
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Any additional notes about this payment..."
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="h-5 w-5" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // =============================================
  // APPROVAL WITH PAYMENT MODAL
  // =============================================
  const ApprovalModal = () => {
    if (!showApprovalModal || !selectedOrder) return null;

    const originalTotal = selectedOrder.total_amount_ugx || 0;
    const adjustedTotal = approvalData.adjustedTotal ? parseFloat(approvalData.adjustedTotal) : originalTotal;
    const totalAmount = adjustedTotal;
    const paymentAmount = parseFloat(approvalData.initialPayment) || 0;
    const balance = totalAmount - paymentAmount;
    const discount = originalTotal - adjustedTotal;
    const paymentStatus = paymentAmount >= totalAmount ? 'paid' : paymentAmount > 0 ? 'partially_paid' : 'unpaid';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">✅ Approve Purchase Order</h2>
                <p className="text-blue-100 mt-1">Order #{selectedOrder.po_number}</p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-white hover:text-gray-200 text-3xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h3 className="font-bold text-gray-800 mb-3">📋 Order Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Supplier:</span>
                  <p className="font-semibold">{selectedOrder.supplierName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  {discount > 0 ? (
                    <div>
                      <p className="font-semibold text-sm line-through text-gray-500">
                        UGX {originalTotal.toLocaleString()}
                      </p>
                      <p className="font-bold text-lg text-purple-600">
                        UGX {totalAmount.toLocaleString()}
                        <span className="text-xs text-green-600 ml-2">(-{discount.toLocaleString()})</span>
                      </p>
                    </div>
                  ) : (
                    <p className="font-bold text-lg text-blue-600">
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(totalAmount)}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Items:</span>
                  <p className="font-semibold">{selectedOrder.items?.length || 0} items</p>
                </div>
                {discount > 0 && (
                  <div className="col-span-2 bg-green-100 p-2 rounded border border-green-300">
                    <p className="text-xs text-green-800 font-bold">
                      ✨ Discount Applied: UGX {discount.toLocaleString()} 
                      <span className="ml-2">({((discount/originalTotal)*100).toFixed(1)}% off)</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h3 className="font-bold text-gray-800 mb-4">💰 Payment Details</h3>
              
              {/* Initial Payment Amount */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💵 Initial Payment Amount (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="1000"
                  value={approvalData.initialPayment}
                  onChange={(e) => setApprovalData({...approvalData, initialPayment: e.target.value})}
                  placeholder="Enter amount (0 for unpaid)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-lg font-semibold"
                />
                <div className="mt-2 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-bold text-green-600">
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(paymentAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(balance)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="text-gray-700 font-semibold">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {paymentStatus === 'paid' && '✅ FULLY PAID'}
                      {paymentStatus === 'partially_paid' && '⚠️ HALF PAID'}
                      {paymentStatus === 'unpaid' && '❌ UNPAID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💳 Payment Method
                </label>
                <select
                  value={approvalData.paymentMethod}
                  onChange={(e) => setApprovalData({...approvalData, paymentMethod: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="mobile_money">📱 Mobile Money</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="check">📝 Cheque</option>
                  <option value="credit">💳 Credit</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📅 Payment Date
                </label>
                <input
                  type="date"
                  value={approvalData.paymentDate}
                  onChange={(e) => setApprovalData({...approvalData, paymentDate: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Next Payment Date (if partial payment) */}
              {balance > 0 && paymentAmount > 0 && (
                <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📆 Next Payment Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={approvalData.nextPaymentDate}
                    onChange={(e) => setApprovalData({...approvalData, nextPaymentDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                  />
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Set when you expect the next payment of UGX {balance.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📝 Notes (Optional)
                </label>
                <textarea
                  value={approvalData.notes}
                  onChange={(e) => setApprovalData({...approvalData, notes: e.target.value})}
                  placeholder="Add any notes about this approval or payment..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Balance Adjustment Section */}
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <h3 className="font-bold text-gray-800 mb-4">✂️ Adjust Order Total (Optional)</h3>
              <p className="text-sm text-purple-700 mb-4">
                💡 You can reduce the order total (apply discount). Supplier must accept this change.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💰 Adjusted Total Amount (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  max={originalTotal}
                  step="1000"
                  value={approvalData.adjustedTotal || originalTotal}
                  onChange={(e) => setApprovalData({...approvalData, adjustedTotal: e.target.value})}
                  placeholder={`Original: ${originalTotal.toLocaleString()}`}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg font-semibold"
                />
                {discount > 0 && (
                  <div className="mt-2 bg-white rounded p-3 border border-purple-300">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Original Total:</span>
                      <span className="font-semibold line-through">UGX {originalTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-purple-600 font-bold">Discount:</span>
                      <span className="font-bold text-green-600">-UGX {discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-purple-200">
                      <span className="text-gray-800">New Total:</span>
                      <span className="text-purple-600">UGX {adjustedTotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {discount > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📋 Reason for Adjustment *
                  </label>
                  <textarea
                    value={approvalData.adjustmentReason}
                    onChange={(e) => setApprovalData({...approvalData, adjustmentReason: e.target.value})}
                    placeholder="E.g., Volume discount, damaged goods, price negotiation..."
                    rows="2"
                    required
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-purple-600 mt-1 flex items-center">
                    <span className="mr-1">🔔</span>
                    Supplier will be notified and must accept this change
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitOrderApproval}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold shadow-lg flex items-center space-x-2"
              >
                <FiCheckCircle className="h-5 w-5" />
                <span>Approve Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Component Content - keeping existing JSX */}
      {mainComponentContent}
      
      {/* Approval Modal */}
      <ApprovalModal />
    </>
  );
};

export default SupplierOrderManagement;
