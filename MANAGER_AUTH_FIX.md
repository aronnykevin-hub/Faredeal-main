# 🔧 Manager Auth Error Fix - OAuth Callback Issues

## 📋 Problem Summary

When managers authenticate via OAuth (Google Sign-in), they encounter two sequential errors:

### Error 1: **406 Not Acceptable**
```
GET /rest/v1/users?select=*&auth_id=eq.b06f2485-236c-4e44-ba0c-5bc9ee1911c0&role=eq.manager:1
Failed to load resource: the server responded with a status of 406
```

### Error 2: **409 Conflict** 
```
POST /rest/v1/users?columns=...
Failed to load resource: the server responded with a status of 409
```

---

## 🎯 Root Causes

### **406 Error - RLS Policy Blocking Query**

**Why it happens:**
1. The query includes **both** `auth_id` AND `role` filters
2. The RLS policy `"Users can view own data"` only allows:
   ```sql
   USING (auth.uid() = auth_id)
   ```
3. When filtering by `role=manager`, Supabase checks if the user has access to that specific row
4. The policy blocks the query because it's overly restrictive

**The problematic query:**
```javascript
.eq('auth_id', user.id)     // ✓ OK - user's own auth_id
.eq('role', 'manager')       // ✗ PROBLEM - adds another filter RLS checks
```

### **409 Error - Duplicate Key or Constraint Violation**

**Why it happens:**
1. User already exists in database (from previous OAuth attempt)
2. Email is UNIQUE constraint
3. auth_id is UNIQUE constraint
4. Insert fails trying to create duplicate record

---

## ✅ Solution Applied

### **Change 1: Remove role filter from SELECT query**

**Before:**
```jsx
let { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', user.id)
  .eq('role', 'manager')  // ❌ REMOVED
  .single();
```

**After:**
```jsx
let { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', user.id)  // ✅ Only filter by auth_id
  .single();
```

**Why:** Filtering by `auth_id` alone respects the RLS policy because it only returns the user's own data. RLS allows this.

---

### **Change 2: Better error handling for duplicates**

**Before:**
```jsx
if (fetchError || !userData) {
  // Tries to insert without checking error code
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([...])
    .select()
    .single();
    
  if (createError) {
    console.error('❌ Error creating user:', createError);
    throw createError;  // ❌ Throws and crashes
  }
}
```

**After:**
```jsx
if (fetchError) {
  // Only try to insert if record doesn't exist (PGRST116 = not found)
  if (fetchError.code === 'PGRST116') {
    console.log('📝 Creating new manager user...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([...])
      .select()
      .single();
      
    if (createError) {
      // Handle duplicate gracefully
      if (createError.code === '23505') {  // Unique violation
        console.log('ℹ️ User already exists, fetching...');
        const { data: existing } = await supabase
          .from('users')
          .eq('auth_id', user.id)
          .single();
        userData = existing;  // ✅ Use existing user instead of crashing
      } else {
        throw createError;
      }
    }
  }
}
```

---

### **Change 3: Fix profile completion check**

**Before:**
```jsx
if (userData.is_active && userData.profile_completed) {
  // Uses profile_completed field (doesn't exist in schema!)
}
```

**After:**
```jsx
const profileComplete = userData?.full_name && userData?.phone && userData?.department;

if (userData?.is_active && profileComplete) {
  // ✅ Checks actual fields that exist in database
}
```

**Why:** The schema doesn't have a `profile_completed` field. Instead, we check if all required profile fields are filled.

---

### **Change 4: Add role validation**

**New code:**
```jsx
// Verify user has manager role
if (userData && userData.role !== 'manager') {
  console.warn('⚠️ User role is not manager:', userData.role);
  notificationService.show('❌ This login is for managers only.', 'error');
  await supabase.auth.signOut();
  return;
}
```

**Why:** Prevents non-managers from accessing the manager portal through OAuth.

---

## 🗄️ Database Schema Reference

