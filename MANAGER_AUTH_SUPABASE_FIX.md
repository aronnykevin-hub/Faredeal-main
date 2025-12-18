# 🔧 Manager Auth - Multiple Supabase Clients & Role Issue Fix

## 📋 Problems Identified

### **Problem 1: Multiple GoTrueClient Instances Warning**
```
Multiple GoTrueClient instances detected in the same browser context. 
It is not an error, but this should be avoided as it may produce 
undefined behavior when used concurrently under the same storage key.
```

**Root Cause:** The singleton pattern in `supabase.js` was broken:

```javascript
// ❌ WRONG - Creates new instance every time
export const supabase = supabaseInstance || (supabaseInstance = createClient(...))
```

Why this fails:
- The expression `supabaseInstance || (...)` doesn't cache properly across module re-imports
- Each component importing the module evaluates this condition
- Short-circuit evaluation returns `supabaseInstance` only if it's truthy
- But `supabaseInstance` starts as `null`, so the assignment runs again

**Fixed:**
```javascript
// ✅ CORRECT - Creates once at module load
function initSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(...)
  }
  return supabaseInstance
}
export const supabase = initSupabase()
```

---

### **Problem 2: User Role is 'customer' instead of 'manager'**
```
✅ User authenticated: tugumeinnocent0@gmail.com
👤 User data from database: {..., role: 'customer', ...}
⚠️ User role is not manager: customer
```

**Root Cause:** The authenticated user has the wrong role in the database.

When a user signs up or logs in via Google OAuth, the system:
1. Creates auth record in `auth.users` (Supabase Auth)
2. Creates user record in `public.users` table with a role
3. By default, new users get `role = 'customer'`
4. Manager login checks `if (role !== 'manager')` and blocks access

---

## ✅ Solutions

### **Fix 1: Already Applied - Proper Singleton Pattern** ✅

Changed [supabase.js](frontend/src/services/supabase.js):

```diff
- let supabaseInstance = null
- export const supabase = supabaseInstance || (supabaseInstance = createClient(...))

+ let supabaseInstance = null
+ function initSupabase() {
+   if (!supabaseInstance) {
+     supabaseInstance = createClient(...)
+   }
+   return supabaseInstance
+ }
+ export const supabase = initSupabase()
```

**Result:** ✅ No more "Multiple GoTrueClient instances" warning

---

### **Fix 2: Update User Role in Database**

The user `tugumeinnocent0@gmail.com` needs to have role `'manager'` in the database.

#### **Option A: Admin Dashboard Update** (Recommended)
1. Go to **Admin Portal**
2. Navigate to **User Management**
3. Find user: `tugumeinnocent0@gmail.com`
4. Change role from `customer` → `manager`
5. Save & reload

#### **Option B: Direct SQL Update**

Run in Supabase SQL Editor:

```sql
-- Update user role to manager
UPDATE public.users
SET role = 'manager', is_active = true
WHERE email = 'tugumeinnocent0@gmail.com';

-- Verify the update
SELECT id, email, role, is_active 
FROM public.users 
WHERE email = 'tugumeinnocent0@gmail.com';
```

#### **Option C: Using Supabase Dashboard**

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to **SQL Editor**
3. Run the SQL above
4. Check the result

---

#### **Option D: Delete and Re-register as Manager**

If you want to start fresh:

```sql
-- DELETE existing customer user
DELETE FROM public.users 
WHERE email = 'tugumeinnocent0@gmail.com';

-- DELETE from auth.users (if accessible)
-- Note: This requires admin/service role key
```

Then:
1. Clear browser cache & logout
2. Go to Manager Login page
3. Sign in with Google again
4. Complete manager profile

This will create a NEW user record with `role = 'manager'`

---

## 🔍 How User Roles Are Set

### **During OAuth Registration (First Time)**

When a new user signs in with Google for the FIRST time:

1. **Google OAuth creates auth user** → stored in `auth.users` table
2. **ManagerAuth.jsx creates database user** → stored in `public.users` table

```jsx
// From ManagerAuth.jsx
const { data: newUser, error: createError } = await supabase
  .from('users')
  .insert([{
    auth_id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    role: 'manager',  // ← Set to 'manager' for manager login
    is_active: false,
    metadata: {}
  }])
  .select()
  .single()
```

**But if user already exists**, it fetches the existing record with whatever role they had before.

### **Common Scenarios**

| Scenario | What Happens | Fix |
|----------|--------------|-----|
| New user signs in via Manager Login | Role = 'manager' ✅ | Works fine |
| Existing customer signs in via Manager Login | Role = 'customer' ❌ | Update role to 'manager' |
| User first signs in via Customer Portal | Role = 'customer' | Must update role before manager access |
| User deletes cookies/session | Re-fetches same role | Role stays the same |

