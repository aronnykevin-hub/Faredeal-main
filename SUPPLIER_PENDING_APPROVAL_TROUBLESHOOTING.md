# Supplier Pending Approval - Troubleshooting Guide

## Issue
Suppliers who apply are not showing up in the Admin Portal's "Pending Approvals" section.

## What Was Fixed

### 1. **Fixed React Hooks Error in AdminPortal.jsx**
- ❌ **Problem**: `useEffect` was called inside `renderPendingApprovals()` function
- ✅ **Solution**: Moved the logic to the main component-level `useEffect` hook
- **Result**: The "Something went wrong" error should now be resolved

### 2. **Added Comprehensive Debugging**
Added detailed console logging to help diagnose the issue:

#### In `AdminPortal.jsx`:
- Shows when pending users are being loaded
- Displays count breakdown by role (manager, cashier, employee, supplier)
- Logs both RPC and direct query results

#### In `SupplierAuth.jsx`:
- Logs supplier data before insertion
- Confirms successful user creation
- Shows any insertion errors

## How to Diagnose the Issue

### Step 1: Check Browser Console
1. Open the Admin Portal
2. Navigate to "Pending Approvals" tab
3. Open browser Developer Tools (F12)
4. Look for these console messages:
   ```
   🔍 Loading pending users...
   ✅ Loaded X pending users via RPC: [...]
   📊 Breakdown by role: { manager: X, cashier: X, employee: X, supplier: X }
   ```

### Step 2: Test Supplier Registration
1. Go to supplier signup page (`/supplier-signup`)
2. Fill out the form and submit
3. Check console for:
   ```
   📦 Creating supplier user record: {...}
   ✅ Supplier user created successfully: {...}
   ```

### Step 3: Check Database
Run the queries in `check-pending-suppliers.sql` to verify:
1. Are suppliers being created in the database?
2. Are they marked as `is_active = false`?
3. Does the `get_pending_users()` RPC function exist?
4. Does the RPC function return supplier records?

## Common Issues and Solutions

### Issue 1: RPC Function Not Deployed
**Symptoms**: Console shows "RPC function not available"

**Solution**:
1. Open Supabase SQL Editor
2. Run: `backend/database/fix-users-rls-policy.sql`
3. Verify with: `SELECT * FROM get_pending_users();`

### Issue 2: RLS (Row Level Security) Blocking Access
**Symptoms**: Direct query error or empty results despite data existing

**Solution**:
1. Check if you're logged in as admin
2. Verify admin role in auth.users metadata
3. Run RLS fix: `backend/database/fix-users-rls-policy.sql`

### Issue 3: Suppliers Going to Different Table
**Symptoms**: Data in `suppliers` table instead of `users` table

**Solution**:
- The inventory system has a separate `suppliers` table
- User applications should go to `users` table with role='supplier'
- Both tables can coexist - `SupplierAuth.jsx` correctly uses `users` table

### Issue 4: Admin Not Authenticated Properly
**Symptoms**: RPC returns empty even though data exists

**Solution**:
1. Log out and log back in as admin
2. Check that `auth.users.raw_user_meta_data->>'role'` is 'admin'
3. Verify with query:
   ```sql
   SELECT 
     id, 
     email, 
     raw_user_meta_data->>'role' as role 
   FROM auth.users 
   WHERE id = auth.uid();
   ```

### Issue 5: Metadata Not Stored Correctly
**Symptoms**: Users created but company info missing

**Solution**:
- Check that `metadata` column exists in `users` table
- Verify column type is `JSONB`
- If missing, add it:
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  ```

## Testing Checklist

- [ ] Admin portal loads without "Something went wrong" error
- [ ] Console shows pending users loading message
- [ ] Supplier registration form works
- [ ] Console confirms supplier user creation
- [ ] Database query shows supplier in `users` table with `is_active=false`
- [ ] RPC function `get_pending_users()` exists
- [ ] RPC function returns supplier records
- [ ] Pending approvals section shows supplier applications
- [ ] Role breakdown shows correct supplier count

## Expected Flow

1. **Supplier Applies** (SupplierAuth.jsx)
   - Creates auth.users record
   - Creates users table record with `is_active=false`, `role='supplier'`
   - Stores company info in metadata JSONB field

2. **Admin Views Pending** (AdminPortal.jsx)
   - Navigates to "Pending Approvals" tab
   - `useEffect` triggers `loadPendingUsers()`
   - Calls `get_pending_users()` RPC function
   - RPC checks if caller is admin
   - Returns all users where `is_active=false`
   - UI displays suppliers with other pending users

3. **Admin Approves/Rejects**
   - Approve: Sets `is_active=true`
   - Reject: Deletes from users table

## Files Modified

1. **frontend/src/pages/AdminPortal.jsx**
   - Fixed React Hooks violation
   - Added debugging console logs
   - Enhanced useEffect to load pending users for 'approvals' section

2. **frontend/src/pages/SupplierAuth.jsx**
   - Added console logging for user creation
   - Added `.select().single()` to confirm insertion
   - Better error logging

3. **backend/database/check-pending-suppliers.sql** (NEW)
   - SQL queries to verify pending suppliers
   - Tests RPC function
   - Checks data integrity

## Next Steps

1. **Test the fixes**:
   - Have a supplier apply
   - Check browser console
   - Check admin pending approvals

2. **If still not working**:
   - Run `check-pending-suppliers.sql` queries
   - Share the console output
   - Check Supabase logs

3. **Verify database functions**:
   - Ensure `get_pending_users()` is deployed
   - Confirm RLS policies are correct
   - Test with direct SQL queries

## Support Queries

If you need to manually check or fix data:

```sql
-- Find all suppliers in users table
SELECT * FROM users WHERE role = 'supplier';

-- Find pending suppliers
SELECT * FROM users WHERE role = 'supplier' AND is_active = false;

-- Manually approve a supplier
UPDATE users SET is_active = true WHERE id = 'supplier-uuid-here';

-- Check what admin sees
SELECT * FROM get_pending_users();
```

## Summary

The main issues have been fixed:
1. ✅ React Hooks error resolved
2. ✅ Debugging added to both registration and admin portal
3. ✅ Database check queries provided

The supplier applications should now appear in pending approvals. If not, use the debugging output and SQL queries to identify where the data flow is breaking.