The `users` table structure (from `auth-system-schema.sql`):

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    auth_id UUID UNIQUE,         -- Links to Supabase auth
    email VARCHAR(255) UNIQUE,   -- UNIQUE constraint
    full_name VARCHAR(255),
    phone VARCHAR(20),           -- Required for profile
    role user_role,              -- admin, manager, cashier, etc.
    is_active BOOLEAN,           -- Admin must approve
    department VARCHAR(100),     -- Required for profile
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
);

-- RLS POLICY that caused the 406 error:
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid() = auth_id);  -- Only own data accessible
```

---

## 🔐 RLS Policies Explained

Your current RLS setup is:

| Policy | Allows |
|--------|--------|
| `"Users can view own data"` | Users see only their own record (WHERE `auth.uid() = auth_id`) |
| `"Users can update own data"` | Users update only their own record |
| `"Admins can view all users"` | Admins see all records |
| `"Admins can update all users"` | Admins update any record |
| `"Anyone can register"` | Anonymous users can INSERT new records |

**Problem:** When you add `.eq('role', 'manager')` to the SELECT query, Supabase:
1. Checks if you have permission to read the table (✓)
2. Checks if you have permission to read **that specific row** (✓ your own)
3. But then the `role` filter narrows results further
4. Since you're filtering by a column value that RLS policy doesn't explicitly allow, it returns 406

**Solution:** Only query by `auth_id` which directly respects the RLS policy.

---

## 🧪 Testing Steps

1. **Clear browser cache & cookies** (OAuth cache might have old data)
2. **Sign in with Google** as a manager
3. **Check Console logs:**
   - Should see ✅ "User authenticated" 
   - Should see either:
     - "User data from database" (user exists)
     - "Creating new manager user" (first time)
   - Should NOT see 406 or 409 errors
4. **Complete profile form** with:
   - Full Name
   - Phone Number
   - Department
5. **Submit & Verify** redirect to Manager Portal

---

## 🚨 If Errors Still Occur

### **Still getting 406?**
```javascript
// Check what query is being sent
console.log('Query params:', {
  auth_id: user.id,
  role: 'manager'  // Remove this line!
});
```

### **Still getting 409?**
```sql
-- Check if user already exists
SELECT * FROM public.users 
WHERE auth_id = 'b06f2485-236c-4e44-ba0c-5bc9ee1911c0'
  OR email = 'tugumeinnocent0@gmail.com';

-- If exists, delete duplicate (if safe)
DELETE FROM public.users 
WHERE email = 'tugumeinnocent0@gmail.com' 
  AND is_active = false;
```

### **Getting different error?**
Check these in browser DevTools Network tab:
1. Look at the full response body (not just status)
2. Copy the exact error message
3. Check [Supabase Error Codes](https://supabase.com/docs/reference/javascript/errors)

---

## 📝 Changes Made

**File:** [ManagerAuth.jsx](frontend/src/pages/ManagerAuth.jsx)

**Changes:**
1. ✅ Removed `.eq('role', 'manager')` from SELECT query
2. ✅ Added error code checking (`PGRST116`, `23505`)
3. ✅ Fixed profile completion detection (checks actual fields)
4. ✅ Added role validation before redirecting
5. ✅ Better error messages in logs

---

## 🔄 Related Auth Files to Review

- [auth-system-schema.sql](backend/database/auth-system-schema.sql) - Users table definition & RLS
- [OAuthCallback.jsx](frontend/src/components/OAuthCallback.jsx) - OAuth flow handling
- [CashierAuth.jsx](frontend/src/pages/CashierAuth.jsx) - Similar auth (check if needs same fix)
- [SupplierAuth.jsx](frontend/src/pages/SupplierAuth.jsx) - Similar auth (check if needs same fix)

---

## ✨ Summary

| Error | Cause | Fix |
|-------|-------|-----|
| **406** | Role filter violates RLS policy | Remove `.eq('role', 'manager')` |
| **409** | Duplicate key (user exists) | Check error code & fetch existing |
| **Profile check** | Wrong field name | Check `full_name && phone && department` |

The fixes are now **live** and should resolve your OAuth authentication issues! 🎉
