import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FiSearch } from 'react-icons/fi';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        loadAllUsers();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_auth_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_auth_users', { p_search_query: query });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (user) => {
    const role = selectedRoles[user.id];
    if (!role) {
      setMessage('Select a role');
      return;
    }

    setAssigning({ ...assigning, [user.id]: true });
    try {
      let result;
      if (!user.has_profile) {
        const { data, error } = await supabase.rpc('create_user_profile_from_auth', {
          p_auth_id: user.id,
          p_role: role
        });
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.rpc('assign_user_role_by_email', {
          p_email: user.email,
          p_role: role
        });
        if (error) throw error;
        result = data;
      }

      if (result && result.success) {
        setMessage(`✓ ${user.email} assigned as ${role}`);
        setSelectedRoles({ ...selectedRoles, [user.id]: '' });
        setTimeout(() => {
          setMessage('');
          loadAllUsers();
        }, 1000);
      } else {
        setMessage(result?.error || 'Failed');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAssigning({ ...assigning, [user.id]: false });
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '30px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>User Management</h1>

      {/* Message */}
      {message && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '18px',
          borderRadius: '5px',
          backgroundColor: message.includes('✓') ? '#e8f5e9' : '#ffebee',
          color: message.includes('✓') ? '#2e7d32' : '#c62828',
          fontSize: '13px'
        }}>
          {message}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <FiSearch style={{ position: 'absolute', left: '12px', top: '10px', color: '#999', fontSize: '16px' }} />
        <input
          type="text"
          placeholder="Search email, name, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 38px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Count */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        {users.length} users
      </div>

      {/* Loading */}
      {loading && <div style={{ color: '#999', fontSize: '13px' }}>Loading...</div>}

      {/* Empty */}
      {!loading && users.length === 0 && <div style={{ color: '#999', fontSize: '13px' }}>No users</div>}

      {/* Users */}
      {!loading && users.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                padding: '12px 14px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '13px'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '500', marginBottom: '2px' }}>{user.email}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>
                  {user.full_name || 'No name'}
                  {user.phone && ` · ${user.phone}`}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: user.role ? '#6366f1' : '#999', fontWeight: '500', minWidth: '60px', textAlign: 'center' }}>
                {user.role ? user.role.toUpperCase() : 'NONE'}
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <select
                  value={selectedRoles[user.id] || ''}
                  onChange={(e) => setSelectedRoles({ ...selectedRoles, [user.id]: e.target.value })}
                  style={{
                    padding: '5px 6px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Role</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="supplier">Supplier</option>
                </select>
                <button
                  onClick={() => handleAssignRole(user)}
                  disabled={!selectedRoles[user.id] || assigning[user.id]}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    borderRadius: '3px',
                    backgroundColor: selectedRoles[user.id] ? '#6366f1' : '#ddd',
                    color: selectedRoles[user.id] ? '#fff' : '#999',
                    cursor: selectedRoles[user.id] ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                >
                  {assigning[user.id] ? '...' : 'Set'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
