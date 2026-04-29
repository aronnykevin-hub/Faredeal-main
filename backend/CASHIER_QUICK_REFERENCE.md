# 🎯 Cashier Portal Access - Quick Reference

## 📍 Where Cashier Starts
```
URL: http://localhost:5173/cashier-auth
File: frontend/src/pages/CashierAuth.jsx
```

---

## 🔑 Two Login Options

### 1️⃣ **Google OAuth** (Current issue)
```
[Sign in with Google]
     ↓
Redirect to Google
     ↓
User authenticates
     ↓
Callback to /cashier-auth with access_token
     ↓
CashierAuth detects OAuth callback
     ↓
Waits 2 seconds for Supabase to process
     ↓
Calls checkAuth()
     ↓
Gets auth user: user.id = UUID
     ↓
❌ PROBLEM: Queries database with this auth_id
   But auth_id is NULL in database
   Query fails → userData = null
```

### 2️⃣ **Username/Password**
```
[Login Form]
     ↓
User enters username + password
     ↓
Query: SELECT * FROM users WHERE username = ?
     ↓
If found AND is_active=true
     → Authenticate with password
     → Navigate to /employee-portal
```

---

## 🔍 The Critical Query (Line 94-97 CashierAuth.jsx)

```javascript
let { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', user.id)          // ← FILTER BY auth_id
  .maybeSingle();
```

### ⚠️ This Fails Because:
```
user.id (from Supabase Auth)     = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
users.auth_id (in database)      = NULL (NOT LINKED)
Query result                      = No match → userData = null
```

---

## 📊 Complete User Status Check (After Query)

```
┌─ userData found?
├─ YES
│  ├─ Check: role == 'cashier'?
│  │  ├─ NO → userData = null → Create new
│  │  └─ YES → Continue
│  │
│  └─ Check user status:
│     ├─ is_active=true && profile_completed=true
│     │  → ✅ Go to /employee-portal
│     ├─ profile_completed=false
│     │  → 📋 Show profile form
│     └─ is_active=false && profile_completed=true
│        → ⏳ Show pending message + logout
│
└─ NO (userData=null)
   ├─ Create new cashier record in database
   │  with auth_id linked to this user ✅
   │  is_active=false (not approved)
   │  profile_completed=false (form incomplete)
   └─ Show profile form
```

---

## 📋 Profile Completion (When userData=null)

CashierAuth.jsx inserts new record:
```javascript
const { data: newUser, error: createError } = await supabase
  .from('users')
  .insert([{
    auth_id: user.id,                    // ✅ LINKS HERE
    email: user.email,
    full_name: user.user_metadata?.full_name,
    role: 'cashier',
    is_active: false,                    // Not approved
    profile_completed: false             // Form not done
  }])
  .select()
  .single();
```

Then shows profile form with 3 steps:
1. Personal info (name, DOB, phone, address, city, ID)
2. Cashier info (shift, experience)
3. Emergency contact

After submission → Waits for admin approval → Logout

---

## 👤 User Journey

```
START: aronnykevin@gmail.com
  ↓
[/cashier-auth]
  ↓
Click: Sign in with Google
  ↓
[Google OAuth]
  ↓
Return with auth user:
{
  id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",
  email: "aronnykevin@gmail.com"
}
  ↓
Query database:
  WHERE auth_id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
  ↓
❌ NO MATCH (auth_id is NULL in database)
  ↓
Create new record:
{
  auth_id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",  ← LINKED ✅
  role: "cashier",
  is_active: false,
  profile_completed: false
}
  ↓
[Show Profile Form]
  ↓
User fills: name, phone, address, shift, emergency contact
  ↓
Submit profile
  ↓
UPDATE users SET profile_completed=true, submitted_at=NOW()
  ↓
✅ Success message: "Pending admin approval"
  ↓
Logout + Reload
  ↓
[Wait for admin]
  ↓
ADMIN PORTAL: Approve cashier
→ UPDATE users SET is_active=true
  ↓
Cashier logs in again
  ↓
Query database:
  WHERE auth_id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
  ↓
✅ FOUND:
{
  auth_id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103",
  role: "cashier",
  is_active: true,              ← APPROVED ✅
  profile_completed: true       ← COMPLETE ✅
}
  ↓
Check status:
  - is_active=true ✅
  - profile_completed=true ✅
  ↓
Navigate to /employee-portal
  ↓
✅ PORTAL LOADED: CushierPortal.jsx
```

---

## 🐛 Current Problem

```
Step: Create new record
  ↓
Insert with auth_id: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"  ✅
  ↓
Show profile form  ✅
  ↓
User fills form  ✅
  ↓
Submit profile  ✅
  ↓
BUT: When app restarts or page refreshes
  ↓
Query: WHERE auth_id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
  ↓
❌ FAILS because:
   - Old code inserted but auth_id didn't sync
   - OR auth_id is NULL somewhere
   - Query gets error 42703 or 400
```

---

## ✅ The Fix

### **Run One Command:**
```bash
cd backend
node link-cashier-auth.js
```

### **What It Does:**
1. Gets auth user: "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
2. Finds database cashier record
3. Sets auth_id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
4. Verifies link works

### **Result:**
- Query now finds the record ✅
- Cashier can see their profile ✅
- Can await admin approval ✅
- Can access portal after approval ✅

---

## 🎯 The Files Involved

| File | Purpose | Line |
|------|---------|------|
| CashierAuth.jsx | Auth logic | 91-97 |
| CashierAuth.jsx | Profile form | 170-243 |
| CashierAuth.jsx | Complete profile | 204-227 |
| CushierPortal.jsx | Main portal | 1-50 |
| App.jsx | Routing | 115, 172 |

---

## 🔄 After Fix Complete

### **Sequence:**
```
1. Run: node link-cashier-auth.js
   → auth_id now linked ✅

2. Clear browser cache
   → Ctrl+Shift+R

3. Cashier logins again
   → Auth succeeds ✅
   → Database query succeeds ✅
   → Profile shown ✅

4. Admin approves in Admin Portal
   → Set is_active=true ✅

5. Cashier logins again
   → Goes to /employee-portal ✅

6. Portal loads
   → Cashier Dashboard ✅
```

---

## 📌 Key Points

✅ **Google OAuth works** - Creates auth user  
✅ **CashierAuth.jsx works** - Creates database record  
❌ **Link missing** - auth_id field NULL → Query fails  
✅ **link-cashier-auth.js fixes it** - Populates auth_id  
✅ **Everything works after** - Next login succeeds  

**One command solves it all:** `node link-cashier-auth.js`
