import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import './SupplierAuth.css';

/**
 * GOOGLE-ONLY AUTHENTICATION SYSTEM
 * Simple flow:
 * 1. User clicks "Sign in with Google"
 * 2. After OAuth, create_google_user() is called
 * 3. Show profile completion form
 * 4. Call complete_google_profile()
 * 5. Redirect to portal (limited access until admin approves)
 */

const SupplierAuth = () => {
  const navigate = useNavigate();
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // Add checking state
  const [showProfileForm, setShowProfileForm] = useState(false);
  
  // Profile Form Fields
  const [profileData, setProfileData] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    address: '',
    businessLicense: '',
    category: ''
  });

  // =============================================
  // Check authentication status ONLY after OAuth redirect
  // =============================================
  useEffect(() => {
    const initAuth = async () => {
      // Check if we're returning from OAuth
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasOAuthCallback = hashParams.has('access_token') || window.location.search.includes('code=');
      
      if (hasOAuthCallback) {
        console.log('🔄 OAuth callback detected, waiting for session...');
        // Wait for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      checkAuthStatus();
    };
    
    initAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking supplier authentication...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        
        // Check if user exists in database
        let { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .eq('role', 'supplier')
          .single();

        console.log('👤 User data from database:', userData);

        // If user doesn't exist (OAuth first-time sign-in), create them
        if (fetchError || !userData) {
          console.log('📝 Creating new supplier user in database...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              auth_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'supplier',
              is_active: false,
              profile_completed: false,
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating user:', createError);
            throw createError;
          }

          console.log('✅ User created:', newUser);
          userData = newUser;
          notificationService.show('Welcome! Please complete your supplier profile.', 'info');
        }

        // Priority flow: approved → profile incomplete → pending
        console.log('� Checking user status - Active:', userData.is_active, 'Profile Complete:', userData.profile_completed);
        
        if (userData.is_active && userData.profile_completed) {
          // Approved and profile complete → Go to Supplier Portal
          console.log('✅ User approved and profile complete - Redirecting to Supplier Portal');
          notificationService.show('✅ Welcome back!', 'success');
          navigate('/supplier-portal');
        } else if (!userData.profile_completed) {
          // Profile not completed → Show profile form
          console.log('📋 Profile not complete - Showing profile form');
          setShowProfileForm(true);
          setProfileData(prev => ({
            ...prev,
            fullName: userData.full_name || '',
            phone: userData.phone || '',
            companyName: userData.company_name || '',
            address: userData.address || ''
          }));
        } else {
          // Profile complete but not active → Pending approval
          console.log('⏳ Profile complete but not approved - Pending approval');
          notificationService.show(
            '⏳ Your supplier application is pending admin approval.',
            'warning',
            5000
          );
          await supabase.auth.signOut();
        }
      } else {
        console.log('❌ No authenticated user found');
      }
      setChecking(false);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setChecking(false);
    }
  };

  // =============================================
  // Handle Google Sign-In
  // =============================================
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/supplier-auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google sign-in error:', error);
        notificationService.error('Failed to sign in with Google');
      }
      // OAuth redirect will happen automatically
      
    } catch (error) {
      console.error('Error in handleGoogleSignIn:', error);
      notificationService.error('An error occurred during sign-in');
      setLoading(false);
    }
  };

  // =============================================
  // Handle Profile Completion
  // =============================================
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!profileData.companyName || !profileData.phone || !profileData.address || 
        !profileData.businessLicense || !profileData.category) {
      notificationService.show('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notificationService.show('Session expired. Please sign in again.', 'error');
        setShowProfileForm(false);
        return;
      }

      console.log('📝 Completing supplier profile...');

      // Update user profile directly
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          phone: profileData.phone,
          address: profileData.address,
          business_license: profileData.businessLicense,
          category: profileData.category,
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', user.id)
        .eq('role', 'supplier')
        .select();
      
      if (updateError) {
        console.error('❌ Profile update error:', updateError);
        notificationService.show('Failed to save profile. Please try again.', 'error');
        setLoading(false);
        return;
      }

      console.log('✅ Profile completed successfully:', updateResult);
      notificationService.show('🎉 Profile completed! Waiting for admin approval...', 'success');
      
      // Sign out and show pending message
      await supabase.auth.signOut();
      setShowProfileForm(false);
      notificationService.show('⏳ Your supplier application is pending admin approval.', 'warning', 5000);

    } catch (error) {
      console.error('Error completing profile:', error);
      notificationService.error('An error occurred');
      setLoading(false);
    }
  };

  // =============================================
  // RENDER: Profile Completion Form
  // =============================================
  if (showProfileForm) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>👋</div>
            <h1 className="auth-title">Welcome to FareDeal!</h1>
            <p className="auth-subtitle">Let's set up your supplier profile</p>
            <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
              Complete your profile to start managing orders and payments
            </p>
          </div>

          <form onSubmit={handleCompleteProfile} className="auth-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                value={profileData.companyName}
                onChange={(e) => setProfileData({...profileData, companyName: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Business Address *</label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Business License Number *</label>
              <input
                type="text"
                value={profileData.businessLicense}
                onChange={(e) => setProfileData({...profileData, businessLicense: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Business Category *</label>
              <select
                value={profileData.category}
                onChange={(e) => setProfileData({...profileData, category: e.target.value})}
                required
              >
                <option value="">Select Category</option>
                <option value="Food & Beverages">Food & Beverages</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Hardware">Hardware</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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

  // =============================================
  // RENDER: Google Sign-In Button
  // =============================================
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">Supplier Portal</h1>
        <p className="auth-subtitle">Sign in with your Google account</p>

        <button 
          onClick={handleGoogleSignIn} 
          className="google-signin-button"
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="auth-footer">
          <p>After signing in, you'll complete your business profile and wait for admin approval.</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierAuth;
