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
    const checkAfterOAuth = async () => {
      // Check if returning from OAuth
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasOAuthCallback = hashParams.has('access_token') || window.location.search.includes('code=');
      
      if (hasOAuthCallback) {
        // Wait a moment for Supabase to process the session
        await new Promise(resolve => setTimeout(resolve, 500));
        checkAuthStatus();
      } else {
        // First visit - just show the login page
        setChecking(false);
      }
    };
    
    checkAfterOAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not authenticated, show login page
        setChecking(false);
        return;
      }

      // User is authenticated, check their profile status
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        // If user doesn't exist, create them
        if (error.code === 'PGRST116') {
          console.log('📝 User not found in database, creating...');
          const created = await createGoogleUser(session.user);
          if (created) {
            // Wait a moment for the database to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            setProfileData(prev => ({
              ...prev,
              fullName: session.user.user_metadata.full_name || session.user.email.split('@')[0],
            }));
            setShowProfileForm(true);
          }
          setChecking(false);
        } else {
          setChecking(false);
        }
        return;
      }

      if (!user) {
        // Create user if not found
        const created = await createGoogleUser(session.user);
        if (created) {
          setProfileData(prev => ({
            ...prev,
            fullName: session.user.user_metadata.full_name || session.user.email.split('@')[0],
          }));
          setShowProfileForm(true);
        }
        setChecking(false);
        return;
      }

      if (!user.profile_completed) {
        // Show profile completion form
        setProfileData(prev => ({
          ...prev,
          fullName: user.full_name || session.user.user_metadata.full_name || '',
        }));
        setShowProfileForm(true);
        setChecking(false);
        return;
      }

      // Profile is completed, go to portal
      navigate('/supplier-portal', { replace: true });

    } catch (error) {
      console.error('Auth check error:', error);
      setChecking(false);
    }
  };

  // =============================================
  // Create user record after Google sign-in
  // =============================================
  const createGoogleUser = async (authUser) => {
    try {
      console.log('🔧 Creating Google user with auth_id:', authUser.id);
      
      const { data, error } = await supabase.rpc('create_google_user', {
        p_auth_id: authUser.id,
        p_email: authUser.email,
        p_full_name: authUser.user_metadata.full_name || authUser.email.split('@')[0],
        p_avatar_url: authUser.user_metadata.avatar_url || null
      });

      console.log('📥 create_google_user response:', { data, error });

      if (error) {
        console.error('❌ Error creating Google user:', error);
        notificationService.error('Failed to create user account: ' + error.message);
        return false;
      }

      if (data && !data.success) {
        console.error('❌ User creation failed:', data.error);
        notificationService.error(data.error || 'Failed to create user account');
        return false;
      }

      console.log('✅ User created successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error in createGoogleUser:', error);
      notificationService.error('An error occurred while creating user');
      return false;
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
      notificationService.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        notificationService.error('Session expired. Please sign in again.');
        setShowProfileForm(false);
        return;
      }

      // Complete profile using RPC function
      console.log('📝 Completing profile with data:', {
        p_auth_id: session.user.id,
        p_company_name: profileData.companyName,
        p_phone: profileData.phone,
        p_address: profileData.address,
        p_business_license: profileData.businessLicense,
        p_category: profileData.category,
        p_full_name: profileData.fullName || session.user.user_metadata.full_name
      });

      const { data, error } = await supabase.rpc('complete_google_profile', {
        p_auth_id: session.user.id,
        p_company_name: profileData.companyName,
        p_phone: profileData.phone,
        p_address: profileData.address,
        p_business_license: profileData.businessLicense,
        p_category: profileData.category,
        p_full_name: profileData.fullName || session.user.user_metadata.full_name
      });

      console.log('📥 RPC response:', { data, error });

      if (error) {
        console.error('❌ Profile completion error:', error);
        notificationService.error('Failed to complete profile: ' + error.message);
        setLoading(false);
        return;
      }

      if (data && !data.success) {
        console.error('❌ Profile completion failed:', data.error);
        
        // If user not found, try to create them first
        if (data.error && data.error.includes('user not found')) {
          console.log('🔧 User not found, creating user first...');
          notificationService.info('Setting up your account...');
          
          const created = await createGoogleUser(session.user);
          if (!created) {
            notificationService.error('Failed to create user account');
            setLoading(false);
            return;
          }
          
          // Wait for database to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Try completing profile again
          console.log('🔄 Retrying profile completion...');
          const { data: retryData, error: retryError } = await supabase.rpc('complete_google_profile', {
            p_auth_id: session.user.id,
            p_company_name: profileData.companyName,
            p_phone: profileData.phone,
            p_address: profileData.address,
            p_business_license: profileData.businessLicense,
            p_category: profileData.category,
            p_full_name: profileData.fullName || session.user.user_metadata.full_name
          });
          
          if (retryError || (retryData && !retryData.success)) {
            console.error('❌ Retry failed:', retryError || retryData.error);
            
            // Last resort: Direct database update
            console.log('🔧 Last resort: Updating database directly...');
            const { data: updateResult, error: updateError } = await supabase
              .from('users')
              .update({
                company_name: profileData.companyName,
                phone: profileData.phone,
                address: profileData.address,
                business_license: profileData.businessLicense,
                category: profileData.category,
                full_name: profileData.fullName || session.user.user_metadata.full_name,
                profile_completed: true,
                role: 'supplier', // Make sure role is set
                updated_at: new Date().toISOString()
              })
              .eq('auth_id', session.user.id)
              .select();
            
            if (updateError) {
              console.error('❌ Direct update failed:', updateError);
              notificationService.error('Failed to save profile. Please contact support.');
              setLoading(false);
              return;
            }
            
            console.log('✅ Profile updated directly:', updateResult);
            notificationService.success('🎉 Profile completed successfully!');
          } else {
            console.log('✅ Profile completed on retry!');
          }
        } else {
          notificationService.error(data.error || 'Failed to complete profile');
          setLoading(false);
          return;
        }
      }

      console.log('✅ Profile completed successfully!');
      notificationService.success('🎉 Profile completed! Redirecting to portal...');
      
      // Go to portal
      navigate('/supplier-portal', { replace: true });

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
