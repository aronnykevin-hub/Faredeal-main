# SQL User Management & Role Assignment - Complete Guide

## Overview
All SQL functions to search users and assign roles (manager, cashier, supplier) to users in Faredeal system.

---

## 📋 TABLE OF CONTENTS
1. [Search/Query Functions](#search-functions)
2. [Role Assignment Functions](#role-assignment-functions)
3. [Approval/Rejection Functions](#approval-functions)
4. [Diagnostic Queries](#diagnostic-queries)
5. [Execution Order](#execution-order)
6. [RPC Function Calls from Frontend](#rpc-calls)

---

## 🔍 SEARCH FUNCTIONS

### 1. Get All Users (Admin Dashboard)
**File:** `CREATE_ADMIN_RPC_FUNCTIONS.sql`

```sql
SELECT * FROM public.get_all_users_admin();
```

**Returns:**
- All users with: id, auth_id, email, full_name, phone, username, role, is_active, email_verified, profile_completed, created_at, updated_at

**Auth Check:** Only admin users can call this

---

### 2. Get Pending Users (Awaiting Approval)
**File:** `DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql`

```sql
SELECT * FROM public.get_pending_users();
```

**Returns:**
- Users with `is_active = FALSE` (haven't been approved yet)
- Ordered by creation date (oldest first)

**Auth Check:** Works for authenticated users

---

### 3. Get Active Users Only
**File:** `CREATE_ADMIN_RPC_FUNCTIONS.sql`

```sql
SELECT * FROM public.get_active_users_admin();
```

**Returns:**
- Users with `is_active = TRUE`
- Ordered by creation date (newest first)

**Auth Check:** Only admin users can call this

---

### 4. Get Inactive/Pending Users Only
**File:** `CREATE_ADMIN_RPC_FUNCTIONS.sql`

```sql
SELECT * FROM public.get_inactive_users_admin();
```

**Returns:**
- Users with `is_active = FALSE`
- Ordered by creation date (newest first)

**Auth Check:** Only admin users can call this

---

### 5. Manual Diagnostic Query (No RPC)
**File:** `DIAGNOSTIC_CHECK_USERS.sql`

Show all users with key information:
```sql
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed,
  created_at,
  auth_id
FROM public.users
ORDER BY created_at DESC;
```

Show breakdown by status:
```sql
SELECT 
  is_active,
  role,
  COUNT(*) as count
FROM public.users
GROUP BY is_active, role
ORDER BY is_active DESC, role;
```

Show specific user by email:
```sql
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed,
  auth_id,
  created_at,
  updated_at
FROM public.users
WHERE LOWER(email) LIKE '%example%'
ORDER BY created_at DESC;
```

---

## 👤 ROLE ASSIGNMENT FUNCTIONS

### 1. Assign User Role by Email (Most Used)
**File:** `ROLE_ASSIGNMENT_BY_EMAIL.sql` or `DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql`

```sql
SELECT public.assign_user_role_by_email('user@example.com', 'manager');
```

**Allowed Roles:**
- `manager` - Manager access
- `cashier` - Cashier/POS access  
- `supplier` - Supplier portal access

**Returns:**
```json
{
  "success": true/false,
  "message": "User assigned successfully",
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "manager|cashier|supplier",
  "is_active": true
}
```

**What it does:**
1. Finds user by email (case-insensitive)
2. Sets role to specified value
3. Sets `is_active = TRUE` (activates user immediately)
4. Updates `updated_at` timestamp

**Examples:**
```sql
-- Assign manager role
SELECT public.assign_user_role_by_email('john@example.com', 'manager');

-- Assign cashier role
SELECT public.assign_user_role_by_email('cashier@store.com', 'cashier');

-- Assign supplier role  
SELECT public.assign_user_role_by_email('supplier@farm.com', 'supplier');

-- Just activate without changing role
SELECT public.assign_user_role_by_email('user@example.com', NULL);
```

---

### 2. Approve User with Optional Role Change
**File:** `DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql`

```sql
SELECT public.approve_user_admin('user-uuid-here', 'manager');
```

**Parameters:**
- `p_user_id` (UUID) - User's database UUID (required)
- `p_role` (TEXT) - New role to assign, or NULL to keep existing role

**Returns:**
```json
{
  "success": true/false,
  "message": "User approved successfully",
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "current-role",
  "is_active": true
}
```

**What it does:**
1. Finds user by UUID
2. If role provided: updates role and activates user
3. If no role: just activates user (keeps existing role)
4. Updates `updated_at` timestamp

**Examples:**
```sql
-- Approve and assign manager role
SELECT public.approve_user_admin('8bb38779-2aaf-4510-b6b6-65d1efa69af7', 'manager');

-- Approve and assign cashier role
SELECT public.approve_user_admin('8bb38779-2aaf-4510-b6b6-65d1efa69af7', 'cashier');

-- Just approve (keep existing role)
SELECT public.approve_user_admin('8bb38779-2aaf-4510-b6b6-65d1efa69af7', NULL);
```

---

## ✅ APPROVAL/REJECTION FUNCTIONS

Currently implemented:
- ✅ **Approve user** - `approve_user_admin()` - Sets is_active = TRUE
- ✅ **Assign role by email** - `assign_user_role_by_email()` - Finds user by email and assigns role

Not yet implemented:
- ❌ **Reject user** - Could delete or mark user as rejected

---

## 🔧 DIAGNOSTIC QUERIES

### Check Current User Status
Show all users and their status:
```sql
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed,
  created_at,
  auth_id
FROM public.users
ORDER BY created_at DESC;
```

### Count by Role and Status
```sql
SELECT 
  role,
  is_active,
  COUNT(*) as count
FROM public.users
GROUP BY role, is_active
ORDER BY role, is_active DESC;
```

### Find Users Missing Auth Link
```sql
SELECT 
  id,
  email,
  role,
  auth_id
FROM public.users
WHERE auth_id IS NULL
ORDER BY created_at DESC;
```

### Find Users By Email Pattern
```sql
SELECT 
  id,
  email,
  role,
  is_active,
  profile_completed
FROM public.users
WHERE LOWER(email) LIKE '%admin%'
ORDER BY created_at DESC;
```

---

## 📦 EXECUTION ORDER

**Step 1: Set up Admin Users**
```bash
File: ADMIN_SETUP.sql
- Creates super_admin user: abana1662@gmail.com
- Creates admin user: farmagent25@gmail.com
- Enables RLS on users table
- Creates admin access policy
```

**Step 2: Deploy User Management Functions**
```bash
File: DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql
- Creates get_pending_users() function
- Creates approve_user_admin() function
- Creates assign_user_role_by_email() function
```

**Step 3: Deploy Admin Dashboard Functions (Optional)**
```bash
File: CREATE_ADMIN_RPC_FUNCTIONS.sql
- Creates get_all_users_admin() function
- Creates get_pending_users_admin() function
- Creates get_active_users_admin() function
- Creates get_inactive_users_admin() function
```

---

## 🌐 RPC CALLS FROM FRONTEND

### JavaScript/React Examples

**1. Search for Pending Users:**
```javascript
const { data, error } = await supabase.rpc('get_pending_users');
```

**2. Get All Users (Admin Only):**
```javascript
const { data, error } = await supabase.rpc('get_all_users_admin');
```

**3. Get Active Users (Admin Only):**
```javascript
const { data, error } = await supabase.rpc('get_active_users_admin');
```

**4. Assign Role by Email:**
```javascript
const { data, error } = await supabase.rpc('assign_user_role_by_email', {
  p_email: 'user@example.com',
  p_role: 'manager' // or 'cashier' or 'supplier'
});

if (data.success) {
  console.log('✅ User assigned to role:', data.role);
} else {
  console.error('❌ Error:', data.error);
}
```

**5. Approve User with Role:**
```javascript
const { data, error } = await supabase.rpc('approve_user_admin', {
  p_user_id: 'user-uuid',
  p_role: 'cashier'
});

if (data.success) {
  console.log('✅ User approved as:', data.role);
} else {
  console.error('❌ Error:', data.error);
}
```

---

## 📊 Database Tables

### users table Structure
```sql
- id (UUID, Primary Key)
- auth_id (UUID, Foreign Key to auth.users)
- email (TEXT, UNIQUE)
- full_name (TEXT)
- phone (TEXT)
- username (TEXT)
- role (TEXT) - Values: 'admin', 'manager', 'cashier', 'supplier', 'user'
- is_active (BOOLEAN) - TRUE = can access portal, FALSE = awaiting approval
- email_verified (BOOLEAN)
- profile_completed (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## ⚠️ IMPORTANT NOTES

### Activation Flow
1. User signs up with Google OAuth → `is_active = FALSE` initially
2. User record created in `users` table with `is_active = FALSE`
3. Admin searches pending users → finds them inactive
4. Admin assigns role via `assign_user_role_by_email()` → user is activated (`is_active = TRUE`)
5. User can now access portal as manager/cashier/supplier

### Security
- ✅ Functions use `SECURITY DEFINER` to bypass RLS for admin tasks
- ✅ Admin check: ensures only users with role='admin' and is_active=TRUE can call admin functions
- ✅ Email lookup is case-insensitive (LOWER() used)
- ✅ Role validation: only 'manager', 'cashier', 'supplier' allowed

### Column Names
⚠️ Make sure your actual `users` table matches these column names:
- `id` (not user_id)
- `auth_id` (stores Supabase auth user ID)
- `email`
- `full_name` (or `first_name`/`last_name` concatenated)
- `phone`
- `username`
- `role`
- `is_active`
- `email_verified`
- `profile_completed`

If your columns are different, you may need to update the SQL functions.

---

## 🚀 NEXT STEPS

1. **Run ADMIN_SETUP.sql** - Set up admin users
2. **Run DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql** - Deploy role assignment functions
3. **Test** - Use the diagnostic queries to verify setup
4. **Build Frontend** - Create Admin Dashboard with:
   - Search box to find users
   - Filter by role/status
   - Dropdown to assign role (manager/cashier/supplier)
   - Button to confirm assignment
5. **Deploy** - Once verified, push to production

---

## 📝 File References

| File | Purpose | Key Functions |
|------|---------|---|
| ADMIN_SETUP.sql | Create admin users | - |
| DEPLOY_CORRECTED_USER_MANAGEMENT_FUNCTIONS.sql | Role assignment | assign_user_role_by_email(), approve_user_admin(), get_pending_users() |
| CREATE_ADMIN_RPC_FUNCTIONS.sql | Admin searches | get_all_users_admin(), get_active_users_admin(), get_inactive_users_admin(), get_pending_users_admin() |
| ROLE_ASSIGNMENT_BY_EMAIL.sql | Email-based assignment | assign_user_role_by_email() |
| DIAGNOSTIC_CHECK_USERS.sql | Manual queries | N/A - just SQL queries |

