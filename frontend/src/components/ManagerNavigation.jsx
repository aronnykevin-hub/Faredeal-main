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
        {/* Mobile Navigation - Horizontal Scroll */}
        <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-3">
            {/* Horizontal Scrolling Cards */}
            <div className="flex space-x-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.label)}
                  className={`flex-shrink-0 snap-start flex flex-col items-center justify-center p-4 rounded-2xl w-[110px] transition-all duration-300 ${
                    activeTab === tab.id
                      ? `bg-gradient-to-br ${tab.color} text-white shadow-xl scale-105`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 shadow-sm border-2 border-gray-200'
                  }`}
                >
                  {/* Icon/Emoji */}
                  <div className={`text-3xl mb-2 ${activeTab === tab.id ? 'animate-bounce' : ''}`}>
                    {tab.ugandaEmoji}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-xs font-bold text-center leading-tight ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {tab.label}
                  </span>
                  
                  {/* Description */}
                  <span className={`text-[10px] text-center leading-tight mt-1 ${
                    activeTab === tab.id ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </span>
                  
                  {/* Active Indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute -bottom-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Page Indicator Dots */}
            <div className="flex justify-center mt-2 space-x-1">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-orange-400 to-orange-600 w-6' 
                      : 'bg-gray-300 w-1.5'
                  }`}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Quick Stats Bar - Collapsible */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => {
                setActiveTab('analytics');
                toast.info('📊 Revenue analytics');
              }}
              className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-center">
                <div className="text-lg">💰</div>
                <div className="text-[10px] text-gray-500">Today</div>
                <div className="text-xs font-bold text-green-600">UGX 2.4M</div>
              </div>
            </button>
            
            <button 
              onClick={() => {
                setActiveTab('orders');
                toast.info('📦 Orders overview');
              }}
              className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-center">
                <div className="text-lg">📦</div>
                <div className="text-[10px] text-gray-500">Orders</div>
                <div className="text-xs font-bold text-blue-600">28</div>
              </div>
            </button>
            
            <button 
              onClick={() => {
                setActiveTab('team');
                toast.info('👥 Team dashboard');
              }}
              className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-center">
                <div className="text-lg">👥</div>
                <div className="text-[10px] text-gray-500">Online</div>
                <div className="text-xs font-bold text-purple-600">15</div>
              </div>
            </button>
          </div>
        </div>
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

// Add custom styles for scrollbar hiding
const style = document.createElement('style');
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('scrollbar-hide-style')) {
  style.id = 'scrollbar-hide-style';
  document.head.appendChild(style);
}

export default ManagerNavigation;
