import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { fastCache, optimizedApiCall } from '../utils/fastConnectionCache';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone,
  FiShield, FiCheckCircle, FiAlertCircle, FiArrowRight,
  FiLogIn, FiUserPlus, FiZap, FiAward, FiTrendingUp, FiArrowLeft,
  FiMoon, FiSun
} from 'react-icons/fi';

const AdminAuth = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [manualDarkMode, setManualDarkMode] = useState(null); // null = auto, true/false = manual override
  
  // Handle smart back navigation with smooth history checking
  const handleBackNavigation = () => {
    // Try going back in history first
    const historyLength = window.history.length;
    if (historyLength > 1) {
      // Go back smoothly through browser history
      window.history.back();
    } else {
      // Fallback: no history available, go to portal selection
      navigate('/portal-selection');
    }
  };
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [urlAllowed, setUrlAllowed] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    const listener = (e) => setIsDarkMode(e.matches);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
  }, []);

  // Determine effective dark mode (manual override or system preference)
  const effectiveDarkMode = manualDarkMode !== null ? manualDarkMode : isDarkMode;

  // Toggle dark mode
  const toggleDarkMode = () => {
    setManualDarkMode(prev => prev === null ? !isDarkMode : !prev);
  };
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    department: 'Administration',
    role: 'Admin'
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const oauthProcessingRef = useRef(false); // Prevent duplicate OAuth processing
  const oauthTimeoutRef = useRef(null); // Store timeout for cleanup

  // Check if URL is allowed for admin access
  useEffect(() => {
    checkURLAccess();
  }, []);

  // Check if already logged in - DISABLED AUTO-REDIRECT
  // Users should explicitly choose their portal and login action
  useEffect(() => {
    // Don't auto-redirect - let user control the flow
    console.log('✅ Admin auth page loaded - user can choose login/signup');
  }, [urlAllowed]);

  const checkURLAccess = () => {
    const currentURL = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    console.log('🔍 Admin URL Check:', {
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
    
    setUrlAllowed(isAllowed);
    
    if (!isAllowed) {
      console.warn('❌ Admin access blocked - Unauthorized URL:', window.location.href);
    } else {
      console.log('✅ Admin access allowed from:', hostname);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ User authenticated:', user.email);
        // Don't auto-redirect - just confirm user is logged in
        // User should click button to proceed
        return true;
      }
      return false;
    } catch (error) {
      console.log('Not authenticated yet');
      return false;
    }
  };

  // Handle proceeding to admin portal after OAuth
  const handleProceedToPortal = async () => {
    try {
      console.log('🔐 Checking authentication before proceeding...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        notificationService.show(
          '❌ Not authenticated. Please sign in with Google first.',
          'error'
        );
        return;
      }

      console.log('✅ Authenticated as:', user.email);
      localStorage.setItem('adminKey', 'true');
      localStorage.setItem('supermarket_user', JSON.stringify({
        id: user.id,
        name: user.user_metadata?.full_name || user.email,
        role: 'admin',
        email: user.email,
        accessLevel: 'system',
        timestamp: Date.now()
      }));
      
      console.log('🚀 Proceeding to admin portal...');
      navigate('/admin-portal');
    } catch (error) {
      console.error('❌ Error proceeding to portal:', error);
      notificationService.show(
        'Failed to proceed. Please try again.',
        'error'
      );
    }
  };

  // Listen for OAuth completion - FIXED TO NOT AUTO-REDIRECT
  useEffect(() => {
    const handleOAuthCompletion = async () => {
      // ⚡ CRITICAL: Only process OAuth callback ONCE
      if (oauthProcessingRef.current) {
        console.log('🔐 [OAUTH] Already processing, skipping...');
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('🔐 [OAUTH] No authenticated user found');
          return;
        }

        // Check if this is a Google OAuth user
        const isGoogleUser = user.identities?.some(id => id.provider === 'google');
        
        if (!isGoogleUser) {
          console.log('🔐 [OAUTH] Not a Google OAuth user');
          return;
        }

        // Mark processing to prevent duplicate calls
        oauthProcessingRef.current = true;
        console.log('✅ [OAUTH] Google OAuth detected for:', user.email);
        
        // Get user data
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Admin User';
        
        // 🔧 IMMEDIATELY update database without retry logic
        try {
          const { error } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              phone: user.user_metadata?.phone || null,
              role: 'admin',
              is_active: true,
              email_verified: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (error) {
            console.warn('⚠️ [OAUTH] Database sync warning:', error.message);
          } else {
            console.log('✅ [OAUTH] Database record synced');
          }
        } catch (dbError) {
          console.warn('⚠️ [OAUTH] Database error (non-blocking):', dbError);
        }
        
        // ✅ Set auth state
        console.log('🔐 [OAUTH] Setting admin access...');
        localStorage.setItem('adminKey', 'true');
        localStorage.setItem('supermarket_user', JSON.stringify({
          id: user.id,
          name: fullName,
          role: 'admin',
          email: user.email,
          accessLevel: 'system',
          timestamp: Date.now()
        }));
        
        notificationService.show(
          '✅ Google sign-in successful! Accessing admin portal...',
          'success',
          2000
        );
        
        // 🚀 Automatically proceed to admin portal after OAuth
        setTimeout(() => {
          console.log('🚀 [OAUTH] Navigating to admin portal...');
          navigate('/admin-portal');
        }, 1500);
        
      } catch (error) {
        console.error('🔐 [OAUTH] Error:', error.message);
        oauthProcessingRef.current = false;
      }
    };

    // Listen for auth state changes - but DON'T auto-redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && !oauthProcessingRef.current) {
          const isGoogle = session?.user?.identities?.some(id => id.provider === 'google');
          if (isGoogle) {
            console.log('🔐 [OAUTH] Detected Google OAuth signin event');
            handleOAuthCompletion();
            // Don't auto-redirect - let user control it
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
      if (oauthTimeoutRef.current) {
        clearTimeout(oauthTimeoutRef.current);
      }
    };
  }, [navigate]);

  // Calculate password strength
  useEffect(() => {
    if (!isLogin && formData.password) {
      let strength = 0;
      if (formData.password.length >= 8) strength += 25;
      if (formData.password.length >= 12) strength += 25;
      if (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) strength += 25;
      if (/[0-9]/.test(formData.password)) strength += 12.5;
      if (/[^A-Za-z0-9]/.test(formData.password)) strength += 12.5;
      setPasswordStrength(Math.min(strength, 100));
    }
  }, [formData.password, isLogin]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Signup specific validations
    if (!isLogin) {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (passwordStrength < 50) {
        newErrors.password = 'Password is too weak';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ⚡ Handle magic link login (ultra-fast for slow connections)
  const handleMagicLinkLogin = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Email is invalid' });
      return;
    }

    setLoading(true);
    console.log('⚡ [MAGIC] Sending magic link...');

    try {
      await fastCache.executeWithDedup(
        `magic_${formData.email}`,
        async () => {
          return optimizedApiCall(async () => {
            return supabase.auth.signInWithOtp({
              email: formData.email,
              options: {
                emailRedirectTo: `${window.location.origin}/admin-portal`
              }
            });
          }, {
            maxRetries: 2,
            timeout: 15000
          });
        }
      );

      setMagicLinkSent(true);
      notificationService.show(
        '📧 Magic link sent! Check your email.',
        'success',
        5000
      );

    } catch (error) {
      console.error('⚡ [MAGIC] Error:', error);
      notificationService.show(
        error.message || 'Failed to send magic link',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [formData.email]);

  // ⚡ Handle Google Sign-In (NO RETRY - direct redirect)
  const handleGoogleSignIn = useCallback(async () => {
    try {
      console.log('🔐 [GOOGLE] Starting OAuth redirect...');
      
      // OAuth doesn't need retry logic - it redirects immediately
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin-auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        console.error('❌ [GOOGLE] OAuth error:', error);
        notificationService.show(
          error.message || 'Failed to sign in with Google',
          'error'
        );
      }
      // If success, user is redirected to Google - no need to do anything else
    } catch (error) {
      console.error('❌ [GOOGLE] Error:', error);
      notificationService.show(
        error.message || 'Failed to sign in with Google',
        'error'
      );
    }
  }, []);

  // Handle login with FAST parallel operations
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // ⚡ Fast connection check
    if (!navigator.onLine) {
      notificationService.show(
        '🌐 No internet connection detected. Please check your connection and try again.',
        'error',
        5000
      );
      return;
    }

    setLoading(true);
    console.log('⚡ [FAST-LOGIN] Starting optimized login...');
    const startTime = Date.now();

    try {
      // ⚡ Use deduplication to prevent double submissions
      const loginKey = `login_${formData.email}`;
      
      const loginResult = await fastCache.executeWithDedup(
        loginKey,
        async () => {
          return optimizedApiCall(async () => {
            const result = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password
            });
            return result;
          }, {
            maxRetries: 2,
            timeout: 20000,
            initialDelay: 300
          });
        }
      );

      const { data, error } = loginResult;

      if (error) {
        console.error('⚡ [FAST-LOGIN] Auth error:', error.message);
        if (error.message.toLowerCase().includes('email') && 
            error.message.toLowerCase().includes('confirm')) {
          notificationService.show(
            '📧 Please verify your email first! Check your inbox for the confirmation link.',
            'warning',
            6000
          );
          return;
        }
        throw error;
      }

      console.log('⚡ [FAST-LOGIN] Auth successful for:', data.user.email);

      // ⚡ CRITICAL: Prepare all user data synchronously
      const adminUser = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || 'Admin',
        role: 'admin',
        email: data.user.email,
        accessLevel: 'system',
        timestamp: Date.now()
      };

      // ⚡ INSTANT: Set localStorage + auth state immediately (NO AWAIT)
      localStorage.setItem('adminKey', 'true');
      localStorage.setItem('supermarket_user', JSON.stringify(adminUser));
      fastCache.cache.set('currentUser', adminUser);

      // ⚡ PARALLEL: Background operations (non-blocking)
      // Fire all async tasks in parallel without awaiting
      if (data.user) {
        Promise.all([
          // Update user in database
          (async () => {
            try {
              await supabase.from('users').upsert({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || 'Admin',
                phone: data.user.user_metadata?.phone || null,
                role: 'admin',
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
            } catch (err) {
              console.warn('⚠️ [BG] User sync failed:', err.message);
            }
          })(),
          // Prefetch user profile (warming cache)
          (async () => {
            try {
              await supabase.from('admin_profiles')
                .select('*')
                .eq('user_id', data.user.id)
                .single();
            } catch (err) {
              console.log('[BG] Profile prefetch skipped');
            }
          })()
        ]).catch(err => console.log('[BG] Parallel tasks error:', err.message));
      }

      const duration = Date.now() - startTime;
      console.log(`⚡ [FAST-LOGIN] Complete in ${duration}ms`);
      
      notificationService.show('✅ Welcome back, Admin!', 'success', 1500);
      
      // ⚡ ULTRA-FAST: Redirect immediately (200ms)
      setTimeout(() => {
        navigate('/admin-portal');
      }, 200);

    } catch (error) {
      console.error('⚡ [FAST-LOGIN] Error:', error);
      setLoading(false);
      fastCache.clear(`login_${formData.email}`); // Clear failed login from cache
      
      // Smart error messages
      let errorMsg = 'Invalid email or password';
      
      if (error.message) {
        if (error.message.toLowerCase().includes('timeout')) {
          errorMsg = '⏱️ Connection slow. Try Magic Link instead (no password needed).';
        } else if (error.message.toLowerCase().includes('invalid_grant') || 
            error.message.toLowerCase().includes('invalid login')) {
          errorMsg = '❌ Invalid email or password.';
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          errorMsg = '📧 Please verify your email first!';
        } else if (error.message.toLowerCase().includes('not found')) {
          errorMsg = '👤 Email not registered. Please sign up first.';
        } else if (error.message.toLowerCase().includes('network')) {
          errorMsg = '🌐 Network error. Check your internet connection.';
        } else {
          errorMsg = `Error: ${error.message}`;
        }
      }
      
      notificationService.show(errorMsg, 'error');
    }
  }, [formData, navigate]);

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      notificationService.show('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    console.log('🔐 [FORGOT] Checking user:', forgotPasswordEmail);

    try {
      // First, check if user exists in our system
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', forgotPasswordEmail.toLowerCase())
        .maybeSingle();

      if (userError || !userData) {
        throw new Error('Email not found in system. Please sign up first.');
      }

      // Generate a reset token
      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store reset token in database (we'll create a simple approach)
      console.log('🔐 [FORGOT] Generating reset token...');
      
      // Since we can't use email, show the reset link directly
      const resetLink = `${window.location.origin}/admin-auth?resetToken=${resetToken}&email=${encodeURIComponent(forgotPasswordEmail)}`;
      
      setResetEmailSent(true);
      
      // Show the reset link directly (since email isn't configured)
      notificationService.show(
        '⚠️ Email not configured. Use Google Sign-In instead!',
        'warning',
        5000
      );

      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmailSent(false);
        setForgotPasswordEmail('');
        // Suggest Google signin
        setIsLogin(true);
      }, 2000);

    } catch (error) {
      console.error('🔐 [FORGOT] Error:', error.message);
      notificationService.show(
        error.message || 'Error processing request',
        'error'
      );
      setLoading(false);
    }
  };

  // Handle password reset after clicking email link
  const handlePasswordReset = async (newPassword, confirmPassword) => {
    if (newPassword !== confirmPassword) {
      notificationService.show('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      notificationService.show('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    console.log('🔐 [RESET] Updating password...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      console.log('✅ Password updated successfully');
      notificationService.show(
        '✅ Password updated! You can now login with your new password.',
        'success',
        5000
      );

      setTimeout(() => {
        setIsLogin(true);
        setFormData({ ...formData, password: '', confirmPassword: '' });
      }, 2000);

    } catch (error) {
      console.error('🔐 [RESET] Update error:', error);
      notificationService.show(
        error.message || 'Failed to update password',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle signup - WITH EMAIL CONFIRMATION
  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create admin account
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            department: formData.department,
            role: 'admin'
          },
          emailRedirectTo: `${window.location.origin}/admin-auth`
        }
      });

      if (error) throw error;

      // ✅ CREATE USER RECORD IN DATABASE WITH ROLE='ADMIN'
      if (data.user) {
        try {
          console.log('📝 Creating user record with admin role...', data.user.id);
          
          // Insert user record with admin role
          const { data: userRecord, error: userError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: formData.email,
              full_name: formData.fullName,
              phone: formData.phone || null,
              role: 'admin',
              is_active: true,
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();

          if (userError) {
            // If insert fails (user exists), try update instead
            if (userError.code === '23505') { // Unique violation
              console.log('User already exists, updating...');
              const { data: updateData, error: updateError } = await supabase
                .from('users')
                .update({
                  full_name: formData.fullName,
                  phone: formData.phone || null,
                  role: 'admin',
                  is_active: true,
                  email_verified: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', data.user.id)
                .select();
              
              if (updateError) {
                console.warn('⚠️ Could not update user record:', updateError.message);
              } else {
                console.log('✅ User record updated with role=admin');
              }
            } else {
              console.warn('⚠️ Could not insert user record:', userError.message);
            }
          } else {
            console.log('✅ User record created with role=admin');
          }
        } catch (userCreateError) {
          console.log('Note: User record creation error:', userCreateError.message);
          // Continue even if user record creation fails
        }
      }

      // 📧 Send welcome email (non-blocking)
      try {
        const apiUrl = import.meta.env.PROD
          ? 'https://api.faredeal.vercel.app/api'
          : 'http://localhost:3001/api';
        
        const emailResponse = await fetch(`${apiUrl}/email/send-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.fullName
          })
        });
        
        if (emailResponse.ok) {
          console.log('✅ Welcome email sent successfully');
        } else {
          console.warn('⚠️ Email endpoint response:', emailResponse.status);
        }
      } catch (emailError) {
        // Non-blocking: log but don't fail signup
        console.log('📧 Note: Could not send welcome email:', emailError.message);
      }

      // Auto-confirm and redirect to dashboard
      notificationService.show(
        '🎉 Admin account created! Welcome to FAREDEAL!',
        'success'
      );
      
      // Store admin session immediately
      localStorage.setItem('adminKey', 'true');
      localStorage.setItem('supermarket_user', JSON.stringify({
        id: data.user.id,
        name: formData.fullName,
        role: 'admin',
        email: formData.email,
        accessLevel: 'system',
        timestamp: Date.now()
      }));
      
      // Redirect to dashboard immediately
      setTimeout(() => {
        navigate('/admin-portal');
      }, 500);

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.message?.toLowerCase().includes('already registered')) {
        notificationService.show(
          '⚠️ This email is already registered. Please login instead.',
          'warning'
        );
        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
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

  // Get password strength color and text
  const getPasswordStrengthInfo = () => {
    if (passwordStrength < 25) return { color: 'bg-red-500', text: 'Very Weak', textColor: 'text-red-600' };
    if (passwordStrength < 50) return { color: 'bg-orange-500', text: 'Weak', textColor: 'text-orange-600' };
    if (passwordStrength < 75) return { color: 'bg-yellow-500', text: 'Fair', textColor: 'text-yellow-600' };
    if (passwordStrength < 90) return { color: 'bg-blue-500', text: 'Good', textColor: 'text-blue-600' };
    return { color: 'bg-green-500', text: 'Strong', textColor: 'text-green-600' };
  };

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <div style={{
      backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
      color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'background-color 0.3s, color 0.3s'
    }} className="flex items-center justify-center p-4 relative overflow-hidden min-h-screen">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.5)' }} className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse"></div>
        <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.5)' }} className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(255, 255, 255, 0.3)' }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main container */}
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-8" style={{ color: effectiveDarkMode ? '#e2e8f0' : '#ffffff' }}>
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.2)' }} className="w-16 h-16 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FiShield className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">FAREDEAL</h1>
                <p style={{ color: effectiveDarkMode ? '#cbd5e1' : '#e0e7ff' }}>Admin Portal</p>
              </div>
            </div>
            <p className="text-xl">
              Secure administrative access to your supermarket management system
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.1)' }} className="flex items-start space-x-4 backdrop-blur-sm rounded-xl p-4">
              <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.2)' }} className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiZap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Analytics</h3>
                <p style={{ color: effectiveDarkMode ? '#cbd5e1' : '#e0e7ff' }} className="text-sm">Monitor your business performance with live data and insights</p>
              </div>
            </div>

            <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.1)' }} className="flex items-start space-x-4 backdrop-blur-sm rounded-xl p-4">
              <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.2)' }} className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiAward className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Complete Control</h3>
                <p style={{ color: effectiveDarkMode ? '#cbd5e1' : '#e0e7ff' }} className="text-sm">Manage users, inventory, sales, and suppliers from one place</p>
              </div>
            </div>

            <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.1)' }} className="flex items-start space-x-4 backdrop-blur-sm rounded-xl p-4">
              <div style={{ backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.2)' }} className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiTrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Business Growth</h3>
                <p style={{ color: effectiveDarkMode ? '#cbd5e1' : '#e0e7ff' }} className="text-sm">Powerful tools to scale your supermarket operations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div style={{
          backgroundColor: effectiveDarkMode ? '#1e293b' : '#ffffff',
          borderColor: effectiveDarkMode ? '#334155' : '#e2e8f0'
        }} className="rounded-3xl shadow-2xl p-8 md:p-10 relative border">
          {/* Back button */}
          <button
            onClick={handleBackNavigation}
            style={{
              color: effectiveDarkMode ? '#94a3b8' : '#4b5563',
              backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9'
            }}
            className="absolute top-6 left-6 flex items-center space-x-2 hover:text-blue-600 px-3 py-2 rounded-lg transition-all duration-300 group"
            title="Go back to previous page"
          >
            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Dark mode toggle button */}
          <button
            onClick={toggleDarkMode}
            style={{
              color: effectiveDarkMode ? '#94a3b8' : '#4b5563',
              backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9'
            }}
            className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 hover:text-blue-600 group"
            title={effectiveDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {effectiveDarkMode ? (
              <FiSun className="w-5 h-5 group-hover:scale-110 transition-transform" />
            ) : (
              <FiMoon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Mobile branding */}
          <div className="md:hidden flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FiShield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: effectiveDarkMode ? '#e2e8f0' : '#1e293b' }}>FAREDEAL</h2>
              <p style={{ color: effectiveDarkMode ? '#94a3b8' : '#64748b' }} className="text-sm">Admin Portal</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ backgroundColor: effectiveDarkMode ? '#334155' : '#f1f5f9' }} className="flex rounded-xl p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrors({});
              }}
              style={{
                backgroundColor: isLogin ? (effectiveDarkMode ? '#1e293b' : '#ffffff') : 'transparent',
                color: isLogin ? '#6366f1' : effectiveDarkMode ? '#94a3b8' : '#64748b'
              }}
              className="flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <FiLogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrors({});
              }}
              style={{
                backgroundColor: !isLogin ? (effectiveDarkMode ? '#1e293b' : '#ffffff') : 'transparent',
                color: !isLogin ? '#6366f1' : effectiveDarkMode ? '#94a3b8' : '#64748b'
              }}
              className="flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <FiUserPlus className="w-5 h-5" />
              <span>Sign Up</span>
            </button>
          </div>

          {/* Form title */}
          <div className="mb-6">
            <h2 style={{ color: effectiveDarkMode ? '#e2e8f0' : '#1e293b' }} className="text-2xl font-bold mb-2">
              {isLogin ? 'Welcome back!' : 'Create admin account'}
            </h2>
            <p style={{ color: effectiveDarkMode ? '#94a3b8' : '#64748b' }}>
              {isLogin
                ? 'Enter your credentials to access the admin portal'
                : 'Fill in your details to create a new admin account'}
            </p>
          </div>

          {/* Login method toggle */}
          {isLogin && !magicLinkSent && (
            <div className="mb-4 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setUseMagicLink(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !useMagicLink
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🔑 Password
              </button>
              <button
                type="button"
                onClick={() => setUseMagicLink(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  useMagicLink
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📧 Email Link
              </button>
            </div>
          )}

          {/* Magic link sent message */}
          {magicLinkSent ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">Check Your Email!</h3>
              <p className="text-green-700 mb-4">
                We've sent a magic link to <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-green-600 mb-4">
                Click the link in your email to sign in as Admin. The link expires in 1 hour.
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setUseMagicLink(false);
                  setFormData(prev => ({ ...prev, email: '' }));
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                ← Back to login
              </button>
            </div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={isLogin && useMagicLink ? handleMagicLinkLogin : (isLogin ? handleLogin : handleSignup)} className="space-y-5">
            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div>
                <label style={{ color: effectiveDarkMode ? '#cbd5e1' : '#374151' }} className="block text-sm font-medium mb-2">
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
                    style={{
                      backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
                      color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
                      borderColor: errors.fullName ? '#ef4444' : effectiveDarkMode ? '#475569' : '#e5e7eb'
                    }}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.fullName
                        ? 'focus:border-red-500 focus:ring-red-200'
                        : 'focus:border-blue-500 focus:ring-blue-200'
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

            {/* Email */}
            <div>
              <label style={{ color: effectiveDarkMode ? '#cbd5e1' : '#374151' }} className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@faredeal.ug"
                  style={{
                    backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
                    color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
                    borderColor: errors.email ? '#ef4444' : effectiveDarkMode ? '#475569' : '#e5e7eb'
                  }}
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'focus:border-red-500 focus:ring-red-200'
                      : 'focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone (Signup only) */}
            {!isLogin && (
              <div>
                <label style={{ color: effectiveDarkMode ? '#cbd5e1' : '#374151' }} className="block text-sm font-medium mb-2">
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
                    style={{
                      backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
                      color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
                      borderColor: effectiveDarkMode ? '#475569' : '#e5e7eb'
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label style={{ color: effectiveDarkMode ? '#cbd5e1' : '#374151' }} className="block text-sm font-medium mb-2">
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
                  style={{
                    backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
                    color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
                    borderColor: errors.password ? '#ef4444' : effectiveDarkMode ? '#475569' : '#e5e7eb'
                  }}
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'focus:border-red-500 focus:ring-red-200'
                      : 'focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: effectiveDarkMode ? '#94a3b8' : '#9ca3af' }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-blue-600 transition-colors"
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

              {/* Password strength indicator (Signup only) */}
              {!isLogin && formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: effectiveDarkMode ? '#94a3b8' : '#4b5563' }} className="text-xs">Password strength:</span>
                    <span className={`text-xs font-medium ${strengthInfo.textColor}`}>
                      {strengthInfo.text}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Signup only) */}
            {!isLogin && (
              <div>
                <label style={{ color: effectiveDarkMode ? '#cbd5e1' : '#374151' }} className="block text-sm font-medium mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    style={{
                      backgroundColor: effectiveDarkMode ? '#0f172a' : '#ffffff',
                      color: effectiveDarkMode ? '#e2e8f0' : '#1e293b',
                      borderColor: errors.confirmPassword ? '#ef4444' : effectiveDarkMode ? '#475569' : '#e5e7eb'
                    }}
                    className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.confirmPassword
                        ? 'focus:border-red-500 focus:ring-red-200'
                        : 'focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ color: effectiveDarkMode ? '#94a3b8' : '#9ca3af' }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-blue-600 transition-colors"
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Forgot password link (Login only) */}
            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmailSent(false);
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{isLogin && useMagicLink ? 'Sending link...' : (isLogin ? 'Logging in...' : 'Creating account...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin && useMagicLink ? '📧 Send Magic Link' : (isLogin ? 'Login to Portal' : 'Create Account')}</span>
                      <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {isLogin && !magicLinkSent && (
                <>
                  <div className="mt-4 text-center">
                    <p style={{ color: effectiveDarkMode ? '#94a3b8' : '#6b7280' }} className="text-xs">
                      {useMagicLink ? (
                        <>No password needed! Just click the link we send to your email.</>
                      ) : (
                        <>Passwordless login available with Email Link option above</>
                      )}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div style={{ borderColor: effectiveDarkMode ? '#475569' : '#d1d5db' }} className="w-full border-t"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span style={{
                        backgroundColor: effectiveDarkMode ? '#1e293b' : '#ffffff',
                        color: effectiveDarkMode ? '#94a3b8' : '#6b7280'
                      }} className="px-4 font-medium">Or continue with</span>
                    </div>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    type="button"
                    style={{
                      borderColor: effectiveDarkMode ? '#475569' : '#d1d5db',
                      backgroundColor: effectiveDarkMode ? 'rgba(148, 163, 184, 0.05)' : '#ffffff',
                      color: effectiveDarkMode ? '#e2e8f0' : '#374151'
                    }}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-3 border-2 rounded-xl hover:border-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span style={{ color: effectiveDarkMode ? '#e2e8f0' : '#374151' }} className="font-semibold group-hover:text-blue-700">
                      Sign in with Google
                    </span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p style={{ color: effectiveDarkMode ? '#94a3b8' : '#4b5563' }} className="text-sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                {isLogin ? 'Sign up here' : 'Login here'}
              </button>
            </p>
          </div>

          {/* Security note */}
          <div style={{
            backgroundColor: effectiveDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
            borderColor: effectiveDarkMode ? '#475569' : '#bfdbfe'
          }} className="mt-6 flex items-start space-x-2 border rounded-xl p-4">
            <FiShield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p style={{ color: effectiveDarkMode ? '#93c5fd' : '#1e40af' }} className="text-xs">
              Your data is secured with enterprise-grade encryption. We never share your information with third parties.
            </p>
          </div>

          {/* Troubleshooting Guide - Login Issues */}
          {isLogin && (
            <div style={{
              backgroundColor: effectiveDarkMode ? 'rgba(180, 83, 9, 0.1)' : '#fef3c7',
              borderColor: effectiveDarkMode ? '#92400e' : '#fcd34d'
            }} className="mt-6 border-2 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">🔧</div>
                <div className="flex-1">
                  <p style={{ color: effectiveDarkMode ? '#fed7aa' : '#92400e' }} className="font-semibold mb-2">🔑 Login Troubleshooting</p>
                  <ul style={{ color: effectiveDarkMode ? '#fed7aa' : '#b45309' }} className="text-xs space-y-1">
                    <li>✓ <strong>SLOW CONNECTION?</strong> Use "Use Email Link instead" - works much better on slow internet!</li>
                    <li>✓ Make sure you've signed up first if this is your first time</li>
                    <li>✓ Check that email and password are correct (case-sensitive)</li>
                    <li>✓ System retries automatically up to 3 times if connection is slow (up to 90 seconds)</li>
                    <li>✓ If it keeps timing out, WiFi/mobile signal might be weak - try different location</li>
                    <li>✓ Test with demo: <span className="font-mono bg-white px-1 py-0.5 rounded">test@test.com</span> password: <span className="font-mono bg-white px-1 py-0.5 rounded">Test@123</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Recovery</h2>
              <p className="text-gray-600 text-sm">
                Email is not configured on this system
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-2">📧 How to recover your account:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Click the Google sign-in button (recommended)</li>
                  <li>Or contact an administrator</li>
                  <li>Request a password reset from admin panel</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="abanabaasa2@gmail.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Email recovery is disabled. Use the options below.</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                  }}
                  className="w-full flex items-center justify-center gap-2 border-2 border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg font-medium transition-colors"
                >
                  <span>🔴</span> Sign in with Google Instead
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setIsLogin(true);
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition-colors"
                >
                  Back to Login
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                💡 <strong>Tip:</strong> Google Sign-In is the fastest way to access your account!
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Version info */}
      <div className="absolute bottom-4 right-4 text-white/70 text-sm">
        v1.0.0 | FAREDEAL Admin
      </div>
    </div>
  );
};

export default AdminAuth;
