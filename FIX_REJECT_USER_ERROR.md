# Fix: Reject User Function Error

## Problem
```
Error: column "metadata" does not exist
POST /rest/v1/rpc/reject_user 400 (Bad Request)
AdminPortal.jsx:984 Error rejecting user: {code: '42703', details: null, message: 'column "metadata" does not exist'}
```

The `reject_user()` RPC function is trying to access a non-existent `metadata` column, and other user management functions may not be properly configured.

## Solution

Run the SQL file: **`COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`**

This is the comprehensive version that includes:
- ✅ `get_pending_users()` - Get all pending user applications
- ✅ `approve_user()` - Approve and activate users
- ✅ `reject_user()` - Reject and delete users
- ✅ Audit logging for all actions
- ✅ Proper error handling

### Steps to Deploy:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "SQL Editor" in the left sidebar

2. **Create New Query**
   - Click "New Query" button
   - Copy entire contents of `COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`
   - Paste into the SQL editor

3. **Run the SQL**
   - Click "Run" button (or Ctrl+Enter)
   - Wait for "Query executed successfully" message
   - You should see output showing functions were created

4. **Verify Success**
   - Create another new query
   - Paste this verification SQL:
   
```sql
-- Verify all functions exist
SELECT proname, pronargs FROM pg_proc 
WHERE proname IN ('approve_user', 'reject_user', 'get_pending_users')
ORDER BY proname;

-- Should return 3 rows
```

   - Click Run - should show all 3 functions

### What Gets Created:
- ✅ `get_pending_users()` function
- ✅ `approve_user(UUID, VARCHAR)` function  
- ✅ `reject_user(UUID)` function
- ✅ `audit_log` table for tracking actions
- ✅ RLS policies for security
- ✅ Performance indexes

### Test the Fix:

1. Go back to Admin Portal
2. Find a pending user application
3. Click **Reject** button
4. Should see: ✅ "User's application was rejected"
5. No more metadata column errors!

