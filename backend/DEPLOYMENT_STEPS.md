# ✅ FINAL DEPLOYMENT GUIDE

## Step 1: Fix RLS Policies in Supabase ⚡ (IMPORTANT - DO THIS FIRST!)

1. Open Supabase: https://zwmupgbixextqlexknnu.supabase.co/project/default/sql/new
2. Copy & paste the SQL from `backend/FIX_RLS_POLICIES.sql`
3. Click **Run**
4. Verify all policies are created (should see 4 policies listed)

## Step 2: Add Admin RLS Policy (Simplified)

1. In the SQL editor, copy & paste from `backend/FIX_RLS_ADMIN_POLICY.sql`
2. Click **Run**
3. This removes the problematic recursive policy and keeps simple non-recursive policies

## Step 3: Create Admin RPC Functions

1. In the same SQL editor, copy & paste from `backend/CREATE_ADMIN_RPC_FUNCTIONS.sql`
2. Click **Run**
3. Verify both functions are created: `get_all_users_admin()` and `get_pending_users_admin()`

## Step 4: Create Legacy RPC Function (Optional Fallback)

1. In the same SQL editor, copy & paste from `backend/CREATE_PENDING_USERS_RPC.sql`
2. Click **Run** (this is a fallback function, not required if above work)

## Step 5: Fix Table Structure in Supabase

1. In the same SQL editor, copy & paste from `backend/FIX_TABLE_STRUCTURE.sql`
2. Click **Run**
3. Verify all columns appear in the output table

## Step 6: Remove Email Unique Constraint

In the same SQL editor, run:

```sql
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
```

## Step 7: Test Portals

Clear browser cache (Ctrl+Shift+R) then visit:

- Manager: http://localhost:5173/manager-auth
- Cashier: http://localhost:5173/cashier-auth  
- Supplier: http://localhost:5173/supplier-auth

**Expected behavior:**
- User authenticates
- Portal shows: "⏳ Pending admin approval" (because is_active = false)
- User cannot access portal until admin approves

## Step 8: Approve Users in Admin Portal

1. Login as admin: http://localhost:5173/admin-auth
   - Email: abanabaasa2@gmail.com
   - Password: Test123456

2. Go to Admin Dashboard → User Management
3. Find "aronnykevin@gmail.com" with roles: manager, cashier, supplier
4. Click "Approve" for each role
5. They can now access their portals

## ✨ Done!

All 4 portals (admin, manager, cashier, supplier) should now be fully functional!

---

## Troubleshooting

**If you see "infinite recursion detected in policy" error:**
- This was caused by a recursive RLS policy
- Solution: Run the updated `FIX_RLS_ADMIN_POLICY.sql` which removes the recursive policy
- The admin functions now use `SECURITY DEFINER` to bypass RLS instead

**If admin dashboard still shows 0 pending users:**
- Make sure you ran `CREATE_ADMIN_RPC_FUNCTIONS.sql` 
- Verify both functions exist: `get_all_users_admin()` and `get_pending_users_admin()`
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for RPC error messages

**If you see "row-level security policy" error:**
- Make sure you ran FIX_RLS_POLICIES.sql and FIX_RLS_ADMIN_POLICY.sql
- Verify policies are simple and non-recursive
- Hard refresh browser (Ctrl+Shift+R)

**If you still see "column does not exist" errors:**
- Make sure you ran FIX_TABLE_STRUCTURE.sql
- Verify all columns appear in the final SELECT output
- Hard refresh browser (Ctrl+Shift+R)

**If user still redirects to signin:**
- Check browser console for error messages
- Make sure is_active = true after admin approval
- Check that auth_id is linked correctly (run: `select id, email, role, auth_id from users;` in Supabase)
- Verify RLS policies are correctly created
