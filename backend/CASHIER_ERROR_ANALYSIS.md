# 🐛 Error Analysis: Cashier Auth Failure

## 🔴 The Error

```
✅ User authenticated: aronnykevin@gmail.com
❌ Failed to load resource: the server responded with a status of 400 ()
❌ 👤 User data from database: null Error: 42703
❌ Database error: Object
❌ Auth check error: Object
```

---

## 🔍 Breaking Down the Error

### **Error 42703 in PostgreSQL**
```
42703 = "undefined_column"
```
This means the REST API request is malformed or trying to select/filter by a column that doesn't exist.

### **Request That Caused It**
```
GET /rest/v1/users?select=id%2Cauth_id%2Cemail%2Cfull_name%2Crole%2Cis_active%2Cphone%2Cdepartment
&auth_id=eq.1a5aa3ab-24a5-46e6-ba97-ed25c25fe103:1

Response: 400
```

### **What Happened**

1. User logged in via Google OAuth ✅
2. Got auth user: `user.id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"` ✅
3. CashierAuth.jsx tried this query:
   ```javascript
   let { data: userData, error: fetchError } = await supabase
     .from('users')
     .select('id, auth_id, email, full_name, role, is_active, phone, department')
     .eq('auth_id', user.id)  // ← Filtering by auth_id
     .maybeSingle();
   ```

