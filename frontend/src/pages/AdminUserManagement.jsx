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
      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('get_all_auth_users');
        if (!error && data) {
          setUsers(data || []);
          console.log(`✅ Loaded ${data.length} users via get_all_auth_users RPC`);
          return;
        }
      } catch (rpcErr) {
        console.warn('⚠️ RPC not available, using direct query');
      }

      // Fallback: Direct query from users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        setMessage('Error loading users: ' + error.message);
        console.error('Query error:', error);
      } else {
        setUsers(data || []);
        console.log(`✅ Loaded ${(data || []).length} users via direct query`);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    setLoading(true);
    try {
      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('search_auth_users', { p_search_query: query });
        if (!error && data) {
          setUsers(data || []);
          console.log(`✅ Found ${data.length} users via search RPC`);
          return;
        }
      } catch (rpcErr) {
        console.warn('⚠️ Search RPC not available, using direct query');
      }

      // Fallback: Client-side search on users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        setMessage('Error searching users: ' + error.message);
        console.error('Query error:', error);
        return;
      }

      // Filter results on client side
      const searchLower = query.toLowerCase();
      const filtered = (data || []).filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower)
      );

      setUsers(filtered);
      console.log(`✅ Found ${filtered.length} users via client-side search`);
    } catch (error) {
      setMessage('Error: ' + error.message);
      console.error('Unexpected error:', error);
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
      console.log(`🔧 Assigning ${user.email} as ${role}...`);

      // Direct update using Supabase table operations (no RPC needed)
      const { data, error } = await supabase
        .from('users')
        .update({
          role: role,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`✅ Role assigned successfully: ${user.email} → ${role}`);
        setMessage(`✓ ${user.email} assigned as ${role}`);
        setSelectedRoles({ ...selectedRoles, [user.id]: '' });
        
        // Reload users to show updated role
        setTimeout(() => {
          setMessage('');
          loadAllUsers();
        }, 1000);
      } else {
        console.warn('⚠️ Update returned no data');
        setMessage('Failed to update user');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      setMessage(`Error: ${error.message}`);
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
