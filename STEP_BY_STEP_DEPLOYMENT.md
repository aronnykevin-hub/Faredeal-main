# Step-by-Step Fix & Deployment Guide

## Problem Summary
```
Error: Failed to run sql query: ERROR: 42883: function public.approve_user(uuid) does not exist
```

Cause: PostgreSQL requires explicit function signatures. DEFAULT parameters don't auto-create overloads.

---

## Solution: 3 Simple Steps

### STEP 1: Go to Supabase Dashboard

1. Open: https://supabase.com
2. Login to your account
3. Click your **Faredeal** project
4. Left sidebar → **SQL Editor**
5. Click **New Query** button

### STEP 2: Delete Old Functions (if they exist)

Copy-paste this and run it first:

```sql
DROP FUNCTION IF EXISTS public.approve_user(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.reject_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_pending_users() CASCADE;
```

Click **Run** button and wait for success.

### STEP 3: Create New Functions

Open this file: **`COMPLETE_USER_MANAGEMENT_FUNCTIONS.sql`**

Copy the ENTIRE contents and paste into Supabase SQL Editor.

Click **Run** button.

**Wait for completion** (should take 5-10 seconds).

---

## Verification

### Check Functions Were Created

Run this query in SQL Editor:

```sql
SELECT proname, pronargs FROM pg_proc 
WHERE proname IN ('approve_user', 'reject_user', 'get_pending_users')
ORDER BY proname, pronargs;
```

**Expected Output:**
```
approve_user        | 1
approve_user        | 2
get_pending_users   | 0
reject_user         | 1
```

(4 rows = SUCCESS ✅)

### Test Approve User Function

```sql
-- Test with just UUID (should work now!)
SELECT approve_user('some-uuid-here'::uuid);
```

Should return: `{"success": false, "error": "User not found"}`
(Error is expected since we used fake UUID, but function EXISTS!)

---

## Now Test in Admin Portal

1. Go to **Admin Portal**
2. Find a **pending user** application
3. Click **Approve** button
4. Should see: ✅ Success notification
5. User is now active!

---

## If You Still Get Errors

### Error: "function does not exist"
- ✅ Make sure you clicked **Run** in SQL Editor
- ✅ Check that all 4 functions appear in verification query

### Error: "syntax error"
- ✅ Make sure you copied the ENTIRE file contents
- ✅ No partial copy-paste
- ✅ Verify no accidental edits

### Error: "type user_role does not exist"
- ✅ This means your database doesn't have the `user_role` enum type
- ✅ Contact developer to create the type first

### Error: "permission denied"
- ✅ Make sure you're logged in as admin/owner in Supabase
- ✅ Not a limited user account

---

## Quick Reference

| Function | Purpose | Called As |
|----------|---------|-----------|
| `approve_user(UUID)` | Approve, keep role | `rpc('approve_user', {p_user_id})` |
| `approve_user(UUID, VARCHAR)` | Approve, change role | `rpc('approve_user', {p_user_id, p_role})` |
| `reject_user(UUID)` | Reject & delete user | `rpc('reject_user', {p_user_id})` |
| `get_pending_users()` | List pending apps | `rpc('get_pending_users', {})` |

---

## Why Two approve_user Functions?

**PostgreSQL Function Overloading:**
- Each function is identified by name + parameter signature
- `approve_user(UUID)` ≠ `approve_user(UUID, VARCHAR)`
- They're two separate functions
- PostgreSQL picks the right one based on arguments passed

**Benefits:**
- Admin can approve without changing role
- Admin can approve AND change role in one call
- Frontend code can use both patterns

---

## Success Indicators ✅

After deployment, you should see:

1. ✅ All 4 RPC functions in database
2. ✅ No "function does not exist" errors
3. ✅ Admin can approve users
4. ✅ Admin can reject users
5. ✅ `audit_log` table tracks all actions
6. ✅ User management working smoothly

---

## Need More Help?

Check these files:
- `FUNCTION_OVERLOADS_FIX.md` - Technical explanation
- `FIX_REJECT_USER_ERROR.md` - Original error details
- `QUICK_REFERENCE.md` - Quick overview
- `ERROR_FIX_SUMMARY.md` - Comprehensive summary

**Everything should work now!** 🚀
