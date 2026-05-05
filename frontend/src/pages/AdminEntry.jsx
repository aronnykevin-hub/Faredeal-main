import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

/**
 * Admin Entry Point
 * Checks if user is authenticated and routes accordingly
 */
const AdminEntry = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // DISABLED: Auto-redirect has been removed for security
      // Always require manual login - no auto-redirect to portal
      localStorage.removeItem('adminKey');
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Unexpected error:', error);
      navigate('/admin-login', { replace: true });
    }
  };

  // Show loading while checking
  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
        <p className="text-white text-xl font-semibold">Loading Admin Portal...</p>
      </div>
    </div>
  );
};

export default AdminEntry;
