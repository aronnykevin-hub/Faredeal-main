import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

/**
 * Protected Route Component for Admin Pages
 * Checks if user is authenticated before allowing access
 */
const AdminProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isURLAllowed, setIsURLAllowed] = useState(false);

  useEffect(() => {
    checkURLAccess();
    checkAuth();
  }, []);

  const checkURLAccess = () => {
    const currentURL = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    console.log('🔍 Admin Protected Route - URL Check:', {
      currentURL,
      hostname,
      isLocalhost: hostname.includes('localhost') || hostname === '127.0.0.1'
    });
    
    const allowedURLs = [
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'https://faredeal-main.vercel.app',
      'http://10.0.2.139',  // Android emulator
      'http://192.168'      // Local network IPs
    ];
    
    // Allow if:
    // 1. localhost or 127.0.0.1 (development)
    // 2. Vercel deployment
    // 3. Local network (192.168.x.x)
    // 4. Matches any allowed URL
    const isAllowed = 
      hostname.includes('localhost') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168') ||
      hostname.startsWith('10.') ||
      currentURL.includes('vercel.app') ||
      allowedURLs.some(url => currentURL.includes(url.replace(/https?:\/\//, '')));
    
    setIsURLAllowed(isAllowed);
    
    if (!isAllowed) {
      console.warn('❌ Admin access blocked - Unauthorized URL:', window.location.href);
    } else {
      console.log('✅ Admin protected route allowed from:', hostname);
    }
  };

  const checkAuth = async () => {
    try {
      // Check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } else if (session && session.user) {
        // User is authenticated
        setIsAuthenticated(true);
        // Set admin key
        localStorage.setItem('adminKey', 'true');
      } else {
        // No valid session
        setIsAuthenticated(false);
        localStorage.removeItem('adminKey');
      }
    } catch (error) {
      console.error('Unexpected auth error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Block access if URL is not allowed
  if (!isURLAllowed && !loading) {
    const currentURL = window.location.href;
    const hostname = window.location.hostname;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-xl">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
          <p className="text-gray-700 mb-4">
            Your current URL is:
          </p>
          <div className="bg-orange-50 p-3 rounded-lg text-left mb-6 border border-orange-200">
            <p className="font-mono text-xs mb-2 text-gray-800 break-all">{currentURL}</p>
            <p className="font-mono text-xs text-orange-600">Hostname: {hostname}</p>
          </div>
          <p className="text-gray-700 mb-6">
            For development, admin access is allowed from:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left mb-6 text-sm space-y-2">
            <p className="font-mono">✅ http://localhost:*</p>
            <p className="font-mono">✅ http://127.0.0.1:*</p>
            <p className="font-mono">✅ 192.168.*.* (local network)</p>
            <p className="font-mono">✅ https://faredeal-main.vercel.app</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default AdminProtectedRoute;
