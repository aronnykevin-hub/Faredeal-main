# Error Summary & Fix

## Error Detected
```
❌ POST https://zwmupgbixextqlexknnu.supabase.co/rest/v1/rpc/reject_user 400 (Bad Request)
Error: column "metadata" does not exist
Location: AdminPortal.jsx line 984
```

## Root Cause
The `reject_user()` RPC function in Supabase database was either:
1. Not created yet
2. Referencing non-existent columns
3. Missing proper error handling

## Solution Applied

Created **`COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`** with:

### Three Main RPC Functions:

#### 1. get_pending_users()
```sql
-- Returns all pending user applications with proper structure
SELECT * FROM get_pending_users();
```
- Returns: id, email, username, full_name, phone, role, status, metadata
- Used by: Admin Portal to load pending users list

#### 2. approve_user(p_user_id UUID, p_role VARCHAR)
```sql
-- Approves a user and optionally sets their role
SELECT approve_user('user-id-here'::uuid, 'manager');
```
- Sets status: pending → active
- Updates role if provided
- Logs action in audit_log
- Returns: success, message, user details

#### 3. reject_user(p_user_id UUID)
```sql
-- Rejects and deletes a user
SELECT reject_user('user-id-here'::uuid);
```
- Deletes user from users table
- Logs rejection in audit_log
- Cascades delete related records
- Returns: success, message, deleted user details

### Bonus: audit_log Table
Tracks all user management actions:
- User approvals
- User rejections
- User deletions
- Who performed the action
- When it happened

## How to Deploy

### Option 1: Supabase Dashboard (Recommended)
1. Open Supabase → Your Project → SQL Editor
2. Click "New Query"
3. Copy entire `COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`
4. Paste into editor
5. Click "Run"

### Option 2: Terminal (if using Supabase CLI)
```bash
supabase db push
# or
psql -U postgres -d your_db < COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql
```

## Test After Deployment

1. Go to Admin Portal
2. Find pending user application
3. Click **Reject** button
4. Expected: User deleted, notification shows success
5. No more metadata column errors ✅

## File Locations

- **SQL File**: `backend/database/migrations/COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`
- **Documentation**: `FIX_REJECT_USER_ERROR.md`
- **Admin Portal**: `frontend/src/pages/AdminPortal.jsx` (line 984)

## Related Files Modified
- ✅ AdminPortal.jsx - calls reject_user() RPC
- ✅ DualScannerInterface.jsx - Fixed JSX syntax errors
- ✅ Scanner UI - Made dynamic for admin/cashier contexts

## Status
🔧 **Ready for Deployment** - Run the SQL migration to fix the error completely.
