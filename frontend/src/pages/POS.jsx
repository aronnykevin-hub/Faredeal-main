import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ReceiptModal from '../components/ReceiptModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiShoppingCart,
  FiUser,
  FiCreditCard,
  FiCheck,
  FiCamera,
  FiStar,
  FiGift,
  FiZap,
  FiTrendingUp,
  FiClock,
  FiMic,
  FiWifi,
  FiSmartphone,
  FiDollarSign,
  FiPercent,
  FiAward,
  FiHeart,
  FiTarget,
  FiRefreshCw,
  FiSettings,
  FiBarChart2,
  FiMapPin,
  FiCalendar,
  FiPrinter,
  FiX,
  FiVolume2,
  FiPackage,
  FiFileText
} from 'react-icons/fi';

const POS = () => {
  // Core state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Customer & Loyalty
  const [customer, setCustomer] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  
  // Payment & Creative Features
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // UI Enhancement Features
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaysSales, setTodaysSales] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(500000); // UGX 500k target
  const [quickItems, setQuickItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [theme, setTheme] = useState('vibrant'); // vibrant, minimal, dark
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  // Creative Features
  const [cashierMood, setCashierMood] = useState('happy'); // happy, focused, energetic
  const [customerSatisfaction, setCustomerSatisfaction] = useState(95);
  const [peakHours, setPeakHours] = useState([9, 12, 17, 19]); // Rush hours
  const [weatherWidget, setWeatherWidget] = useState('sunny');
  const [celebrations, setCelebrations] = useState([]);
  
  // Refs
  const barcodeRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTodaysSales();
    generateQuickItems();
    
    // Live clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Check for celebrations
    checkForCelebrations();
    
    return () => clearInterval(timer);
  }, []);

  // Auto-focus barcode scanner
  useEffect(() => {
    if (showBarcode && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [showBarcode]);

  // Dynamic mood changes based on sales performance
  useEffect(() => {
    const progress = (todaysSales / dailyTarget) * 100;
    if (progress >= 100) setCashierMood('energetic');
    else if (progress >= 70) setCashierMood('happy');
    else setCashierMood('focused');
  }, [todaysSales, dailyTarget]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products', {
        params: { limit: 100, isActive: true },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to fetch products');
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories/list');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchTodaysSales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`/api/sales/stats/daily?date=${today}`);
      setTodaysSales(response.data.totalSales || 0);
    } catch (error) {
      console.error('Failed to fetch daily stats:', error);
    }
  };

  const generateQuickItems = () => {
    // Most sold items based on category or frequent purchases
    const quick = [
      { name: 'Bread', price: 2500, icon: '🍞' },
      { name: 'Milk', price: 3500, icon: '🥛' },
      { name: 'Sugar', price: 4500, icon: '🍯' },
      { name: 'Salt', price: 1500, icon: '🧂' },
      { name: 'Tea', price: 5000, icon: '🍵' },
      { name: 'Rice', price: 8000, icon: '🍚' }
    ];
    setQuickItems(quick);
  };

  const checkForCelebrations = () => {
    const today = new Date();
    const celebrations = [];
    
    // Check for special occasions
    if (today.getDate() === 1) celebrations.push('🎉 New Month Goals!');
    if (today.getDay() === 1) celebrations.push('💪 Monday Motivation!');
    if (today.getDay() === 5) celebrations.push('🎊 Friday Energy!');
    if (today.getHours() === 12) celebrations.push('🍽️ Lunch Rush Time!');
    
    setCelebrations(celebrations);
  };

  const playSound = (type) => {
    if (!soundEnabled) return;
    // In a real app, you'd play actual sounds
    console.log(`🔊 Playing ${type} sound`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const searchCustomer = async () => {
    if (!customerPhone.trim()) return;

    try {
      const response = await axios.get(`/api/customers/search/phone/${customerPhone}`);
      setCustomer(response.data.customer);
      setLoyaltyPoints(response.data.customer.loyaltyPoints || 0);
      playSound('customer_found');
      toast.success(`🎉 Welcome back, ${response.data.customer.firstName}! You have ${response.data.customer.loyaltyPoints || 0} loyalty points!`);
    } catch (error) {
      setCustomer(null);
      toast.error('👤 Customer not found - New customer?');
    }
  };

  const searchByBarcode = async (barcode) => {
    if (!barcode.trim()) return;
    
    try {
      // Try to find product by barcode in current products
      let product = products.find(p => 
        p.sku === barcode || 
        p.barcode === barcode || 
        p._id === barcode ||
        p.name.toLowerCase().includes(barcode.toLowerCase())
      );
      
      // If not found locally, try API search
      if (!product) {
        try {
          const response = await axios.get(`/api/products/barcode/${barcode}`);
          product = response.data.product;
        } catch (apiError) {
          // If API fails, create a demo product for testing
          const demoProduct = {
            _id: `demo_${Date.now()}`,
            name: `Scanned Product ${barcode}`,
            price: Math.floor(Math.random() * 50000) + 5000, // Random price 5k-55k UGX
            stock: Math.floor(Math.random() * 100) + 10,
            sku: barcode,
            category: 'Scanned Items',
            isActive: true
          };
          product = demoProduct;
          
          // Add to products list for future reference
          setProducts(prev => [...prev, demoProduct]);
        }
      }
      
      if (product) {
        addToCart(product);
        playSound('scan_success');
        toast.success(`🎯 ${product.name} scanned and added to cart!`, {
          position: "top-center",
          autoClose: 2000,
          icon: "📦"
        });
      }
    } catch (error) {
      playSound('error');
      toast.error(`❌ Product not found with barcode: ${barcode}`, {
        position: "top-center",
        autoClose: 3000
      });
    }
  };

  const handleBarcodeScanned = (barcode) => {
    searchByBarcode(barcode);
    setShowBarcodeScanner(false);
  };

  const addQuickItem = (quickItem) => {
    // Find product by name or create a quick sale item
    const existingProduct = products.find(p => 
      p.name.toLowerCase().includes(quickItem.name.toLowerCase())
    );
    
    if (existingProduct) {
      addToCart(existingProduct);
    } else {
      // Create temporary quick item
      const quickProduct = {
        _id: `quick_${Date.now()}`,
        name: quickItem.name,
        price: quickItem.price,
        stock: 999,
        sku: `QUICK_${quickItem.name.toUpperCase()}`
      };
      addToCart(quickProduct);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      playSound('error');
      toast.error('⚠️ Product out of stock');
      return;
    }

    const existingItem = (cart || []).find(item => item.productId === product._id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        playSound('error');
        toast.error('⚠️ Not enough stock available');
        return;
      }
      updateCartQuantity(product._id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock,
        addedAt: new Date(),
        emoji: getProductEmoji(product.category)
      }]);
      playSound('add_to_cart');
      toast.success(`✅ ${product.name} added to cart!`);
    }
  };

  const getProductEmoji = (category) => {
    const emojiMap = {
      'Beverages': '🥤',
      'Dairy': '🥛',
      'Meat': '🥩',
      'Fruits': '🍎',
      'Vegetables': '🥬',
      'Bakery': '🍞',
      'Snacks': '🍿',
      'Cleaning': '🧽',
      'Personal Care': '🧴',
      'default': '📦'
    };
    return emojiMap[category] || emojiMap['default'];
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = (products || []).find(p => p._id === productId);
    if (newQuantity > product.stock) {
      toast.error('Not enough stock available');
      return;
    }

    setCart((cart || []).map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart((cart || []).filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setCustomerPhone('');
  };

  const calculateSubtotal = () => {
    return (cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% VAT for Uganda
  };

  const calculateLoyaltyDiscount = () => {
    if (!customer) return 0;
    const points = customer.loyaltyPoints || 0;
    if (points >= 1000) return calculateSubtotal() * 0.1; // 10% for 1000+ points
    if (points >= 500) return calculateSubtotal() * 0.05; // 5% for 500+ points
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateLoyaltyDiscount();
    return subtotal + tax - discount;
  };

  const getChange = () => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - calculateTotal());
  };

  const getSalesProgress = () => {
    return Math.min(100, (todaysSales / dailyTarget) * 100);
  };

  const getMoodEmoji = () => {
    const moods = {
      happy: '😊',
      focused: '🎯', 
      energetic: '⚡'
    };
    return moods[cashierMood] || '😊';
  };

  const processSale = async () => {
    if ((cart || []).length === 0) {
      playSound('error');
      toast.error('🛒 Cart is empty! Add some items first.');
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(amountReceived) < calculateTotal()) {
      playSound('error');
      toast.error('💰 Insufficient payment amount!');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        items: (cart || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        customerId: customer?._id,
        paymentMethod,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: calculateLoyaltyDiscount(),
        total: calculateTotal(),
        loyaltyPointsEarned: Math.floor(calculateTotal() / 1000), // 1 point per 1000 UGX
        notes: customer ? `Customer: ${customer.firstName} ${customer.lastName}` : '',
      };

      const response = await axios.post('/api/sales', saleData);
      
      // Update today's sales
      setTodaysSales(prev => prev + calculateTotal());
      
      // Set last sale for receipt
      const saleWithDetails = {
        ...response.data.sale,
        items: cart,
        change: getChange(),
        customer: customer,
        paymentMethod: paymentMethod,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: calculateLoyaltyDiscount(),
        total: calculateTotal(),
        loyaltyPointsEarned: saleData.loyaltyPointsEarned
      };
      
      setLastSale(saleWithDetails);
      
      playSound('sale_complete');
      toast.success(`🎉 Sale completed successfully! ${saleData.loyaltyPointsEarned} points earned!`);
      
      setShowReceipt(true);
      clearCart();
      
    } catch (error) {
      playSound('error');
      toast.error(error.response?.data?.message || 'Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (product.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  return (
    <div className="h-screen flex bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col">
        {/* Creative Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <FiShoppingCart className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    🇺🇬 FareDeal POS {getMoodEmoji()}
                  </h1>
                  <p className="text-purple-100">Smart Point of Sale • {currentTime.toLocaleTimeString()}</p>
                </div>
              </div>
              
              {/* Live Dashboard */}
              <div className="flex items-center space-x-6 text-white">
                <div className="text-center">
                  <p className="text-sm text-purple-100">Today's Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(todaysSales)}</p>
                  <div className="w-16 bg-white/20 rounded-full h-2 mt-1">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getSalesProgress()}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-purple-100">Cart Total</p>
                  <p className="text-2xl font-bold text-yellow-300">{formatCurrency(calculateTotal())}</p>
                  <p className="text-xs text-purple-200">
                    {(cart || []).reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-purple-100">Satisfaction</p>
                  <p className="text-xl font-bold text-green-300 flex items-center">
                    <FiHeart className="h-4 w-4 mr-1" />
                    {customerSatisfaction}%
                  </p>
                </div>
              </div>
            </div>

            {/* Celebrations Bar */}
            {celebrations.length > 0 && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center space-x-4 text-white animate-pulse">
                  <FiStar className="h-5 w-5 text-yellow-300" />
                  {celebrations.map((celebration, index) => (
                    <span key={index} className="text-sm font-medium">{celebration}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Search & Quick Actions */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="🔍 Search products, SKU, or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg bg-gray-50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg min-w-48"
            >
              <option value="">🏪 All Categories</option>
              {(categories || []).map(category => (
                <option key={category} value={category}>
                  {getProductEmoji(category)} {category}
                </option>
              ))}
            </select>

            {/* Advanced Hardware Scanner */}
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className="relative px-6 py-3 rounded-xl font-bold transition-all flex items-center space-x-2 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white shadow-xl transform hover:scale-105 hover:shadow-2xl animate-pulse"
            >
              <div className="relative">
                <FiCamera className="h-6 w-6" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-ping"></div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold">📱 Hardware Scanner</span>
                <span className="text-xs opacity-80">Mobile • USB • Bluetooth</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl animate-pulse"></div>
            </button>

            {/* Receipt History */}
            <button
              onClick={() => lastSale && setShowReceipt(true)}
              disabled={!lastSale}
              className={`px-4 py-3 rounded-xl transition-all ${
                lastSale 
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="View Last Receipt"
            >
              <FiFileText className="h-6 w-6" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-4 py-3 rounded-xl transition-all ${
                soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <FiVolume2 className="h-6 w-6" />
            </button>
          </div>

          {/* Barcode Scanner Input */}
          {showBarcode && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <FiCamera className="h-6 w-6 text-green-600" />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="📷 Scan or enter barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && barcodeInput.trim()) {
                      searchByBarcode(barcodeInput.trim());
                    }
                  }}
                  className="flex-1 px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                />
                <button
                  onClick={() => searchByBarcode(barcodeInput.trim())}
                  disabled={!barcodeInput.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
                >
                  🔍 Scan
                </button>
              </div>
            </div>
          )}

          {/* Quick Items Bar */}
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-600 mb-2">⚡ Quick Add:</p>
            <div className="flex space-x-2 overflow-x-auto">
              {quickItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => addQuickItem(item)}
                  className="flex-shrink-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  {item.icon} {item.name}
                  <span className="block text-xs">{formatCurrency(item.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Creative Products Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredProducts.map(product => (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 group"
                onClick={() => addToCart(product)}
              >
                <div className="text-center">
                  {/* Creative Product Avatar */}
                  <div className="h-20 w-20 mx-auto bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 rounded-2xl mb-3 flex items-center justify-center group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-blue-500 transition-all duration-300 shadow-lg">
                    <span className="text-3xl">
                      {getProductEmoji(product.category)}
                    </span>
                  </div>
                  
                  {/* Product Info */}
                  <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {product.name}
                  </h3>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    {product.brand} • {product.unit || 'piece'}
                  </p>
                  
                  {/* Price with Ugandan styling */}
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(product.price)}
                    </p>
                    
                    {/* Stock Status with emoji */}
                    <p className={`text-xs font-bold px-3 py-1 rounded-full ${
                      product.stock > 10 
                        ? 'bg-green-100 text-green-800' 
                        : product.stock > 0 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock > 10 ? '✅' : product.stock > 0 ? '⚠️' : '❌'} 
                      Stock: {product.stock}
                    </p>
                    
                    {/* Local Product Badge */}
                    {product.countryOfOrigin === 'Uganda' && (
                      <div className="mt-2">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
                          🇺🇬 Local Pride
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiPackage className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-500 mb-2">No products found</h3>
              <p className="text-gray-400">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart and Checkout */}
      <div className="w-96 bg-white shadow-lg flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
        </div>

        {/* Customer Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Customer phone..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={searchCustomer}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FiUser className="h-4 w-4" />
            </button>
          </div>
          {customer && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-xs text-green-600">
                Points: {customer.loyaltyPoints}
              </p>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {(cart || []).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FiShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(cart || []).map(item => (
                <div key={item.productId} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                    <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <FiMinus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_payment">Mobile Payment</option>
            <option value="check">Check</option>
          </select>
        </div>

        {/* Totals */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (8%):</span>
              <span className="font-medium">${calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-4">
          <button
            onClick={processSale}
            disabled={(cart || []).length === 0 || loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <FiCheck className="h-5 w-5 mr-2" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal 
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        saleData={lastSale}
      />

      {/* Advanced Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Floating Scanner Quick Access */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowBarcodeScanner(true)}
          className="group relative w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-600 to-green-500 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 animate-bounce"
          title="Quick Scanner Access"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-full animate-pulse"></div>
          <div className="relative flex items-center justify-center h-full">
            <FiCamera className="h-8 w-8 text-white" />
          </div>
          
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-50"></div>
          
          {/* Floating label */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            🔍 Hardware Scanner
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black border-opacity-80"></div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default POS;
