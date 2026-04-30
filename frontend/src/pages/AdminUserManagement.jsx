import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  FiSearch, FiCheckCircle, FiAlertCircle, FiUser,
  FiBriefcase, FiShoppingCart, FiPackage, FiLoader
} from 'react-icons/fi';

/**
 * Admin User Management Component
 * - Search users by name or email
 * - Assign roles: manager, cashier, supplier
 * - Shows pending/active users
 */

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load all users from Supabase on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      // Search via RPC when user types
      console.log('🔍 Searching for:', searchQuery);
      searchUsers(searchQuery);
    } else {
      // Show all users when search is empty
      console.log('📋 Loading all users');
      loadAllUsers();
    }
  }, [searchQuery]);

  /**
   * Load all users from Supabase (no search filter)
   */
  const loadAllUsers = async () => {
    setLoading(true);
    try {
      console.log('📡 Calling: get_all_auth_users');
      const { data, error } = await supabase.rpc('get_all_auth_users');

      if (error) {
        setMessage({ type: 'error', text: `Error loading users: ${error.message}` });
        console.error('❌ Load users error:', error);
        return;
      }

      console.log(`✅ Loaded ${data?.length || 0} users from get_all_auth_users`);
      setUsers(data || []);
      setFilteredUsers(data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search users from Supabase
   */
  const searchUsers = async (query) => {
    setLoading(true);
    try {
      console.log('📡 Calling: search_auth_users with query:', query);
      const { data, error } = await supabase.rpc('search_auth_users', {
        p_search_query: query
      });

      if (error) {
        setMessage({ type: 'error', text: `Error searching users: ${error.message}` });
        console.error('❌ Search error:', error);
        return;
      }

      console.log(`✅ Found ${data?.length || 0} users matching: ${query}`);
      setUsers(data || []);
      setFilteredUsers(data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all users from Supabase (called on mount)
   */
  const loadUsers = async () => {
    loadAllUsers();

  /**
   * Assign role to user
   */
  const handleAssignRole = async (user) => {
    const role = selectedRoles[user.id];
    
    if (!role) {
      setMessage({ type: 'error', text: 'Please select a role' });
      return;
    }

    setAssigning({ ...assigning, [user.id]: true });

    try {
      let data, error;

      // Check if user has profile
      if (!user.has_profile) {
        // Create profile for auth user
        const { data: createData, error: createError } = await supabase.rpc(
          'create_user_profile_from_auth',
          {
            p_auth_id: user.id,
            p_role: role
          }
        );
        
        if (createError) throw createError;
        data = createData;
        error = null;
      } else {
        // Assign role to existing user
        const { data: assignData, error: assignError } = await supabase.rpc(
          'assign_user_role_by_email',
          {
            p_email: user.email,
            p_role: role
          }
        );
        
        if (assignError) throw assignError;
        data = assignData;
        error = assignError;
      }

      if (error) throw error;

      if (data && data.success) {
        setMessage({
          type: 'success',
          text: `✅ ${user.email} assigned as ${role}`
        });
        setSelectedRoles({ ...selectedRoles, [user.id]: '' });
        setTimeout(() => loadUsers(), 1000);
      } else if (data && !data.success) {
        setMessage({ type: 'error', text: `❌ ${data.error || 'Failed to assign role'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setAssigning({ ...assigning, [user.id]: false });
    }
  };

  /**
   * Get role icon and color
   */
  const getRoleIcon = (role) => {
    switch (role) {
      case 'manager':
        return <FiBriefcase className="text-blue-500" />;
      case 'cashier':
        return <FiShoppingCart className="text-green-500" />;
      case 'supplier':
        return <FiPackage className="text-orange-500" />;
      default:
        return <FiUser className="text-gray-500" />;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
          👥 User Management
        </h1>
        <p style={{ color: '#666' }}>Search Supabase users and assign roles</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {message.text}
        </div>
      )}

      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Box */}
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <FiSearch
            style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
              color: '#999'
            }}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 38px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => {
            setSearchQuery('');
            loadAllUsers();
          }}
          disabled={loading}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#6c757d',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? <FiLoader className="spin" /> : '🔄 Refresh'}
        </button>
      </div>

      {/* Users Count */}
      <div style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
        Found: <strong>{filteredUsers.length}</strong> Supabase user(s)
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FiLoader style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }} />
          <p>Loading users...</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && filteredUsers.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Phone</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Current Role</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Verification</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Has Profile</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Assign Role</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                  }}
                >
                  {/* Email */}
                  <td style={{ padding: '15px', fontSize: '14px' }}>
                    <strong>{user.email}</strong>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '15px', fontSize: '14px' }}>
                    {user.full_name || 'N/A'}
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '15px', fontSize: '14px' }}>
                    {user.phone || 'N/A'}
                  </td>

                  {/* Current Role */}
                  <td style={{ padding: '15px' }}>
                    {user.role ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: user.role === 'manager' ? '#e3f2fd' :
                          user.role === 'cashier' ? '#e8f5e9' :
                          user.role === 'supplier' ? '#fff3e0' : '#f5f5f5',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: user.role === 'manager' ? '#1976d2' :
                          user.role === 'cashier' ? '#388e3c' :
                          user.role === 'supplier' ? '#f57c00' : '#666'
                      }}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>None</span>
                    )}
                  </td>

                  {/* Verification Status */}
                  <td style={{ padding: '15px' }}>
                    {user.email_verified ? (
                      <span style={{ color: '#28a745', fontWeight: 'bold', backgroundColor: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' }}>✅ Verified</span>
                    ) : (
                      <span style={{ color: '#ff9800', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '4px 8px', borderRadius: '4px' }}>⏳ Pending</span>
                    )}
                  </td>

                  {/* Has Profile */}
                  <td style={{ padding: '15px' }}>
                    {user.has_profile ? (
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Yes</span>
                    ) : (
                      <span style={{ color: '#ff9800', fontWeight: 'bold' }}>❌ No</span>
                    )}
                  </td>

                  {/* Assign Role Dropdown */}
                  <td style={{ padding: '15px' }}>
                    <select
                      value={selectedRoles[user.id] || ''}
                      onChange={(e) =>
                        setSelectedRoles({
                          ...selectedRoles,
                          [user.id]: e.target.value
                        })
                      }
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select Role --</option>
                      <option value="manager">👤 Manager</option>
                      <option value="cashier">💳 Cashier</option>
                      <option value="supplier">📦 Supplier</option>
                      <option value="admin">🔐 Admin</option>
                      <option value="user">👥 User</option>
                    </select>
                  </td>

                  {/* Assign Button */}
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleAssignRole(user)}
                      disabled={
                        !selectedRoles[user.id] ||
                        assigning[user.id]
                      }
                      style={{
                        padding: '8px 16px',
                        backgroundColor: selectedRoles[user.id] ? '#28a745' : '#e9ecef',
                        color: selectedRoles[user.id] ? '#fff' : '#999',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: selectedRoles[user.id] ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        opacity: assigning[user.id] ? 0.6 : 1
                      }}
                    >
                      {assigning[user.id] ? (
                        <>
                          <FiLoader style={{ marginRight: '5px' }} /> Assigning...
                        </>
                      ) : (
                        '✓ Assign'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && filteredUsers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          color: '#666'
        }}>
          <p style={{ fontSize: '16px' }}>
            {searchQuery ? '❌ No users found matching your search' : '✅ No pending users'}
          </p>
        </div>
      ) : null}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
