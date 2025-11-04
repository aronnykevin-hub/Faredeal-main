/**
 * Purchase Order Manager Component
 * 
 * Features:
 * - Create purchase orders with product details
 * - Auto-approval for trusted suppliers
 * - Automatic product creation on approval
 * - Track order status and delivery
 * - Update inventory on delivery
 */

import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiCheck, FiX, FiTruck, FiPackage, FiClock,
  FiCheckCircle, FiAlertCircle, FiShoppingCart, FiEye,
  FiEdit, FiTrash2, FiRefreshCw, FiDownload, FiZap
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import purchaseOrderService from '../services/purchaseOrderService';
import inventoryService from '../services/inventorySupabaseService';

const PurchaseOrderManager = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  
  // Create order form state
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orderForm, setOrderForm] = useState({
    supplier_id: '',
    items: [],
    notes: '',
    expected_delivery_date: ''
  });
  
  // New item form
  const [newItem, setNewItem] = useState({
    product_name: '',
    sku: '',
    category_id: '',
    brand: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    cost_price: 0,
    selling_price: 0,
    create_as_new_product: true
  });

  useEffect(() => {
    if (isOpen) {
      loadOrders();
      loadFormData();
    }
  }, [isOpen, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = filter === 'all' ? {} : 
                     filter === 'pending' ? { approval_status: 'pending' } :
                     filter === 'approved' ? { approval_status: 'approved' } :
                     { status: filter };
      
      const data = await purchaseOrderService.getPurchaseOrders(filters);
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError(error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [suppliersData, categoriesData] = await Promise.all([
        inventoryService.getSuppliers(),
        inventoryService.getCategories()
      ]);
      setSuppliers(suppliersData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading form data:', error);
      setSuppliers([]);
      setCategories([]);
      toast.error('Failed to load suppliers and categories');
    }
  };

  const addItemToOrder = () => {
    if (!newItem.product_name || !newItem.sku || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    const item = {
      ...newItem,
      product_data: newItem.create_as_new_product ? {
        sku: newItem.sku,
        name: newItem.product_name,
        description: newItem.description,
        category_id: newItem.category_id,
        supplier_id: orderForm.supplier_id,
        brand: newItem.brand,
        cost_price: parseFloat(newItem.cost_price) || parseFloat(newItem.unit_price),
        selling_price: parseFloat(newItem.selling_price) || parseFloat(newItem.unit_price) * 1.3,
        tax_rate: 18
      } : null
    };

    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset new item form
    setNewItem({
      product_name: '',
      sku: '',
      category_id: '',
      brand: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      cost_price: 0,
      selling_price: 0,
      create_as_new_product: true
    });

    toast.success('Item added to order');
  };

  const removeItemFromOrder = (index) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.info('Item removed');
  };

  const createOrder = async () => {
    if (!orderForm.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (orderForm.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      await purchaseOrderService.createPurchaseOrder(orderForm);
      
      // Reset form
      setOrderForm({
        supplier_id: '',
        items: [],
        notes: '',
        expected_delivery_date: ''
      });
      
      setShowCreateModal(false);
      loadOrders();
    } catch (error) {
      // Error already handled in service
    }
  };

  const approveOrder = async (orderId) => {
    try {
      await purchaseOrderService.approvePurchaseOrder(orderId, 'manager');
      loadOrders();
      setShowApprovalModal(false);
    } catch (error) {
      // Error already handled in service
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (order) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: FiClock, text: 'Pending Approval' },
      approved: { color: 'bg-blue-100 text-blue-800', icon: FiCheck, text: 'Approved' },
      processing: { color: 'bg-purple-100 text-purple-800', icon: FiPackage, text: 'Processing' },
      shipped: { color: 'bg-indigo-100 text-indigo-800', icon: FiTruck, text: 'Shipped' },
      completed: { color: 'bg-green-100 text-green-800', icon: FiCheckCircle, text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: FiX, text: 'Cancelled' }
    };

    const config = statusConfig[order.status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Purchase Order Management</h2>
              <p className="text-purple-100 text-sm">Auto-approval & product creation system</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex space-x-2">
            {['all', 'pending', 'approved', 'processing', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium flex items-center space-x-2 shadow-lg"
            >
              <FiPlus className="h-5 w-5" />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <FiRefreshCw className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading purchase orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <FiShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Purchase Orders</h3>
              <p className="text-gray-600 mb-4">Create your first purchase order to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg"
              >
                <FiPlus className="inline h-5 w-5 mr-2" />
                Create Purchase Order
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        PO #{order.id.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.supplier?.company_name} • {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(order)}
                      {order.approval_status === 'approved' && order.approved_by === 'auto_approval_system' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <FiZap className="h-3 w-3 mr-1" />
                          Auto-approved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Items</p>
                      <p className="text-xl font-bold text-gray-900">{order.purchase_order_items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expected Delivery</p>
                      <p className="text-sm font-medium text-gray-900">
                        {order.expected_delivery_date 
                          ? new Date(order.expected_delivery_date).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {order.approval_status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowApprovalModal(true);
                        }}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <FiCheck className="h-4 w-4" />
                        <span>Approve Order</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <FiEye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Order Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                <h3 className="text-xl font-bold">Create New Purchase Order</h3>
                <p className="text-green-100 text-sm">Add items to automatically create products on approval</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={orderForm.supplier_id}
                    onChange={(e) => setOrderForm({...orderForm, supplier_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.company_name} {sup.rating && `(Rating: ${sup.rating}⭐)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Item Section */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Add Items to Order</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                      <input
                        type="text"
                        value={newItem.product_name}
                        onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., iPhone 15 Pro"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                      <input
                        type="text"
                        value={newItem.sku}
                        onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., IPH-001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={newItem.category_id}
                        onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                      <input
                        type="text"
                        value={newItem.brand}
                        onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Apple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (UGX) *</label>
                      <input
                        type="number"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        step="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (UGX)</label>
                      <input
                        type="number"
                        value={newItem.selling_price}
                        onChange={(e) => setNewItem({...newItem, selling_price: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        step="100"
                        placeholder="Auto-calculated if empty"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newItem.create_as_new_product}
                          onChange={(e) => setNewItem({...newItem, create_as_new_product: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">
                          Create as new product automatically when order is approved
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={addItemToOrder}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <FiPlus className="inline h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>

                {/* Items List */}
                {orderForm.items.length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Order Items ({orderForm.items.length})</h4>
                    <div className="space-y-2">
                      {orderForm.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-sm text-gray-600">
                              SKU: {item.sku} • Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="font-bold text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</p>
                            <button
                              onClick={() => removeItemFromOrder(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-700">
                          {formatCurrency(orderForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes & Delivery Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                    <input
                      type="date"
                      value={orderForm.expected_delivery_date}
                      onChange={(e) => setOrderForm({...orderForm, expected_delivery_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createOrder}
                  disabled={!orderForm.supplier_id || orderForm.items.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Purchase Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedOrder && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Purchase Order?</h3>
              <p className="text-gray-600 mb-4">
                This will approve the order and automatically create products that don't exist yet.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Order Total:</strong> {formatCurrency(selectedOrder.total_amount)}<br/>
                  <strong>Supplier:</strong> {selectedOrder.supplier?.company_name}<br/>
                  <strong>Items:</strong> {selectedOrder.purchase_order_items?.length}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveOrder(selectedOrder.id)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Approve Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderManager;