---

## 🗄️ Database Schema for Reference

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    auth_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role user_role,              -- 'admin', 'manager', 'cashier', 'customer', etc.
    is_active BOOLEAN DEFAULT FALSE,
    department VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
);

-- Enum type
CREATE TYPE user_role AS ENUM (
    'admin',
    'manager',
    'cashier',
    'employee',
    'supplier',
    'customer'
);
```

---

## 🧪 Testing Steps

### **After Applying Fixes:**

1. **Clear all data**
   - Clear browser cache/cookies
   - Sign out (if logged in)

2. **Open DevTools Console**
   - Should NOT see "Multiple GoTrueClient instances" warning

3. **Sign in with Google**
   - Click "Sign in with Google" on Manager Login page
   - Choose account: `tugumeinnocent0@gmail.com`

4. **Check Console Logs**
   ```
   ✅ Supabase client initialized     [Once only]
   🔄 OAuth callback detected...      [Once only]
   🔍 Checking manager authentication...
   ✅ User authenticated: tugumeinnocent0@gmail.com
   👤 User data from database: {...}
   ✅ User is manager - redirecting...  [After role update]
   ```

5. **Expected Flow**
   - ✅ No 406/409 errors
   - ✅ No "Multiple GoTrueClient" warning
   - ✅ No "User role is not manager" warning
   - ✅ Redirect to Manager Portal

---

## ⚠️ Troubleshooting

### **Still getting "Multiple GoTrueClient" warning?**

1. Clear node_modules and reinstall:
```bash
rm -r node_modules
npm install
```

2. Check for duplicate imports:
```javascript
// ❌ DON'T DO THIS
import { supabase } from './services/supabase'
import { createClient } from '@supabase/supabase-js'
const supabase2 = createClient(...) // Creates second instance!

// ✅ DO THIS
import { supabase } from './services/supabase'
// Reuse the same instance everywhere
```

3. Check for Supabase initialization in multiple places:
```javascript
// Check if any of these are creating new instances:
// - App.jsx
// - AuthContext.jsx
// - Any other component
```

### **Still seeing "User role is not manager"?**

1. Verify the update worked:
```sql
SELECT email, role, is_active FROM public.users 
WHERE email = 'tugumeinnocent0@gmail.com';
-- Should show: role = 'manager'
```

2. If role is still 'customer', re-run the UPDATE:
```sql
UPDATE public.users
SET role = 'manager'
WHERE email = 'tugumeinnocent0@gmail.com';
```

3. Hard refresh browser:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - Or clear cache completely

### **User still can't sign in?**

Check these conditions:
```javascript
// From ManagerAuth.jsx - all must be true
if (userData && userData.role !== 'manager') {
  // BLOCKED: Check role in database
  return false
}

if (userData?.is_active && profileComplete) {
  // ALLOWED: User is approved and profile complete
  redirect('/manager')
}

if (!profileComplete) {
  // ALLOWED: Show profile completion form
  showProfileForm()
}

if (!userData?.is_active) {
  // BLOCKED: Pending admin approval
  show('Pending approval message')
  logout()
}
```

---

## 📝 Changes Made

### **File: [supabase.js](frontend/src/services/supabase.js)**
- ✅ Fixed singleton pattern to prevent multiple instances
- ✅ Added initialization check with `if (!supabaseInstance)`
- ✅ Added console log when client initializes

### **No Changes Needed For:**
- ManagerAuth.jsx (role validation is correct)
- Database schema (already supports manager role)

---

## 🔐 Role-Based Access Summary

| Role | Can Access | Notes |
|------|-----------|-------|
| `admin` | Admin Portal | Full system access |
| `manager` | Manager Portal | Team & order management |
| `cashier` | Cashier Portal | POS & transactions |
| `employee` | Employee Portal | Basic access |
| `supplier` | Supplier Portal | Order management |
| `customer` | Customer Portal | Shopping & orders |

**Current User:** `tugumeinnocent0@gmail.com`
- **Before:** customer ❌
- **After:** manager ✅

---

## 📞 Next Steps

1. ✅ **Singleton fix applied** - Multiple instances warning should be gone
2. **🔄 Update user role** - Use Option A, B, C, or D above
3. **🧪 Test the flow** - Sign in again and verify success
4. **📋 Check similar auth files** - Apply same pattern to:
   - CashierAuth.jsx
   - SupplierAuth.jsx
   - EmployeeAuth.jsx

All should validate roles properly!
