# 🚀 QUICK START: Deploy User Management & Role Assignment

**Status:** ✅ Ready to Deploy  
**Last Updated:** April 30, 2026

---

## 📦 Files Created

I've created everything you need to search users and assign roles (manager/cashier/supplier):

| File | Purpose | Location |
|------|---------|----------|
| **COMPLETE_USER_MANAGEMENT_SETUP.sql** | All SQL functions in one file (paste into Supabase) | `/backend/` |
| **SQL_USER_MANAGEMENT_COMPLETE_GUIDE.md** | Complete reference guide | `/backend/` |
| **userManagementService.js** | React functions to call SQL functions | `/frontend/src/services/` |

---

## 🎯 STEP 1: Run SQL Setup (One Time)

### ✅ What It Does:
- Creates admin users (if not already created)
- Deploys 6 RPC functions for searching users
- Deploys 2 RPC functions for assigning roles
- Tests everything

### 📋 How to Run:

1. Go to Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql/new

2. Copy ALL contents of: `COMPLETE_USER_MANAGEMENT_SETUP.sql`

3. Paste into Supabase SQL Editor

4. Click **Run** 

5. ✅ Verify success:
   - Look for message: "Functions Created Successfully ✅"
   - Check function count (should be 6)

---

## 🎯 STEP 2: Import Frontend Service

### ✅ What It Does:
- Provides React functions to call your SQL functions
- Handles errors and validation
- Includes example components (PendingUsersList, SearchUsers)

### 📋 How to Use:

```javascript
// In your React component
import userMgmt from '@/services/userManagementService';

// Get pending users
const pending = await userMgmt.getPendingUsers();

// Assign role by email
const result = await userMgmt.assignUserRoleByEmail(
  'user@example.com',
  'manager'  // or 'cashier' or 'supplier'
);

if (result.success) {
  console.log('✅ User assigned as:', result.role);
}
```

---

## 🔧 AVAILABLE FUNCTIONS

### **Search Functions**

| Function | Purpose | Returns |
|----------|---------|---------|
| `getPendingUsers()` | Get users awaiting approval | Array of inactive users |
| `getActiveUsers()` | Get approved users | Array of active users |
| `getAllUsers()` | Get everyone | Array of all users |
| `getInactiveUsers()` | Get unapproved users | Array of inactive users |

### **Assignment Functions**

| Function | Purpose | Returns |
|----------|---------|---------|
| `assignUserRoleByEmail(email, role)` | Assign role & activate by email | `{ success, role, message }` |
| `approveUser(userId, role)` | Approve & assign role by UUID | `{ success, role, message }` |

---

## 📊 User Flow (How It Works)

```
1. User signs up with Google
   ↓
2. User record created with is_active = FALSE
   ↓
3. Admin searches pending users
   ↓
4. Admin selects user and assigns role (manager/cashier/supplier)
   ↓
5. Function updates: role = 'manager', is_active = TRUE
   ↓
6. User can now access their portal
```

---

## 🖥️ Example: Build Admin Dashboard

```jsx
import React from 'react';
import userMgmt from '@/services/userManagementService';

export default function AdminDashboard() {
  const [pending, setPending] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await userMgmt.getPendingUsers();
      setPending(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const assignRole = async (email, role) => {
    try {
      const result = await userMgmt.assignUserRoleByEmail(email, role);
      if (result.success) {
        alert(`✅ ${email} assigned as ${role}`);
        loadPending(); // Refresh
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>👥 User Management ({pending.length} pending)</h1>
      
      {pending.map(user => (
        <div key={user.id} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px' }}>
          <p><strong>{user.email}</strong></p>
          <p>{user.full_name}</p>
          
          <button onClick={() => assignRole(user.email, 'manager')}>
            👤 Manager
          </button>
          <button onClick={() => assignRole(user.email, 'cashier')}>
            💳 Cashier
          </button>
          <button onClick={() => assignRole(user.email, 'supplier')}>
            📦 Supplier
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔐 Security Notes

✅ **Already Implemented:**
- Admin check: Only admins can search all users
- Role validation: Only 'manager', 'cashier', 'supplier' allowed
- RLS bypass: Functions use SECURITY DEFINER (admin-only operations)
- Email case-insensitive search

⚠️ **Best Practices:**
- Only admins should access admin dashboard
- Wrap admin dashboard in `<AdminOnly>` component
- Check `is_active === true` before allowing access to portals

---

## 🐛 Troubleshooting

### "Function not found" error?
- ❌ SQL hasn't been run yet
- ✅ Run `COMPLETE_USER_MANAGEMENT_SETUP.sql` in Supabase

### "Only active admins can call this function"?
- ❌ Current user doesn't have admin role
- ✅ Make sure logged-in user has `role = 'admin'` in users table

### "User not found" error?
- ❌ Email doesn't exist in users table
- ✅ User must sign up first before you can assign role

### Import error in frontend?
- ❌ Path doesn't match your project structure
- ✅ Adjust path: `import userMgmt from '@/services/userManagementService'`

---

## 📝 SQL Reference

### Manual SQL (no functions):
```sql
-- Find pending users
SELECT email, role, is_active FROM public.users 
WHERE is_active = FALSE
ORDER BY created_at DESC;

-- Find user by email
SELECT * FROM public.users 
WHERE LOWER(email) = LOWER('user@example.com');

-- Assign role manually
UPDATE public.users 
SET role = 'manager', is_active = TRUE, updated_at = NOW()
WHERE LOWER(email) = LOWER('user@example.com');
```

### Via RPC:
```javascript
// Get pending users
const { data } = await supabase.rpc('get_pending_users');

// Assign role
const { data } = await supabase.rpc('assign_user_role_by_email', {
  p_email: 'user@example.com',
  p_role: 'manager'
});
```

---

## ✅ CHECKLIST

Before going live:

- [ ] Run `COMPLETE_USER_MANAGEMENT_SETUP.sql` in Supabase
- [ ] Verify functions exist in Supabase (check Functions list)
- [ ] Copy `userManagementService.js` to frontend
- [ ] Build admin dashboard component
- [ ] Test: Create new user → Search pending → Assign role → User activated
- [ ] Test: Email search (case-insensitive)
- [ ] Test: Invalid role rejection
- [ ] Add admin-only access check to dashboard
- [ ] Deploy to production

---

## 🚀 Ready?

1. **Copy SQL** → Paste into Supabase → Run
2. **Copy Service** → Add to frontend
3. **Build Dashboard** → Use example code above
4. **Test** → Create user, search, assign role
5. **Deploy** → Push to production

---

## 📞 Support

Files for reference:
- `SQL_USER_MANAGEMENT_COMPLETE_GUIDE.md` - Full SQL reference
- `COMPLETE_USER_MANAGEMENT_SETUP.sql` - All SQL code to deploy
- `userManagementService.js` - All JavaScript/React code

