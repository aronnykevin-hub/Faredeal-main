import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiUser, FiTruck, FiArrowRight, FiShield, FiStar,
  FiTrendingUp, FiBarChart, FiPackage, FiShoppingBag, FiBell,
  FiAward, FiTarget, FiZap, FiGift, FiNavigation, FiCheckCircle
} from 'react-icons/fi';
import SupabaseConnectionTest from '../components/SupabaseConnectionTest';

const PortalLanding = () => {
  const navigate = useNavigate();
  const [selectedPortal, setSelectedPortal] = useState(null);

  const portals = [
    {
      id: 'manager',
      title: 'Manager Portal',
      description: 'Strategic business management and team oversight',
      icon: '👩‍💼',
      color: 'from-blue-600 to-purple-600',
      features: [
        'Advanced Analytics & Reporting',
        'Team Performance Management',
        'Strategic Goal Tracking',
        'Business Intelligence Dashboard',
        'Financial Performance Monitoring',
        'Inventory Optimization'
      ],
      route: '/manager-login',
      stats: {
        users: '12',
        revenue: '$125K',
        efficiency: '95%'
      }
    },
    {
      id: 'cashier',
      title: 'Cashier Portal',
      description: 'Personal workspace for cashiers and front-end operations',
      icon: '�',
      color: 'from-green-600 to-blue-600',
      features: [
        'Real-time Transaction Tracking',
        'Performance Metrics & Goals',
        'Customer Service Analytics',
        'Station Supply Management',
        'Achievement System',
        'Shift Management Tools'
      ],
      route: '/cashier-login',
      stats: {
        tasks: '8',
        sales: '$2.4K',
        rating: '4.8★'
      }
    },
    {
      id: 'employee',
      title: 'Employee Portal',
      description: 'Personal workspace for general employees',
      icon: '👥',
      color: 'from-indigo-600 to-blue-600',
      features: [
        'Personal Dashboard',
        'Task Management',
        'Performance Tracking',
        'Schedule Management',
        'Training Resources',
        'Team Communication'
      ],
      route: '/employee-login',
      stats: {
        tasks: '12',
        hours: '160',
        rating: '4.5★'
      }
    },
    {
      id: 'supplier',
      title: 'Supplier Portal',
      description: 'Partnership management and order processing',
      icon: '🏢',
      color: 'from-purple-600 to-blue-600',
      features: [
        'Order Management System',
        'Product Catalog Management',
        'Performance Analytics',
        'Payment Tracking',
        'Inventory Monitoring',
        'Partnership Goals'
      ],
      route: '/supplier-login',
      stats: {
        orders: '156',
        revenue: '$125K',
        rating: '4.8★'
      }
    }
  ];

  const handlePortalSelect = (portal) => {
    setSelectedPortal(portal);
    setTimeout(() => {
      navigate(portal.route);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateX(50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          .animate-fadeInUp {
            animation: fadeInUp 0.8s ease-out;
          }
          .animate-slideInFromLeft {
            animation: slideInFromLeft 0.8s ease-out;
          }
          .animate-slideInFromRight {
            animation: slideInFromRight 0.8s ease-out;
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          .animate-pulse-custom {
            animation: pulse 2s infinite;
          }
        `
      }} />

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">🏢</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">FareDeal Professional Portals</h1>
                <p className="text-gray-600">Choose your role to access your personalized workspace</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back!</p>
                <p className="text-xs text-gray-500">Select your portal below</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="text-center mb-12 animate-fadeInUp">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Professional Portal Access
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Access your personalized dashboard designed specifically for your role. 
            Each portal provides the tools and insights you need to excel in your position.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {portals.map((portal, index) => (
            <div
              key={portal.id}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer ${
                selectedPortal?.id === portal.id ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
              } animate-fadeInUp`}
              style={{ animationDelay: `${index * 0.2}s` }}
              onClick={() => handlePortalSelect(portal)}
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${portal.color} rounded-t-2xl p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl animate-float">{portal.icon}</div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{portal.stats.users || portal.stats.tasks || portal.stats.orders}</div>
                      <div className="text-sm opacity-90">
                        {portal.id === 'manager' ? 'Team Members' : 
                         portal.id === 'employee' ? 'Active Tasks' : 'Total Orders'}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{portal.title}</h3>
                  <p className="text-white text-opacity-90">{portal.description}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{portal.stats.revenue}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{portal.stats.efficiency || portal.stats.rating}</div>
                    <div className="text-xs text-gray-500">
                      {portal.id === 'employee' ? 'Rating' : 'Efficiency'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">98%</div>
                    <div className="text-xs text-gray-500">Uptime</div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                  {portal.features.slice(0, 4).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <FiCheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`w-full bg-gradient-to-r ${portal.color} text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2`}
                >
                  <span>Access Portal</span>
                  <FiArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeInUp">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Choose Our Professional Portals?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FiShield, title: 'Secure Access', description: 'Enterprise-grade security for all portals' },
              { icon: FiZap, title: 'Real-time Data', description: 'Live updates and instant notifications' },
              { icon: FiTarget, title: 'Role-specific', description: 'Tailored features for each user type' },
              { icon: FiAward, title: 'Performance Tracking', description: 'Comprehensive analytics and insights' }
            ].map((feature, index) => (
              <div key={index} className="text-center p-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase Connection Test */}
        <div className="mb-8">
          <SupabaseConnectionTest />
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12 animate-fadeInUp">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Select your portal above to access your personalized dashboard. 
              Each portal is designed to help you work more efficiently and achieve your goals.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300">
                Learn More
              </button>
              <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                Contact Support
              </button>
            </div>
            {/* Hidden admin hint for development */}
            <div className="mt-4 text-xs text-blue-200 opacity-50">
              Tip for developers: Add #admin to URL for admin access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLanding;
