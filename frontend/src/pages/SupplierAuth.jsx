import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { FiClock, FiArrowLeft } from 'react-icons/fi';
import './SupplierAuth.css';

/**
 * GOOGLE-ONLY AUTHENTICATION SYSTEM
 * Simple flow:
 * 1. User clicks "Sign in with Google"
 * 2. After OAuth, a placeholder supplier row is created if needed
 * 3. If supplier role is assigned and active, redirect to the portal
 * 4. Otherwise show a waiting screen until admin assigns the role
 */

const SupplierAuth = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [waiting, setWaiting] = useState(false);

  // =============================================
  // Check authentication status ONLY after OAuth redirect
  // =============================================
  useEffect(() => {
    const initAuth = async () => {
      // Check if we're returning from OAuth
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasOAuthCallback = hashParams.has('access_token') || window.location.search.includes('code=');
      
      if (hasOAuthCallback) {
        console.log('🔄 OAuth callback detected');
        // Wait for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // ALWAYS call checkAuthStatus to process authentication
      checkAuthStatus();
    };
    
    initAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking supplier authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        setChecking(false);
        return;
      }

      console.log('✅ User authenticated:', user.email);

      let { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!userData) {
        console.log('📝 Creating/linking supplier user record...');
        
        // Use upsert to handle duplicates gracefully
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            auth_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'user',
            is_active: false,
            profile_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select('*')
          .single();

        if (createError) {
          console.error('❌ Error creating/linking user:', createError);
          // Try to fetch the record again
          const { data: existingUser, error: existingError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (existingError) {
            throw existingError;
          }

          userData = existingUser;
        } else {
          userData = newUser;
        }
      }

      if (userData?.role === 'supplier' && userData?.is_active) {
        console.log('✅ Supplier role assigned - Redirecting to Supplier Portal');
        notificationService.show('✅ Welcome back!', 'success');
        navigate('/supplier-portal');
      } else {
        console.log('⏳ Supplier role not assigned yet - Showing waiting screen');
        setWaiting(true);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      notificationService.show(error.message || 'Authentication error', 'error');
    } finally {
      setChecking(false);
    }
  };

  // =============================================
  // Handle Google Sign-In
  // =============================================
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/supplier-auth`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        throw error;
      }

      notificationService.show('🔄 Redirecting to Google...', 'info');
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      notificationService.show(error.message || 'Failed to sign in with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // RENDER: Loading State
  // =============================================
  if (checking) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1 className="auth-title">Loading...</h1>
          <p className="auth-subtitle">Please wait</p>
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 flex items-center justify-center p-4 relative">
        {/* Back button */}
        <button
          onClick={() => navigate('/portal-selection')}
          className="absolute top-6 left-6 flex items-center space-x-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-all duration-300 group"
          title="Go back to portal selection"
        >
          <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiClock className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Wait for Your Role</h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Your Google account has been received. An admin will assign your supplier role and activate your account. Return after assignment to access the supplier dashboard.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            <FiClock className="w-4 h-4" />
            Awaiting role assignment
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/portal-selection')}
        className="absolute top-6 left-6 flex items-center space-x-2 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-300 group"
        title="Go back to portal selection"
        style={{ zIndex: 10 }}
      >
        <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="auth-box">
        <h1 className="auth-title">Supplier Portal</h1>
        <p className="auth-subtitle">Sign in with your Google account to request supplier access.</p>

        <button
          onClick={handleGoogleSignIn}
          className="google-signin-button"
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="auth-footer">
          <p>An admin will assign your supplier role after sign-in. Return once your account is active.</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierAuth;
