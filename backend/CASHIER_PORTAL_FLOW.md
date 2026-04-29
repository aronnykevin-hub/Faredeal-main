# 🛒 Complete Cashier Portal Access Flow

## 📍 Entry Points

Cashier can access via:
- **Direct URL**: `http://localhost:5173/cashier-auth`
- **Portal Selection**: Choose "Cashier" → Redirects to `/cashier-auth`

---

## 🔐 Authentication Flow

### **Phase 1: Initial Auth Check** (CashierAuth.jsx)

```
1. User loads /cashier-auth
   ↓
2. useEffect runs → checkAuth()
   ↓
3. Checks if returning from OAuth:
   - If yes → Wait 2 seconds for Supabase to process callback
   - If no → Skip wait
   ↓
4. Get authenticated user: supabase.auth.getUser()
   ↓
5. Decision tree based on user status:
```

---

## 🔄 **Two Authentication Methods**

### **Method 1: Google OAuth** (Recommended)

```
User clicks "Sign in with Google"
    ↓
handleGoogleSignIn() triggered
    ↓
supabase.auth.signInWithOAuth({ provider: 'google' })
    ↓
Redirected to Google login
    ↓
User enters Google credentials
    ↓
Redirected back to /cashier-auth with access_token
    ↓
OAuth callback detected (hashParams.has('access_token'))
    ↓
Wait 2 seconds for Supabase to create auth user
    ↓
checkAuth() runs
    ↓
Get authenticated user from auth: supabase.auth.getUser()
    ✅ User now exists in Supabase Auth
```

### **Method 2: Username/Password Login**

```
User enters username + password
    ↓
handleLogin() triggered
    ↓
Query database: SELECT * FROM users WHERE username = ?
    ↓
Verify role = 'cashier'
    ↓
Check if is_active = true (approved by admin)
    ↓
If not approved → Show pending message + signout
    ↓
If approved → Authenticate: supabase.auth.signInWithPassword()
    ↓
Navigate to /employee-portal
```

---

## 🔍 **Critical Query: Linking auth_id**

### **The Problem Currently**

After Google OAuth, CashierAuth.jsx does this:

```javascript
const { data: { user } } = await supabase.auth.getUser();
// user.id = "1a5aa3ab-24a5-46e6-ba97-ed25c25fe103" (from Supabase Auth)

let { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', user.id)  // ❌ LOOKS FOR auth_id IN DATABASE
  .maybeSingle();

// Problem: auth_id IS NULL in database → userData = null
```

### **Why It Fails**

1. User logs in via Google
2. Supabase Auth creates auth user with `id = uuid`
3. **BUT** database users table has `auth_id = NULL` (never populated)
4. Query `.eq('auth_id', user.id)` finds nothing
5. `userData = null`

---

## 📋 **Decision Tree After Auth Check**

### **If userData exists AND auth_id linked:**

```
userData found in database
    ↓
Check role filter: userData.role === 'cashier'?
    ├─ NO → Set userData = null → Go to "First Time" flow
    └─ YES → Continue
    ↓
Check user status:
    ├─ is_active=true && profile_completed=true
    │   → ✅ APPROVED & COMPLETE → Navigate to /employee-portal
    │
    ├─ profile_completed=false
    │   → 📋 INCOMPLETE PROFILE → Show profile form
    │
    └─ is_active=false && profile_completed=true
        → ⏳ PENDING APPROVAL → Show notification + logout
```

### **If userData NOT found (First Time):**

```
userData = null (no database record found)
    ↓
Create new cashier in database:
{
  auth_id: user.id,           ← CRITICAL: Links to Supabase Auth
  email: user.email,
  full_name: user.user_metadata?.full_name,
  role: 'cashier',
  is_active: false,           ← Not approved yet
  profile_completed: false    ← Profile not complete
}
    ↓
Show "Welcome! Please complete your cashier profile" message
    ↓
Display profile completion form
```

---

## 📝 **Profile Completion Flow**

### **3-Step Profile Form**

```
Step 1: Personal Information
├─ Full Name (required)
├─ Date of Birth (required)
├─ Gender (required)
├─ Phone (required)
├─ Address (required)
├─ City (required)
└─ ID Number (required)
    ↓
Step 2: Cashier Information
├─ Shift Preference (required)
│   (morning, afternoon, night)
└─ Till Experience (required)
    ↓
Step 3: Emergency Contact
├─ Emergency Contact Name (required)
└─ Emergency Contact Phone (required)
    ↓
Validate all steps
    ↓
handleCompleteProfile() triggered
    ↓
UPDATE users table:
{
  full_name, date_of_birth, gender, phone,
  address, city, id_number,
  shift, till_experience,
  emergency_contact, emergency_phone,
  profile_completed: true,
  submitted_at: NOW()
}
WHERE auth_id = currentUser.id
    ↓
Show success message: "Your application is pending admin approval"
    ↓
Logout after 2 seconds
    ↓
Reload page
```

