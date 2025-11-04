# 🔧 Fixing "Infinite Recursion in RLS Policy" Error

## 🐛 The Problem

When trying to view registered users in the Admin Portal, you see this error:

```
Error loading pending users: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "users"'
}
```

### Why This Happens

This error occurs when Row Level Security (RLS) policies on the `users` table create circular dependencies. Common causes:

1. **Policy references itself**: Policy checks `users` table while querying `users` table
2. **Circular joins**: Policy joins tables that reference back to `users`
3. **Complex nested queries**: Multiple subqueries that create loops

## ✅ Solutions (Choose One)

### Solution 1: Use Auth Admin API (Recommended - Already Implemented)

The admin portal now uses `supabase.auth.admin.listUsers()` which bypasses RLS entirely. This is the **preferred solution** and is already implemented in the code.

**Advantages:**
- ✅ No RLS issues
- ✅ Direct access to auth.users table
- ✅ Gets all user metadata
- ✅ Shows email verification status

**Requirements:**
- You need to use the **Service Role Key** (not Anon Key) in your admin context
- Make sure your Supabase environment variables are set correctly

### Solution 2: Fix RLS Policies (If you must use users table)

Run the SQL file `backend/database/fix-users-rls-policy.sql` in your Supabase SQL Editor.

**What it does:**
1. Drops problematic recursive policies
2. Creates simple, non-recursive policies
3. Adds helper functions that bypass RLS for admins
4. Re-enables RLS with safe policies

### Solution 3: Disable RLS (Quick Fix - Not Recommended for Production)

If you trust your application-level security:

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Only use this if:
- You handle all permissions in application code
- You're in development/testing
- You plan to implement proper RLS later

## 🚀 Quick Fix Steps

### Step 1: Check Your Environment Variables

Make sure you have the Service Role Key set:

```env
# frontend/.env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_role_key  # For admin operations
```

### Step 2: Update Supabase Client for Admin

If you haven't already, create an admin client:

```javascript
// frontend/src/services/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

### Step 3: Run the Fix SQL (Optional)

If you want to use the `users` table directly:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `backend/database/fix-users-rls-policy.sql`
3. Paste and click **"Run"**

### Step 4: Test the Admin Portal

1. Navigate to `/admin-portal`
2. Click on **"User Management"**
3. Toggle between **"Pending"** and **"All Users"** views
4. You should see all registered users without errors

## 📊 How It Works Now

### Current Implementation (In AdminPortal.jsx)

```javascript
// Loads users directly from auth.users table
const loadAllUsers = async () => {
  // Uses admin API - bypasses RLS
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    // Fallback to RPC function
    const { data } = await supabase.rpc('get_all_users_admin');
  }
  
  // Transform users with verification status
  const users = data.users.map(user => ({
    email_verified: !!user.email_confirmed_at,
    role: user.user_metadata.role,
    // ... other fields
  }));
};
```

### Pending Users

```javascript
// Shows users who haven't verified email
const loadPendingUsers = async () => {
  const { data } = await supabase.auth.admin.listUsers();
  
  // Filter unverified users
  const pending = data.users.filter(u => !u.email_confirmed_at);
};
```

## 🔍 Verification

### Check If Working

1. **Open Admin Portal**
2. **Click "User Management"**
3. **Check for these indicators:**
   - ✅ No error messages
   - ✅ User count shows in "All Users" badge
   - ✅ Can toggle between "Pending" and "All Users"
   - ✅ Users display with email verification status

### Debug Mode

Open browser console and check for:
```javascript
✅ Loaded X users from auth.admin API
✅ Loaded X pending users from auth
```

If you see these messages, it's working correctly!

## 🎯 What You Can Now See

### All Users View
- ✅ All registered users across all portals
- ✅ Email verification status (✅ Verified / ⏳ Pending)
- ✅ Account status (🟢 Active / ⚪ Inactive)
- ✅ User role (Admin, Manager, Cashier, Supplier)
- ✅ Last login time
- ✅ Registration date

### Pending View
- ✅ Users awaiting email verification
- ✅ Users awaiting admin approval
- ✅ Approve/Reject buttons

### Filters Available
- **By Role**: Admin, Manager, Cashier, Supplier
- **By Status**: Active, Inactive
- **By Verification**: Verified, Unverified
- **Search**: By name, email, or employee ID

## 🎉 Summary

**Problem**: RLS policy causing infinite recursion  
**Solution**: Use auth.admin API (already implemented)  
**Result**: Admin can now see all registered users with full details

No SQL changes needed if using the admin API! The system automatically:
1. Tries admin API first (recommended)
2. Falls back to RPC function if available
3. Falls back to direct query as last resort

Your admin portal is now fully functional! 🚀
