// ═══════════════════════════════════════════════════════════════════════════
// FRONTEND: User Management Integration Guide
// Use these functions to search users and assign roles from your React app
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './services/supabase'; // Your Supabase client

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all pending users (awaiting approval)
 * Returns: Array of users with is_active = false
 */
export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('get_pending_users');
    
    if (error) throw error;
    
    console.log(`📋 Found ${data.length} pending users`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching pending users:', error);
    throw error;
  }
};

/**
 * Get all active users (already approved)
 * Note: Requires admin role
 * Returns: Array of users with is_active = true
 */
export const getActiveUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('get_active_users_admin');
    
    if (error) throw error;
    
    console.log(`✅ Found ${data.length} active users`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching active users:', error);
    throw error;
  }
};

/**
 * Get all users (both active and inactive)
 * Note: Requires admin role
 * Returns: Array of all users
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('get_all_users_admin');
    
    if (error) throw error;
    
    console.log(`👥 Found ${data.length} total users`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching all users:', error);
    throw error;
  }
};

/**
 * Get inactive/pending users (awaiting approval)
 * Note: Requires admin role
 * Returns: Array of users with is_active = false
 */
export const getInactiveUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('get_inactive_users_admin');
    
    if (error) throw error;
    
    console.log(`⏳ Found ${data.length} inactive users`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching inactive users:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH USERS FUNCTIONS - Search all Supabase auth users
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search across Supabase auth.users table by email or name
 * Shows all signed-up users whether they have profiles or not
 * 
 * @param {string} searchQuery - Email or name to search for (supports partial matches)
 * @returns {Array} Users with has_profile boolean indicating if they have a profile
 * 
 * Example:
 * const users = await searchAuthUsers('john');
 */
export const searchAuthUsers = async (searchQuery) => {
  try {
    if (!searchQuery || searchQuery.trim() === '') {
      return await getAllAuthUsers();
    }

    console.log(`🔍 Searching auth users for: "${searchQuery}"`);

    const { data, error } = await supabase.rpc('search_auth_users', {
      p_search_query: searchQuery
    });

    if (error) throw error;

    console.log(`✅ Found ${data.length} auth users matching "${searchQuery}"`);
    return data;
  } catch (error) {
    console.error('❌ Error searching auth users:', error);
    throw error;
  }
};

/**
 * Get all Supabase auth users (signed-up users)
 * Returns all users from auth.users with profile info
 * 
 * @returns {Array} All auth users with has_profile flag
 * 
 * Example:
 * const allAuthUsers = await getAllAuthUsers();
 */
export const getAllAuthUsers = async () => {
  try {
    console.log(`📡 Fetching all auth users...`);

    const { data, error } = await supabase.rpc('get_all_auth_users');

    if (error) throw error;

    console.log(`✅ Found ${data.length} auth users`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching all auth users:', error);
    throw error;
  }
};

/**
 * Get auth users without profiles in public.users
 * Returns newly signed-up users who don't have profiles yet
 * 
 * @returns {Array} Auth users without profiles
 * 
 * Example:
 * const newUsers = await getAuthUsersWithoutProfiles();
 */
export const getAuthUsersWithoutProfiles = async () => {
  try {
    console.log(`🆕 Fetching auth users without profiles...`);

    const { data, error } = await supabase.rpc('get_auth_users_without_profiles');

    if (error) throw error;

    console.log(`✅ Found ${data.length} users without profiles`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching users without profiles:', error);
    throw error;
  }
};

/**
 * Create a profile for auth user and assign role
 * Use this when an auth user (signed-up) doesn't have a profile yet
 * 
 * @param {string} authId - Auth user UUID (from auth.users)
 * @param {string} role - Role to assign: any string value (manager, cashier, supplier, admin, user, etc.)
 * @returns {Object} { success: boolean, message: string, role: string, ... }
 * 
 * Example:
 * const result = await createUserProfileFromAuth('8bb38779-2aaf-4510-b6b6-65d1efa69af7', 'cashier');
 */
export const createUserProfileFromAuth = async (authId, role) => {
  try {
    if (!authId || !role) {
      throw new Error('Auth ID and role are required');
    }

    console.log(`🆕 Creating profile for auth user ${authId} with role ${role}...`);

    const { data, error } = await supabase.rpc('create_user_profile_from_auth', {
      p_auth_id: authId,
      p_role: role
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to create profile');
    }

    console.log(`✅ Profile created for ${authId} as ${role}`);
    return data;
  } catch (error) {
    console.error('❌ Error creating profile:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign role to user by email
 * 
 * @param {string} email - User email address
 * @param {string} role - Role to assign: 'manager', 'cashier', or 'supplier'
 * @returns {Object} { success: boolean, message: string, role: string, ... }
 * 
 * Example:
 * const result = await assignUserRoleByEmail('john@example.com', 'manager');
 */
export const assignUserRoleByEmail = async (email, role) => {
  try {
    if (!email || !role) {
      throw new Error('Email and role are required');
    }

    if (!['manager', 'cashier', 'supplier'].includes(role)) {
      throw new Error('Role must be: manager, cashier, or supplier');
    }

    console.log(`🔄 Assigning ${role} role to ${email}...`);

    const { data, error } = await supabase.rpc('assign_user_role_by_email', {
      p_email: email,
      p_role: role
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to assign role');
    }

    console.log(`✅ ${email} assigned as ${role}`);
    return data;

  } catch (error) {
    console.error('❌ Error assigning role:', error);
    throw error;
  }
};

/**
 * Approve user and optionally change role by UUID
 * 
 * @param {string} userId - User UUID from database
 * @param {string} role - Role to assign (optional): 'manager', 'cashier', or 'supplier'
 * @returns {Object} { success: boolean, message: string, role: string, ... }
 * 
 * Examples:
 * const result = await approveUser('8bb38779-2aaf-4510-b6b6-65d1efa69af7', 'cashier');
 * const result = await approveUser('8bb38779-2aaf-4510-b6b6-65d1efa69af7'); // Just approve
 */
export const approveUser = async (userId, role = null) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (role && !['manager', 'cashier', 'supplier'].includes(role)) {
      throw new Error('Role must be: manager, cashier, or supplier');
    }

    console.log(`🔄 Approving user ${userId}${role ? ' as ' + role : ''}...`);

    const { data, error } = await supabase.rpc('approve_user_admin', {
      p_user_id: userId,
      p_role: role
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to approve user');
    }

    console.log(`✅ User approved as ${data.role}`);
    return data;

  } catch (error) {
    console.error('❌ Error approving user:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT COMPONENT EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AdminUserManagement.jsx - Complete Admin Dashboard Component
 */

// Example 1: Pending Users List Component
export function PendingUsersList() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState({});

  React.useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const data = await getPendingUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleAssignRole = async (email) => {
    const role = selectedRole[email];
    if (!role) return;

    try {
      const result = await assignUserRoleByEmail(email, role);
      if (result.success) {
        // Remove from list
        setUsers(users.filter(u => u.email !== email));
        setSelectedRole(prev => {
          const updated = { ...prev };
          delete updated[email];
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <p>Loading pending users...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>⏳ Pending Users ({users.length})</h2>
      
      {users.length === 0 ? (
        <p>✅ No pending users</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th>Email</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Assign Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{user.email}</td>
                <td>{user.full_name}</td>
                <td>{user.phone}</td>
                <td>
                  <select
                    value={selectedRole[user.email] || ''}
                    onChange={(e) => setSelectedRole(prev => ({
                      ...prev,
                      [user.email]: e.target.value
                    }))}
                  >
                    <option value="">-- Select Role --</option>
                    <option value="manager">👤 Manager</option>
                    <option value="cashier">💳 Cashier</option>
                    <option value="supplier">📦 Supplier</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleAssignRole(user.email)}
                    disabled={!selectedRole[user.email]}
                  >
                    Assign & Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Example 2: Search Users Component
export function SearchUsers() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [allUsers, setAllUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setAllUsers(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    const results = allUsers.filter(user =>
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
  };

  const handleQuickAssign = async (user, role) => {
    try {
      const result = await assignUserRoleByEmail(user.email, role);
      if (result.success) {
        alert(`✅ ${user.email} assigned as ${role}`);
        loadAllUsers(); // Refresh list
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Search & Manage Users</h2>

      <input
        type="text"
        placeholder="Search by email or name..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => loadAllUsers()}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      />

      {searchResults.length > 0 && (
        <div>
          <h3>Results ({searchResults.length})</h3>
          {searchResults.map((user) => (
            <div
              key={user.id}
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Name:</strong> {user.full_name}</p>
                  <p><strong>Role:</strong> {user.role || 'None'}</p>
                  <p><strong>Status:</strong> {user.is_active ? '✅ Active' : '⏳ Pending'}</p>
                </div>
                <div>
                  {!user.is_active ? (
                    <div>
                      <button onClick={() => handleQuickAssign(user, 'manager')} style={{ marginBottom: '5px' }}>
                        👤 Assign Manager
                      </button>
                      <button onClick={() => handleQuickAssign(user, 'cashier')} style={{ marginBottom: '5px' }}>
                        💳 Assign Cashier
                      </button>
                      <button onClick={() => handleQuickAssign(user, 'supplier')}>
                        📦 Assign Supplier
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: 'green' }}>✅ Already Approved</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap your calls with proper error handling
 */
async function safeAssignRole(email, role) {
  try {
    // Validate inputs
    if (!email || email.trim() === '') {
      throw new Error('Email cannot be empty');
    }
    if (!role || role.trim() === '') {
      throw new Error('Role must be selected');
    }
    if (!['manager', 'cashier', 'supplier'].includes(role)) {
      throw new Error('Invalid role: ' + role);
    }

    // Call function
    const result = await assignUserRoleByEmail(email, role);

    // Check result
    if (result.success) {
      console.log('✅ Success:', result.message);
      return { success: true, data: result };
    } else {
      console.error('❌ API Error:', result.error);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('❌ Exception:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/*
// 1. Get pending users
const pendingUsers = await getPendingUsers();
console.log(pendingUsers); // Array of 5 users awaiting approval

// 2. Assign manager role
const result = await assignUserRoleByEmail('john@example.com', 'manager');
if (result.success) {
  console.log('✅ John assigned as manager');
}

// 3. Get all active users
const activeUsers = await getActiveUsers();
console.log(`${activeUsers.length} active users`);

// 4. Search for specific user and assign role
const result = await assignUserRoleByEmail('supplier@farm.com', 'supplier');
console.log(result);
// Output: {
//   success: true,
//   message: 'User assigned successfully',
//   user_id: '8bb38779-2aaf-4510-b6b6-65d1efa69af7',
//   email: 'supplier@farm.com',
//   role: 'supplier',
//   is_active: true
// }

// 5. Error handling
try {
  await assignUserRoleByEmail('nonexistent@email.com', 'manager');
} catch (error) {
  console.error(error); // User not found for email: nonexistent@email.com
}
*/

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Search functions
  getPendingUsers,
  getActiveUsers,
  getAllUsers,
  getInactiveUsers,

  // Assignment functions
  assignUserRoleByEmail,
  approveUser,

  // Components
  PendingUsersList,
  SearchUsers,

  // Utilities
  safeAssignRole
};
