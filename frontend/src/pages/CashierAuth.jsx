import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone,
  FiShield, FiAlertCircle, FiArrowRight, FiLogIn,
  FiUserPlus, FiDollarSign, FiCheckCircle, FiClock, FiShoppingCart,
  FiCalendar, FiMapPin, FiHome, FiCheck, FiArrowLeft, FiCreditCard
} from 'react-icons/fi';

const CashierAuth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileStep, setProfileStep] = useState(1);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    shift: 'morning',
    // Profile completion fields
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    idNumber: '',
    tillExperience: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [errors, setErrors] = useState({});

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/cashier-auth`
        }
      });

      if (error) throw error;

      notificationService.show(
        '🔄 Redirecting to Google...',
        'info'
      );

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

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking cashier authentication...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        setCurrentUser(user);
        
        // Check if user exists in database
        let { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .eq('role', 'cashier')
          .single();

        console.log('👤 User data from database:', userData);

        // If user doesn't exist (OAuth first-time sign-in), create them
        if (fetchError || !userData) {
          console.log('📝 Creating new cashier user in database...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              auth_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'cashier',
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
          notificationService.show('Welcome! Please complete your cashier profile.', 'info');
        }

        // Priority flow: approved → profile incomplete → pending
        console.log('🔀 Checking user status - Active:', userData.is_active, 'Profile Complete:', userData.profile_completed);
        
        if (userData.is_active && userData.profile_completed) {
          // Approved and profile complete → Go to Employee Portal (Cashier Portal with all features)
          console.log('✅ User approved and profile complete - Redirecting to Cashier Portal');
          notificationService.show('✅ Welcome back!', 'success');
          navigate('/employee-portal');
        } else if (!userData.profile_completed) {
          // Profile not completed → Show profile form
          console.log('📋 Profile not complete - Showing profile form');
          setShowProfileCompletion(true);
          setFormData(prev => ({
            ...prev,
            fullName: userData.full_name || '',
            phone: userData.phone || '',
            shift: userData.shift || 'morning'
          }));
        } else {
          // Profile complete but not active → Pending approval
          console.log('⏳ Profile complete but not approved - Pending approval');
          notificationService.show(
            '⏳ Your cashier application is pending admin approval.',
            'warning',
            5000
          );
          await supabase.auth.signOut();
        }
      } else {
        console.log('❌ No authenticated user found');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    }
  };

  const validateProfileStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.fullName) newErrors.fullName = 'Full name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.phone) newErrors.phone = 'Phone is required';
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.idNumber) newErrors.idNumber = 'ID number is required';
    }
    
    if (step === 2) {
      if (!formData.shift) newErrors.shift = 'Shift preference is required';
      if (!formData.tillExperience) newErrors.tillExperience = 'Till experience is required';
    }
    
    if (step === 3) {
      if (!formData.emergencyContact) newErrors.emergencyContact = 'Emergency contact is required';
      if (!formData.emergencyPhone) newErrors.emergencyPhone = 'Emergency phone is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileNext = () => {
    if (validateProfileStep(profileStep)) {
      setProfileStep(profileStep + 1);
      setErrors({});
    }
  };

  const handleProfileBack = () => {
    setProfileStep(profileStep - 1);
    setErrors({});
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfileStep(3)) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          id_number: formData.idNumber,
          shift: formData.shift,
          till_experience: parseInt(formData.tillExperience) || 0,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
          profile_completed: true,
          submitted_at: new Date().toISOString()
        })
        .eq('auth_id', currentUser.id);

      if (error) throw error;

      notificationService.show(
        '🎉 Cashier profile completed! Your application is pending admin approval.',
        'success',
        5000
      );

      setTimeout(async () => {
        await supabase.auth.signOut();
        setShowProfileCompletion(false);
        setProfileStep(1);
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Profile completion error:', error);
      notificationService.show(
        error.message || 'Failed to complete profile',
        'error'
      );
    } finally {
      setLoading(false);
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
      // Get user by username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username)
        .maybeSingle();

      if (userError) {
        console.error('Database error:', userError);
        throw new Error('Invalid username or password');
      }

      if (!userData) {
        throw new Error('Invalid username or password');
      }

      if (userData.role !== 'cashier') {
        throw new Error('This portal is for cashiers only');
      }

      if (!userData.is_active) {
        notificationService.show(
          '⏳ Your account is pending admin approval. You will be notified once approved.',
          'warning'
        );
        return;
      }

      // Authenticate (Supabase uses internal email, hidden from user)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: formData.password
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Invalid username or password');
      }

      localStorage.setItem('supermarket_user', JSON.stringify({
        id: userData.id,
        name: userData.full_name,
        role: 'cashier',
        username: userData.username,
        timestamp: Date.now()
      }));

      notificationService.show('✅ Welcome back, Cashier!', 'success');
      navigate('/employee-portal');

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
      // Call the register_cashier RPC function (bypasses RLS, hashes password)
      const { data, error } = await supabase.rpc('register_cashier', {
        p_username: formData.username,
        p_password: formData.password,
        p_full_name: formData.fullName,
        p_phone: formData.phone,
        p_shift: formData.shift
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw new Error(error.message || 'Failed to register cashier');
      }

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      console.log('✅ Cashier registered:', data);

      notificationService.show(
        '✅ Application submitted! Your cashier account is pending admin approval.',
        'success',
        5000
      );

      setTimeout(() => {
        setIsLogin(true);
        setFormData({
          username: formData.username,
          password: '',
          confirmPassword: '',
          fullName: '',
          phone: '',
          shift: 'morning'
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

  // =============================================
  // RENDER: Profile Completion Form
  // =============================================
  if (showProfileCompletion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-cyan-600 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Cashier Profile</h1>
            <p className="text-gray-600">Fill in your details to continue</p>
          </div>

          <form onSubmit={handleCompleteProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* ID Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Number *
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Shift */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Shift *
                </label>
                <select
                  name="shift"
                  value={formData.shift}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              {/* Till Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Till Experience (months)
                </label>
                <input
                  type="number"
                  name="tillExperience"
                  value={formData.tillExperience}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  min="0"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Emergency Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone *
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-cyan-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-cyan-600 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center text-white space-y-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FiShoppingCart className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">FAREDEAL</h1>
                <p className="text-green-100">Cashier Portal</p>
              </div>
            </div>
            <p className="text-xl text-green-50">
              Fast, efficient checkout and customer service
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Quick POS System</h3>
                <p className="text-green-100 text-sm">Process sales quickly with barcode scanning and easy interface</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Multiple Payments</h3>
                <p className="text-green-100 text-sm">Accept cash, mobile money, cards, and more</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Easy Returns</h3>
                <p className="text-green-100 text-sm">Handle returns and exchanges seamlessly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="md:hidden flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <FiShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">FAREDEAL</h2>
              <p className="text-sm text-gray-600">Cashier Portal</p>
            </div>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrors({});
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                isLogin
                  ? 'bg-white text-green-600 shadow-md'
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
                  ? 'bg-white text-green-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiUserPlus className="w-5 h-5" />
              <span>Register</span>
            </button>
          </div>

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

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back!' : 'Join our cashier team'}
            </h2>
            <p className="text-gray-600">
              {isLogin
                ? 'Enter your credentials to start your shift'
                : 'Fill in your details to request cashier access'}
            </p>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
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
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
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
                  placeholder="cashier_jane"
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.username
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
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
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Shift
                  </label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    <option value="morning">Morning (6 AM - 2 PM)</option>
                    <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
                    <option value="night">Night (10 PM - 6 AM)</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </>
            )}

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
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
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
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-cyan-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Start Shift' : 'Request Access'}</span>
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
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-gray-700 font-semibold group-hover:text-green-700">
                  Sign in with Google
                </span>
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                {isLogin ? 'Request access here' : 'Login here'}
              </button>
            </p>
          </div>

          <div className="mt-6 flex items-start space-x-2 bg-green-50 rounded-xl p-4">
            <FiShield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-900">
              Login with your username. Admin will approve your account to grant access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierAuth;
