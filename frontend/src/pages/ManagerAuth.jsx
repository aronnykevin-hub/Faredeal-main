import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone,
  FiShield, FiAlertCircle, FiArrowRight, FiLogIn,
  FiUserPlus, FiBriefcase, FiCheckCircle, FiClock,
  FiCalendar, FiMapPin, FiHome, FiBook, FiAward,
  FiUsers, FiCheck, FiArrowLeft, FiFileText
} from 'react-icons/fi';

const ManagerAuth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    department: ''
  });

  const [errors, setErrors] = useState({});

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/manager-auth`
        }
      });

      if (error) throw error;

      // OAuth redirect initiated

    } catch (error) {
      console.error('Google sign-in error:', error);
      notificationService.show(
        error.message || 'Failed to sign in with Google',
        'error'
      );
      setLoading(false);
    }
  };

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
      
      checkAuth();
    };
    
    initAuth();
  }, []);

  // Poll for role updates while on waiting screen
  useEffect(() => {
    if (!showWaitingScreen || !currentUser || isRedirecting) {
      return;
    }

    console.log('🔄 Starting role update polling for:', currentUser.email);
    let pollInterval = null;
    let isCleanedUp = false;
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          // Check ALL records with this email (not just by auth_id)
          // because admin might have set role to 'manager' in a different record
          const { data: allUserRecords, error: fetchError } = await supabase
            .from('users')
            .select('id, auth_id, email, full_name, role, is_active, phone')
            .eq('email', currentUser.email);

          if (fetchError) {
            console.error('⚠️  Error polling for updates:', fetchError);
            return;
          }

          if (allUserRecords && allUserRecords.length > 0) {
            console.log('📊 Found', allUserRecords.length, 'record(s) with email:', currentUser.email);
            
            // Check if ANY record has manager role and is active
            const managerRecord = allUserRecords.find(u => u.role === 'manager' && u.is_active === true);
            
            if (managerRecord) {
              console.log('✅ Manager role found in record:', managerRecord.id);
              
              // Stop polling immediately
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              isCleanedUp = true;
              
              // Prevent multiple redirects
              if (isRedirecting) {
                console.log('🛑 Already redirecting, skipping duplicate');
                return;
              }
              
              setIsRedirecting(true);
              setShowWaitingScreen(false);
              
              console.log('✅ Your manager account has been approved!');
              
              // Use setTimeout to ensure state updates are processed
              // Then navigate (don't reload - let the component handle it)
              setTimeout(() => {
                console.log('🚀 Navigating to manager portal...');
                navigate('/manager');
              }, 1500);
            } else {
              // Log the current status for debugging
              const userRecord = allUserRecords[0];
              console.log('📊 Polled user data - Role:', userRecord.role, 'Active:', userRecord.is_active);
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds
    };
    
    startPolling();

    return () => {
      if (pollInterval && !isCleanedUp) {
        clearInterval(pollInterval);
        console.log('🛑 Stopped polling for role updates');
      }
    };
  }, [showWaitingScreen, currentUser, isRedirecting, navigate]);

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking manager authentication...');
      const [
        { data: { session } },
        { data: { user: directUser } }
      ] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser()
      ]);

      const user = directUser || session?.user || null;
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        setCurrentUser(user);
        
        // Check if user exists in database
        let { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('id, auth_id, email, full_name, role, is_active, phone')
          .eq('auth_id', user.id)
          .maybeSingle();

        console.log('👤 User data from database:', userData, 'Error:', fetchError?.code);

        // If user doesn't exist yet, create a minimal placeholder row for email-based role assignment
        if (!userData && !fetchError) {
          console.log('📝 User record not found. Creating minimal placeholder...');

          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'user',
              is_active: false,
              phone: null,
              created_at: new Date().toISOString()
            })
            .select('id, auth_id, email, full_name, role, is_active, phone')
            .single();

          if (insertError) {
            // If duplicate email+role constraint violation, try to fetch the existing record
            if (insertError.code === '23505' || insertError.details?.includes('users_email_role_unique')) {
              console.log('⚠️  User record already exists with this email+role. Fetching existing record...');
              
              const { data: existingData, error: fetchExistingError } = await supabase
                .from('users')
                .select('id, auth_id, email, full_name, role, is_active, phone')
                .eq('email', user.email)
                .eq('role', 'user')
                .maybeSingle();
              
              if (fetchExistingError) {
                console.error('❌ Failed to fetch existing user record:', fetchExistingError);
                throw fetchExistingError;
              }
              
              if (existingData) {
                console.log('✅ Using existing user record:', existingData);
                userData = existingData;
                
                // Update auth_id if it's null
                if (!existingData.auth_id) {
                  const { data: updatedData, error: updateError } = await supabase
                    .from('users')
                    .update({ auth_id: user.id, updated_at: new Date().toISOString() })
                    .eq('id', existingData.id)
                    .select('id, auth_id, email, full_name, role, is_active, phone')
                    .single();
                  
                  if (updateError) {
                    console.error('⚠️  Could not update auth_id:', updateError);
                    // Non-fatal - continue with existing data
                  } else {
                    userData = updatedData;
                  }
                }
              }
            } else {
              console.error('❌ Failed to create placeholder user record:', insertError);
              throw insertError;
            }
          } else {
            userData = insertData;
            console.log('✅ Placeholder user record created:', userData);
          }
        } else if (fetchError) {
          console.error('❌ Database error:', fetchError);
          throw fetchError;
        }

        const hasManagerRole = userData?.role === 'manager';
        const isActiveManager = userData?.is_active === true;
        console.log('🔀 User status - Manager Role:', hasManagerRole, 'Active:', isActiveManager, 'Email:', userData?.email);

        if (hasManagerRole && isActiveManager) {
          console.log('✅ Manager role assigned - Redirecting to Manager Portal');
          navigate('/manager');
        } else {
          console.log('⏳ Manager role not assigned yet - Showing waiting screen');
          setShowWaitingScreen(true);
          // Don't sign out — keep user logged in so polling can detect role updates
        }
      } else {
        console.log('❌ No authenticated user found');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!isLogin) {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required';
      }
      if (!formData.department) {
        newErrors.department = 'Department is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Use custom RPC login function that validates username/password
      const { data: loginResult, error: loginError } = await supabase
        .rpc('login_user', {
          p_username: formData.username,
          p_password: formData.password
        });

      if (loginError) {
        console.error('Login RPC error:', loginError);
        throw new Error('Invalid username or password');
      }

      if (!loginResult?.success) {
        // Check if pending approval
        if (loginResult?.pending_approval) {
          notificationService.show(
            '⏳ Your account is pending admin approval. You will be notified once approved.',
            'warning'
          );
        } else {
          throw new Error(loginResult?.error || 'Invalid username or password');
        }
        return;
      }

      // Verify role is manager
      if (loginResult.role !== 'manager') {
        throw new Error('This portal is for managers only');
      }

      // Store manager data
      localStorage.setItem('supermarket_user', JSON.stringify({
        id: loginResult.user_id,
        name: loginResult.full_name,
        role: 'manager',
        username: loginResult.username,
        timestamp: Date.now()
      }));

      navigate('/manager-portal');

    } catch (error) {
      console.error('Login error:', error);
      notificationService.show(
        error.message || 'Invalid username or password',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Call the register_manager RPC function (bypasses RLS, hashes password)
      const { data, error } = await supabase.rpc('register_manager', {
        p_username: formData.username,
        p_password: formData.password,
        p_full_name: formData.fullName,
        p_phone: formData.phone
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw new Error(error.message || 'Failed to register manager');
      }

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      console.log('✅ Manager registered:', data);

      // Switch to login view after successful registration
      setTimeout(() => {
        setIsLogin(true);
        setFormData({
          username: formData.username,
          password: '',
          confirmPassword: '',
          fullName: '',
          phone: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.message && error.message.includes('Username already taken')) {
        notificationService.show(
          '⚠️ Username already taken. Please choose another.',
          'warning'
        );
      } else if (error.message && error.message.includes('For security purposes')) {
        notificationService.show(
          '⏱️ Please wait a moment before trying again.',
          'warning'
        );
      } else {
        notificationService.show(
          error.message || 'Failed to create account',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Waiting Screen
  if (showWaitingScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <FiClock className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Waiting for Manager Approval
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            Your account has been created. An admin will assign your role as manager, then you'll be able to access the manager portal.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6 text-left">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">📧 Email:</span> {currentUser?.email}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              ✓ The system is automatically checking for role updates every 3 seconds
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 mb-6">
            <FiClock className="w-4 h-4 animate-spin" />
            Auto-checking for updates...
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Once the admin approves you, this page will automatically redirect you to the manager dashboard.
          </p>

          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              checkAuth();
            }}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            <FiArrowRight className="w-4 h-4" />
            Check Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main container */}
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center text-white space-y-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FiBriefcase className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">FAREDEAL</h1>
                <p className="text-blue-100">Manager Portal</p>
              </div>
            </div>
            <p className="text-xl text-blue-50">
              Manage your team, track sales, and monitor operations
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Team Management</h3>
                <p className="text-blue-100 text-sm">Schedule employees, track attendance, and manage performance</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Sales Monitoring</h3>
                <p className="text-blue-100 text-sm">Real-time sales reports and analytics at your fingertips</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Inventory Control</h3>
                <p className="text-blue-100 text-sm">Stock management, reorder alerts, and supplier coordination</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Mobile branding */}
          <div className="md:hidden flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FiBriefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">FAREDEAL</h2>
              <p className="text-sm text-gray-600">Manager Portal</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrors({});
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                isLogin
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiLogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrors({});
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                !isLogin
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiUserPlus className="w-5 h-5" />
              <span>Register</span>
            </button>
          </div>

          {/* Info banner for signup */}
          {!isLogin && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3">
              <FiClock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Admin Approval Required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your account will appear in admin's pending approvals immediately!
                </p>
              </div>
            </div>
          )}

          {/* Form title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back!' : 'Create manager account'}
            </h2>
            <p className="text-gray-600">
              {isLogin
                ? 'Enter your credentials to access the manager portal'
                : 'Fill in your details to request manager access'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.fullName
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="manager_john"
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.username
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-1" />
                  {errors.username}
                </p>
              )}
            </div>

            {/* Phone and Department (Signup only) */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+256 700 000 000"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.department
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                  >
                    <option value="">Select department</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Customer Service">Customer Service</option>
                    <option value="Finance">Finance</option>
                  </select>
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="w-4 h-4 mr-1" />
                      {errors.department}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Login to Portal' : 'Request Access'}</span>
                  <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                type="button"
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-gray-700 font-semibold group-hover:text-purple-700">
                  Sign in with Google
                </span>
              </button>
            </>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                {isLogin ? 'Request access here' : 'Login here'}
              </button>
            </p>
          </div>

          {/* Security note */}
          <div className="mt-6 flex items-start space-x-2 bg-purple-50 rounded-xl p-4">
            <FiShield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-900">
              Login with your username. Admin will approve your account to grant access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAuth;