---

## ✅ **After Admin Approval**

### **Admin Portal Action**
```
Admin Portal → Approvals section
    ↓
Find cashier application: aronnykevin@gmail.com
    ↓
Click "Approve"
    ↓
UPDATE users SET is_active = true WHERE id = ?
    ↓
Cashier is now approved
```

### **Next Cashier Login**
```
Cashier goes to /cashier-auth
    ↓
checkAuth() runs
    ↓
Query database by auth_id
    ↓
userData found with:
  is_active: true ✅
  profile_completed: true ✅
    ↓
Navigate to /employee-portal ✅
```

---

## 🎯 **Final Portal: /employee-portal**

### **Routes**
- `/employee-portal` → CushierPortal.jsx (EmployeePortal)
- `/employee` → CushierPortal.jsx
- `/cashier-portal` → CushierPortal.jsx
- `/cashier` → CushierPortal.jsx

### **Available Features**
- 🛒 Point of Sale (POS)
- 📦 Inventory Management
- 💳 Payment Processing
- 📊 Transaction History
- 🧾 Receipt Printing
- 🔔 Notifications
- ⚙️ Settings
- 👤 Profile

---

## ⚠️ **Current Issue: Missing auth_id Link**

### **For aronnykevin@gmail.com:**

When they Google OAuth to /cashier-auth:

```
✅ Auth step succeeds (Google OAuth works)
✅ user.id is populated (from Supabase Auth)
❌ Database query fails:
   SELECT * FROM users WHERE auth_id = user.id
   → Error 42703 (undefined column)
   → OR Returns null (no record)
❌ New cashier record created but then:
   ❌ Query tries again: .eq('auth_id', user.id)
   → Still fails because link not established yet
```

### **The Fix: Execute link-cashier-auth.js**

```bash
cd backend
node link-cashier-auth.js
```

This script:
1. ✅ Finds aronnykevin@gmail.com in Supabase Auth
2. ✅ Gets their auth_id from Auth system
3. ✅ Updates database record: SET auth_id = (auth user's uuid)
4. ✅ Verifies the link works

After this, the query will succeed:
```javascript
.eq('auth_id', user.id) → FINDS the record ✅
```

---

## 📊 **Complete Sequence Diagram**

```
CASHIER JOURNEY TO PORTAL

1. ENTRY
   http://localhost:5173/cashier-auth
   ↓
   
2. AUTHENTICATION CHOICE
   ├─ Google OAuth
   │  ├─ Redirect to Google
   │  ├─ User logs in
   │  ├─ Callback to /cashier-auth
   │  ├─ OAuth detected
   │  └─ Wait 2 seconds
   │
   └─ Username/Password
      ├─ Enter credentials
      ├─ Check database
      └─ Authenticate if approved

3. DATABASE CHECK (Critical Point)
   ├─ Query: .eq('auth_id', user.id)
   │  ├─ ✅ IF auth_id linked → Find user
   │  └─ ❌ IF auth_id NULL → No result
   │
   └─ Handle result:
      ├─ Found → Check status
      └─ Not Found → Create new record

4. USER STATUS CHECK
   ├─ Active + Profile Complete
   │  → ✅ Go to /employee-portal
   │
   ├─ Profile Incomplete
   │  → 📋 Show profile form
   │  → Collect info (3 steps)
   │  → Submit
   │  → Wait for admin approval
   │  → Logout
   │
   └─ Pending Approval
      → ⏳ Show message
      → Logout
      → Wait for admin

5. ADMIN APPROVAL (Happens in Admin Portal)
   Admin Portal → Approvals
   → Find cashier
   → Click Approve
   → Set is_active = true

6. NEXT CASHIER LOGIN
   → Auth succeeds ✅
   → Database query succeeds ✅
   → Status check: is_active=true ✅
   → Navigate to /employee-portal ✅

7. PORTAL LOADED
   /employee-portal (CushierPortal.jsx)
   ├─ POS System
   ├─ Inventory
   ├─ Transactions
   ├─ Payments
   └─ Reports
```

---

## 🔧 **Summary: What Must Happen**

For cashier `aronnykevin@gmail.com` to reach the portal:

1. ✅ **Auth System**: User exists in Supabase Auth ← Happens with Google OAuth
2. ✅ **Database Record**: User exists in users table ← CashierAuth.jsx creates it
3. ✅ **Link auth_id**: auth_id field populated ← **CURRENTLY MISSING** 
4. ✅ **Profile Complete**: profile_completed = true ← User submits form
5. ✅ **Admin Approval**: is_active = true ← Admin approves in portal
6. ✅ **Navigate**: Go to /employee-portal ← CashierAuth.jsx navigates

**Step 3 is the issue.** Running `link-cashier-auth.js` fixes it! 🔗
