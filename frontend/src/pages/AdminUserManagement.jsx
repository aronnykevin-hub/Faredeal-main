import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { FiSearch } from 'react-icons/fi';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [message, setMessage] = useState('');
  const { isDarkMode } = useTheme();

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
    <div style={{
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      padding: 'clamp(16px, 5vw, 40px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <style>{`
        @media (max-width: 768px) {
          input, select, button { font-size: 16px !important; }
        }
      `}</style>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(24px, 6vw, 32px)' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            fontWeight: '700',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            User Management
          </h1>
          <p style={{
            fontSize: 'clamp(12px, 2vw, 14px)',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            margin: 0
          }}>
            Search, view, and assign roles to users
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div style={{
            padding: 'clamp(10px, 3vw, 14px)',
            marginBottom: 'clamp(16px, 4vw, 20px)',
            borderRadius: '8px',
            backgroundColor: message.includes('✓')
              ? isDarkMode ? '#064e3b' : '#ecfdf5'
              : isDarkMode ? '#7f1d1d' : '#fef2f2',
            color: message.includes('✓')
              ? isDarkMode ? '#86efac' : '#059669'
              : isDarkMode ? '#fca5a5' : '#dc2626',
            fontSize: 'clamp(12px, 2vw, 14px)',
            border: `1px solid ${message.includes('✓')
              ? isDarkMode ? '#166534' : '#bbf7d0'
              : isDarkMode ? '#991b1b' : '#fecaca'}`,
            animation: 'slideDown 0.3s ease-out'
          }}>
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {message}
          </div>
        )}

        {/* Search Box */}
        <div style={{
          marginBottom: 'clamp(20px, 5vw, 28px)',
          position: 'relative'
        }}>
          <FiSearch style={{
            position: 'absolute',
            left: 'clamp(12px, 3vw, 16px)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: isDarkMode ? '#64748b' : '#cbd5e1',
            fontSize: 'clamp(16px, 3vw, 18px)',
            zIndex: 1
          }} />
          <input
            type="text"
            placeholder="Search by email, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'clamp(10px, 3vw, 12px) clamp(38px, 8vw, 44px)',
              border: `1.5px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              backgroundColor: isDarkMode ? '#1e293b' : '#fff',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              fontSize: 'clamp(13px, 2vw, 14px)',
              boxSizing: 'border-box',
              transition: 'all 0.2s',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = isDarkMode
                ? '0 0 0 3px rgba(99, 102, 241, 0.1)'
                : '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isDarkMode ? '#334155' : '#e2e8f0';
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 'clamp(10px, 3vw, 14px)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDarkMode ? '#94a3b8' : '#cbd5e1',
                fontSize: 'clamp(18px, 4vw, 24px)',
                padding: '4px 8px',
                transition: 'color 0.2s',
                zIndex: 2
              }}
              onMouseEnter={(e) => {
                e.target.style.color = isDarkMode ? '#e2e8f0' : '#64748b';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = isDarkMode ? '#94a3b8' : '#cbd5e1';
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{
          padding: 'clamp(12px, 3vw, 16px)',
          marginBottom: 'clamp(16px, 4vw, 24px)',
          backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
          borderRadius: '6px',
          fontSize: 'clamp(12px, 2vw, 13px)',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
        }}>
          <strong style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>{users.length}</strong> {users.length === 1 ? 'user' : 'users'} found
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: 'clamp(32px, 10vw, 48px)',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: 'clamp(13px, 2vw, 14px)'
          }}>
            <div style={{ display: 'inline-block', marginBottom: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                borderTop: '3px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            </div>
            <div>Loading users...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'clamp(48px, 15vw, 64px) clamp(20px, 5vw, 32px)',
            color: isDarkMode ? '#94a3b8' : '#94a3b8',
            fontSize: 'clamp(13px, 2vw, 14px)'
          }}>
            <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', marginBottom: '12px' }}>📭</div>
            <div>No users found</div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 2vw, 13px)',
                  fontWeight: '500'
                }}
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Users Grid */}
        {!loading && users.length > 0 && (
          <div style={{
            display: 'grid',
            gap: 'clamp(10px, 3vw, 16px)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
            '@media (max-width: 640px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  padding: 'clamp(14px, 4vw, 18px)',
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  border: `1.5px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(10px, 3vw, 14px)',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#cbd5e1';
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 4px 12px rgba(0,0,0,0.2)'
                    : '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? '#334155' : '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }}
              >
                {/* User Info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    marginBottom: '6px',
                    wordBreak: 'break-word',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {user.email}
                  </div>
                  <div style={{
                    fontSize: 'clamp(11px, 1.8vw, 12px)',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    <div>👤 {user.full_name || '(No name)'}</div>
                    {user.phone && <div>📞 {user.phone}</div>}
                  </div>
                </div>

                {/* Current Role */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 'clamp(8px, 2vw, 10px)',
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  fontSize: 'clamp(11px, 1.8vw, 12px)',
                  fontWeight: '600'
                }}>
                  <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Current:</span>
                  <span style={{
                    padding: '3px 8px',
                    backgroundColor: user.role ? '#6366f1' : isDarkMode ? '#334155' : '#e2e8f0',
                    color: user.role ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b',
                    borderRadius: '4px'
                  }}>
                    {user.role ? user.role.toUpperCase() : 'NONE'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 'clamp(8px, 2vw, 10px)',
                  alignItems: 'stretch'
                }}>
                  <select
                    value={selectedRoles[user.id] || ''}
                    onChange={(e) => setSelectedRoles({ ...selectedRoles, [user.id]: e.target.value })}
                    style={{
                      padding: 'clamp(7px, 2vw, 9px) clamp(8px, 2vw, 10px)',
                      border: `1.5px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                      color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      fontSize: 'clamp(12px, 2vw, 13px)',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = isDarkMode
                        ? '0 0 0 3px rgba(99, 102, 241, 0.1)'
                        : '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#334155' : '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select role</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                    <option value="supplier">Supplier</option>
                  </select>
                  <button
                    onClick={() => handleAssignRole(user)}
                    disabled={!selectedRoles[user.id] || assigning[user.id]}
                    style={{
                      padding: 'clamp(7px, 2vw, 9px) clamp(12px, 3vw, 16px)',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: selectedRoles[user.id]
                        ? '#6366f1'
                        : isDarkMode ? '#334155' : '#e2e8f0',
                      color: selectedRoles[user.id]
                        ? '#fff'
                        : isDarkMode ? '#94a3b8' : '#94a3b8',
                      cursor: selectedRoles[user.id] && !assigning[user.id] ? 'pointer' : 'not-allowed',
                      fontSize: 'clamp(11px, 1.8vw, 12px)',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      opacity: assigning[user.id] ? 0.7 : 1,
                      boxShadow: selectedRoles[user.id]
                        ? '0 2px 8px rgba(99, 102, 241, 0.3)'
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRoles[user.id] && !assigning[user.id]) {
                        e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRoles[user.id] && !assigning[user.id]) {
                        e.target.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {assigning[user.id] ? (
                      <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>⏳</span>
                    ) : (
                      'Assign'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
