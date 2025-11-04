import React from 'react';
import { 
  FiBarChart, FiPieChart, FiUsers, FiCheckCircle, FiTruck, 
  FiPackage, FiSettings, FiBell, FiRefreshCw, FiDownload 
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const ManagerNavigation = ({ activeTab, setActiveTab, isMobile }) => {
  const tabs = [
    { 
      id: 'overview', 
      label: 'Dashboard', 
      icon: FiBarChart,
      description: 'Business overview',
      color: 'from-blue-500 to-blue-600',
      ugandaEmoji: '📊'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: FiPieChart,
      description: 'Data insights',
      color: 'from-purple-500 to-purple-600',
      ugandaEmoji: '📈'
    },
    { 
      id: 'team', 
      label: 'Team', 
      icon: FiUsers,
      description: 'Staff management',
      color: 'from-green-500 to-green-600',
      ugandaEmoji: '👥'
    },
    { 
      id: 'suppliers', 
      label: 'Suppliers', 
      icon: FiCheckCircle,
      description: 'Verify partners',
      color: 'from-yellow-500 to-yellow-600',
      ugandaEmoji: '🤝'
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: FiTruck,
      description: 'Order management',
      color: 'from-orange-500 to-orange-600',
      ugandaEmoji: '📦'
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: FiPackage,
      description: 'Stock control',
      color: 'from-indigo-500 to-indigo-600',
      ugandaEmoji: '📋'
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FiSettings,
      description: 'Access control',
      color: 'from-pink-500 to-pink-600',
      ugandaEmoji: '📄'
    },
    { 
      id: 'alerts', 
      label: 'Alerts', 
      icon: FiBell,
      description: 'Notifications',
      color: 'from-red-500 to-red-600',
      ugandaEmoji: '🔔'
    }
  ];

  const handleTabClick = (tabId, tabLabel) => {
    setActiveTab(tabId);
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50);
    }
    toast.success(`📱 Switched to ${tabLabel} - Webale! (Thank you!)`);
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Navigation */}
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="px-3 py-4">
            {/* Main Navigation Tabs */}
            <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-4">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.label)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl min-w-[100px] transition-all duration-500 transform ${
                    activeTab === tab.id
                      ? `bg-gradient-to-br ${tab.color} text-white shadow-2xl scale-110 -translate-y-1`
                      : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg hover:scale-105 border border-gray-200'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`relative ${activeTab === tab.id ? 'animate-bounce' : ''}`}>
                    <div className="text-2xl mb-2">{tab.ugandaEmoji}</div>
                    {activeTab === tab.id && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                    )}
                  </div>
                  
                  <span className={`text-xs font-bold text-center leading-tight ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {tab.label}
                  </span>
                  
                  <span className={`text-xs text-center leading-tight ${
                    activeTab === tab.id ? 'text-yellow-100' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </span>
                  
                  {activeTab === tab.id && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1 animate-pulse shadow-lg"></div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Navigation Indicator */}
            <div className="flex justify-center mt-3">
              <div className="flex space-x-1">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 w-6' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Bar for Mobile */}
          <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 px-3 py-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => {
                  setActiveTab('analytics');
                  toast.info('📊 Viewing today\'s revenue - Ensimbi (Money) analytics');
                }}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">💰</span>
                  <div className="text-left">
                    <div className="text-xs text-gray-600 font-medium">Leo (Today)</div>
                    <div className="text-sm font-bold text-green-600">UGX 2.4M</div>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('orders');
                  toast.info('📦 Viewing orders - Ebyaguze (Purchases)');
                }}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">📦</span>
                  <div className="text-left">
                    <div className="text-xs text-gray-600 font-medium">Orders</div>
                    <div className="text-sm font-bold text-blue-600">28</div>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('team');
                  toast.info('👥 Viewing team - Abantu (People) dashboard');
                }}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">👥</span>
                  <div className="text-left">
                    <div className="text-xs text-gray-600 font-medium">Online</div>
                    <div className="text-sm font-bold text-purple-600">15</div>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Quick Action Bar */}
            <div className="mt-4 flex justify-center space-x-2">
              <button 
                onClick={() => toast.success('🔄 Data refreshed - Ebiddeko!')}
                className="flex items-center space-x-1 bg-green-500 text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-green-600 transition-colors"
              >
                <FiRefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
              
              <button 
                onClick={() => toast.info('📧 Alerts opened - Obubaka!')}
                className="flex items-center space-x-1 bg-yellow-500 text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-yellow-600 transition-colors"
              >
                <FiBell className="h-3 w-3" />
                <span>Alerts</span>
              </button>
              
              <button 
                onClick={() => toast.success('📊 Report generated - Lipoota!')}
                className="flex items-center space-x-1 bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                <FiDownload className="h-3 w-3" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // Desktop Navigation
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <nav className="flex px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 lg:space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.label)}
                className={`flex items-center space-x-2 py-4 px-4 lg:px-6 border-b-3 font-medium text-sm lg:text-base transition-all duration-300 whitespace-nowrap group relative ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.ugandaEmoji}</span>
                  <tab.icon className={`h-5 w-5 transition-transform duration-300 ${
                    activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                </div>
                
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
                
                {activeTab === tab.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default ManagerNavigation;
