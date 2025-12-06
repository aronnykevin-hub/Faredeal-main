import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit2, FiSave, FiX,
  FiClock, FiDollarSign, FiShoppingCart, FiTrendingUp, FiAward, FiCamera,
  FiLogOut, FiSettings, FiShield, FiCheckCircle, FiCreditCard
} from 'react-icons/fi';

const CashierPortal = () => {
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  
  const [cashierProfile, setCashierProfile] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    dateOfBirth: '',
    gender: '',
    shift: '',
    tillExperience: 0,
    emergencyContact: '',
    emergencyPhone: '',
    idNumber: '',
    avatar: '👨‍💼',
    avatar_url: null,
    isActive: false,
    profileCompleted: false,
    joinDate: ''
  });

  const [editForm, setEditForm] = useState({...cashierProfile});

  // Load cashier profile on mount
  useEffect(() => {
    loadCashierProfile();
  }, []);

  const loadCashierProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        toast.error('Please log in');
        navigate('/cashier-auth');
        return;
      }

      console.log('🔍 Loading cashier profile for user:', user.email);

      // Get cashier data from users table
      const { data: cashierData, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .eq('role', 'cashier')
        .single();

      if (error) {
        console.error('Error loading cashier profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (cashierData) {
        console.log('✅ Cashier profile found:', cashierData);

        const profile = {
          name: cashierData.full_name || 'Cashier',
          username: cashierData.username || '',
          email: cashierData.email || user.email,
          phone: cashierData.phone || '',
          address: cashierData.address || '',
          city: cashierData.city || '',
          dateOfBirth: cashierData.date_of_birth || '',
          gender: cashierData.gender || '',
          shift: cashierData.shift || 'morning',
          tillExperience: cashierData.till_experience || 0,
          emergencyContact: cashierData.emergency_contact || '',
          emergencyPhone: cashierData.emergency_phone || '',
          idNumber: cashierData.id_number || '',
          avatar: '👨‍💼',
          avatar_url: cashierData.avatar_url || null,
          isActive: cashierData.is_active || false,
          profileCompleted: cashierData.profile_completed || false,
          joinDate: new Date(cashierData.created_at).toLocaleDateString()
        };

        setCashierProfile(profile);
        setEditForm(profile);
        
        // Set profile picture if available
        if (cashierData.avatar_url) {
          setProfilePicUrl(cashierData.avatar_url);
          console.log('✅ Loaded profile picture from database');
        }
      }
    } catch (error) {
      console.error('Error loading cashier profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      setUploadingProfilePic(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        
        try {
          // Save to Supabase
          const { error } = await supabase
            .from('users')
            .update({ 
              avatar_url: base64String,
              updated_at: new Date().toISOString()
            })
            .eq('auth_id', user.id)
            .eq('role', 'cashier');

          if (error) {
            console.error('❌ Error uploading avatar:', error);
            toast.error('Failed to upload profile picture');
            return;
          }
          
          console.log('✅ Avatar uploaded to database successfully');
          
          // Verify the update
          const { data: updatedData, error: fetchError } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('auth_id', user.id)
            .eq('role', 'cashier')
            .single();
          
          if (fetchError) {
            console.error('Error verifying upload:', fetchError);
          } else {
            console.log('Verified avatar_url in database:', updatedData?.avatar_url ? 'Image exists' : 'No image');
          }
          
          // Update local state immediately
          setProfilePicUrl(base64String);
          setCashierProfile(prev => ({ ...prev, avatar_url: base64String }));
          
          console.log('✅ Local state updated');
          toast.success('✅ Profile picture updated successfully!');
          
        } catch (error) {
          console.error('Error:', error);
          toast.error('Failed to upload profile picture');
        }
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleEdit = () => {
    setEditForm({...cashierProfile});
    setEditing(true);
  };

  const handleCancel = () => {
    setEditForm({...cashierProfile});
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          city: editForm.city,
          date_of_birth: editForm.dateOfBirth,
          gender: editForm.gender,
          shift: editForm.shift,
          emergency_contact: editForm.emergencyContact,
          emergency_phone: editForm.emergencyPhone,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', user.id)
        .eq('role', 'cashier');

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      console.log('✅ Profile updated successfully');
      setCashierProfile(editForm);
      setEditing(false);
      toast.success('✅ Profile updated successfully!');

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/cashier-auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const goToPOS = () => {
    navigate('/pos');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                💰
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Cashier Portal</h1>
                <p className="text-sm text-gray-600">Manage your profile & settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={goToPOS}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <FiShoppingCart className="w-5 h-5" />
                <span>Go to POS</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
              >
                <FiLogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
              <div className="text-center">
                {/* Profile Picture */}
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white overflow-hidden shadow-xl border-4 border-white">
                    {profilePicUrl || cashierProfile.avatar_url ? (
                      <img 
                        src={profilePicUrl || cashierProfile.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">{cashierProfile.avatar}</span>
                    )}
                  </div>
                  
                  {/* Upload Button Overlay */}
                  <label 
                    htmlFor="cashier-profile-pic-upload"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-700 transition-colors shadow-lg border-2 border-white"
                  >
                    {uploadingProfilePic ? (
                      <div className="animate-spin">⏳</div>
                    ) : (
                      <FiCamera className="text-white w-5 h-5" />
                    )}
                    <input
                      id="cashier-profile-pic-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      disabled={uploadingProfilePic}
                      className="hidden"
                    />
                  </label>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-1">{cashierProfile.name}</h2>
                <p className="text-gray-600 mb-2">@{cashierProfile.username}</p>
                
                {/* Status Badge */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-blue-100 mb-4">
                  {cashierProfile.isActive ? (
                    <>
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">Active</span>
                    </>
                  ) : (
                    <>
                      <FiClock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-700">Pending Approval</span>
                    </>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FiCalendar className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-600">Joined</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{cashierProfile.joinDate}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FiClock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-600">Shift</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 capitalize">{cashierProfile.shift}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FiAward className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-600">Experience</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{cashierProfile.tillExperience} months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <FiUser className="w-6 h-6 mr-2 text-green-600" />
                  Profile Information
                </h3>
                {!editing ? (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiSave className="w-4 h-4" />
                      <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center space-x-2"
                    >
                      <FiX className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{cashierProfile.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiMail className="w-4 h-4 mr-1" />
                    Email
                  </label>
                  <p className="text-gray-800">{cashierProfile.email}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiPhone className="w-4 h-4 mr-1" />
                    Phone
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.phone || 'Not provided'}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  {editing ? (
                    <select
                      name="gender"
                      value={editForm.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 capitalize">{cashierProfile.gender || 'Not provided'}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiCalendar className="w-4 h-4 mr-1" />
                    Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={editForm.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.dateOfBirth || 'Not provided'}</p>
                  )}
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiClock className="w-4 h-4 mr-1" />
                    Shift
                  </label>
                  {editing ? (
                    <select
                      name="shift"
                      value={editForm.shift}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 capitalize">{cashierProfile.shift}</p>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiMapPin className="w-4 h-4 mr-1" />
                    Address
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="address"
                      value={editForm.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.address || 'Not provided'}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.city || 'Not provided'}</p>
                  )}
                </div>

                {/* ID Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiShield className="w-4 h-4 mr-1" />
                    ID Number
                  </label>
                  <p className="text-gray-800">{cashierProfile.idNumber || 'Not provided'}</p>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="emergencyContact"
                      value={editForm.emergencyContact}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.emergencyContact || 'Not provided'}</p>
                  )}
                </div>

                {/* Emergency Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Phone
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={editForm.emergencyPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-gray-800">{cashierProfile.emergencyPhone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPortal;