4. **Problem**: The `auth_id` column in the database is NULL for this user
5. Query fails with 400 error
6. `userData = null`
7. `fetchError.code = '42703'` (though it's actually a 400)

---

## 📍 Code Location: CashierAuth.jsx

### **Line 91-94: The Failing Query**

```javascript
// Check if user exists in database
let { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', user.id)      // ← FILTERING BY auth_id
  .maybeSingle();
```

### **What Should Happen**

```
✅ User authenticated: aronnykevin@gmail.com
✅ Auth user ID: 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
✅ Query database with this ID
✅ Find user record where auth_id = 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
✅ Get data back: { id, auth_id, email, full_name, role, is_active, ... }
✅ userData is populated
✅ Check if role == 'cashier' ✅
✅ Check if is_active == true (approved)
✅ Check if profile_completed == true
✅ Navigate to /employee-portal
```

### **What Actually Happens**

```
✅ User authenticated: aronnykevin@gmail.com
✅ Auth user ID: 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
✅ Query database with this ID
❌ BUT: auth_id field in database = NULL (not linked)
❌ Query finds NO MATCHING RECORD
❌ userData = null
❌ fetchError is returned (400 error)
❌ Fails at line 106: if (userData && userData.role !== 'cashier')
```

---

## 🔐 Supabase Auth vs Database Mismatch

### **In Supabase Auth**
```
User Record:
{
  id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",
  email: "aronnykevin@gmail.com",
  email_confirmed_at: "2024-04-29T10:30:00Z",
  created_at: "2024-04-29T10:25:00Z",
  ...
}
```

### **In Database (users table)**
```
Current (BROKEN):
{
  id: "some-uuid",
  auth_id: NULL,              ← ❌ NOT LINKED
  email: "aronnykevin@gmail.com",
  full_name: "Aronny Kevin",
  role: "cashier",
  is_active: false,
  profile_completed: true,
  ...
}

Should Be (FIXED):
{
  id: "some-uuid",
  auth_id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",  ← ✅ LINKED
  email: "aronnykevin@gmail.com",
  full_name: "Aronny Kevin",
  role: "cashier",
  is_active: false,
  profile_completed: true,
  ...
}
```

---

## 🔧 The Fix: link-cashier-auth.js

### **What The Script Does**

```javascript
1. Get all auth users from Supabase Auth
   → List of all users in auth system

2. Find matching user by email
   const matchingAuthUser = authUsers.find(u => u.email === 'aronnykevin@gmail.com')
   → Found: { id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103", email: "aronnykevin@gmail.com" }

3. Query database for cashier record
   SELECT * FROM users WHERE email = 'aronnykevin@gmail.com' AND role = 'cashier'
   → Found: { id: "uuid", auth_id: NULL, email: "aronnykevin@gmail.com", role: "cashier" }

4. Link them together
   UPDATE users SET auth_id = '1a5aa3ab-24a5-46e6-ba97-ed25c25fe103'
   WHERE email = 'aronnykevin@gmail.com' AND role = 'cashier'
   → auth_id is now populated ✅

5. Verify the link
   SELECT * FROM users WHERE auth_id = '1a5aa3ab-24a5-46e6-ba97-ed25c25fe103'
   → Found the cashier record ✅
```

---

## ✅ After Running The Script

### **Next Time Cashier Logs In**

```
1. Google OAuth completes
2. Get auth user: user.id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
3. Query database:
   .eq('auth_id', user.id)
   ↓
   .eq('auth_id', '1a5aa3ab-24a5-46e6-ba97-ed25c25fe103')
   ↓
   ✅ FINDS THE RECORD (auth_id now linked!)
   ↓
4. userData is populated:
   {
     id: "uuid",
     auth_id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",
     email: "aronnykevin@gmail.com",
     role: "cashier",
     is_active: false,  // Pending approval
     profile_completed: true
   }
5. Check status:
   - ✅ Role is cashier
   - ❌ is_active = false (not approved yet)
   - ✅ profile_completed = true
   ↓
6. Result: Show "Your cashier application is pending admin approval"
7. Logout
8. Wait for admin to approve in Admin Portal
9. Next login → Navigate to /employee-portal ✅
```

---

## 📋 Step-by-Step Fix Process

### **Step 1: Execute The Linking Script**
```bash
cd backend
node link-cashier-auth.js
```

**Expected Output:**
```
✅ Found matching auth user for aronnykevin@gmail.com
   Auth ID: 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
   Email confirmed: Yes ✅

✅ Cashier record found in database
   Cashier ID: uuid

🔄 Linking auth_id...

✅ auth_id linked successfully!

✅ VERIFICATION SUCCESSFUL!
   Cashier Email: aronnykevin@gmail.com
   Auth ID: 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
   Role: cashier
   Active: ⏳ Pending admin approval

✨ Cashier auth link complete!
```

### **Step 2: Verify In Database**

Run this query in Supabase SQL Editor:
```sql
SELECT 
  id,
  auth_id,
  email,
  role,
  is_active,
  profile_completed
FROM users
WHERE email = 'aronnykevin@gmail.com' AND role = 'cashier';
```

**Expected Result:**
```
id         | auth_id                              | email                 | role    | is_active | profile_completed
-----------|--------------------------------------|----------------------|---------|-----------|------------------
uuid       | 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103| aronnykevin@gmail.com | cashier | false     | true
```

**Note**: `auth_id` should now have a UUID (not NULL)

### **Step 3: Clear Browser Cache**
```
Windows: Ctrl+Shift+R
Mac: Cmd+Shift+R
```

### **Step 4: Test Cashier Login**

Go to: `http://localhost:5173/cashier-auth`

1. Click "Sign in with Google"
2. Enter: aronnykevin@gmail.com
3. Authenticate

**Expected Result:**
```
✅ User authenticated: aronnykevin@gmail.com
✅ 👤 User data from database: [object with data]
✅ 🔀 Checking user status - Active: false, Profile Complete: true
✅ ⏳ Application submitted - Waiting for admin approval
[Page shows: "Your cashier application is pending admin approval"]
```

### **Step 5: Admin Approves In Admin Portal**

1. Login to Admin Portal: `http://localhost:5173/#admin`
2. Go to Approvals section
3. Find cashier: aronnykevin@gmail.com
4. Click Approve
5. Set is_active = true

### **Step 6: Cashier Login Again**

Go to: `http://localhost:5173/cashier-auth`

**Expected Result:**
```
✅ User authenticated: aronnykevin@gmail.com
✅ 👤 User data from database: [object with full data]
✅ User approved and profile complete - Redirecting to Cashier Portal
✅ Welcome back!
→ Navigated to /employee-portal ✅
```

---

## 🎯 Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Error 42703 | Database query by auth_id fails | auth_id is NULL |
| Query returns null | No record with matching auth_id | Link auth_id field |
| Can't login | Database lookup fails | Run link-cashier-auth.js |
| Shows error "Auth check error" | Unhandled exception in checkAuth() | Once auth_id linked, query succeeds |

**Solution**: Execute `link-cashier-auth.js` to populate auth_id field ✅
