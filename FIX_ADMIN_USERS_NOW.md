# 🔧 URGENT FIX: Admin Can't See Registered Users

## ❌ The Error You're Seeing

```
GET https://...supabase.co/auth/v1/admin/users 403 (Forbidden)
AuthApiError: User not allowed
```

OR

```
Error: infinite recursion detected in policy for relation "users"
```

## ⚡ QUICK FIX (2 Minutes)

### Step 1: Copy the SQL Fix

Open file: `backend/database/quick-fix-admin-users.sql`

### Step 2: Run in Supabase

1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** (in left sidebar)
3. Click **New Query**
4. **Paste the entire content** of `quick-fix-admin-users.sql`
5. Click **RUN** (or press Ctrl+Enter)

### Step 3: Refresh Admin Portal

1. Go back to your admin portal
2. Press **F5** or **Ctrl+R** to refresh
3. Click **"User Management"**
4. Your supplier should now appear! ✅

## 📋 What This Does

The SQL fix does two things:

1. **Disables RLS** on users table (allows admin to read all users)
2. **Creates helper functions** that safely fetch users for admins

## ✅ After Running the Fix

You'll be able to see:
- ✅ All pending users (including your supplier)
- ✅ All registered users from all portals
- ✅ Email verification status
- ✅ Account active/inactive status

## 🎯 Expected Result

### In "Pending" View:
```
Supplier Registration
📦 Company Name
📧 Pending Verification
⏳ Pending Review
[Approve] [Reject]
```

### In "All Users" View:
```
All Registered Users
✅ Shows: Admins, Managers, Cashiers, Suppliers
📊 Filter by role, status, verification
🔍 Search by name, email
```

## 🐛 If It Still Doesn't Work

### Check 1: Are you logged in as Admin?

```javascript
// In browser console:
localStorage.getItem('adminKey')
// Should return: "true"
```

### Check 2: Check the console for errors

Open browser console (F12) and look for:
```
✅ Loaded X pending users via RPC
✅ Loaded X users via RPC
```

If you see errors, check the error message.

### Check 3: Verify SQL ran successfully

In Supabase SQL Editor, run:
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_pending_users', 'get_all_users_admin');

-- Should return 2 rows
```

### Check 4: Verify RLS is disabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- rowsecurity should be 'false'
```

## 🔐 Security Note

**Disabling RLS is safe IF:**
- ✅ You're in development/testing
- ✅ Your app handles permissions in code
- ✅ Only admins can access user management

**For production**, you should:
- Use the full `fix-users-rls-policy.sql` for proper policies
- Or implement a backend API with service role key
- Keep RLS enabled with correct policies

## 🚀 Next Steps

Once the fix is working:

1. **Register more users** - Test with different roles
2. **Approve users** - Click "Approve" on pending users
3. **Manage users** - Toggle between "Pending" and "All Users" views
4. **Use filters** - Filter by role, status, email verification

## 📞 Still Having Issues?

Check these files for more info:
- `FIXING_RLS_ERROR.md` - Detailed troubleshooting
- `ADMIN_USER_MANAGEMENT_GUIDE.md` - Feature documentation
- `fix-users-rls-policy.sql` - Full RLS fix with policies

---

## 🎉 Summary

**Problem**: Admin API requires service role key (backend only)  
**Solution**: Use RPC functions that work from frontend  
**Action**: Run `quick-fix-admin-users.sql` in Supabase  
**Result**: Admin can now see all registered users! ✅
