# 🔧 FIX: Direct Username/Password Authentication Setup

## ❌ Current Errors:
1. `function gen_salt(unknown, integer) does not exist` - pgcrypto extension not enabled
2. `email rate limit exceeded` - Still using Supabase Auth email system

## ✅ Solution Applied:

### 1. **Frontend Updated** (`SupplierAuth.jsx`)
Changed from Supabase Auth to direct database functions:

**Before (Supabase Auth - Email Required):**
```javascript
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
```

**After (Direct Database - NO Email):**
```javascript
await supabase.rpc('direct_supplier_signup', { p_username, p_password, ... })
await supabase.rpc('direct_supplier_login', { p_username, p_password })
```

### 2. **Database Setup Required**

## 🚀 Setup Steps (Run in Supabase SQL Editor):

### Step 1: Enable pgcrypto Extension
```sql
-- File: backend/database/enable-pgcrypto.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Step 2: Create Direct Auth Functions
```sql
-- File: backend/database/direct-username-signup-no-email.sql
-- This creates:
-- - direct_supplier_signup() function
-- - direct_supplier_login() function
-- - approve_supplier_direct() function
```

### Step 3: (Optional) Add Profile Picture Support
```sql
-- File: backend/database/add-profile-picture-columns.sql
-- Adds profile_image_url columns to profile tables
```

## 📝 Complete Setup Instructions:

### In Supabase Dashboard:

1. **Go to SQL Editor** (left sidebar)

2. **Run File #1** - Enable pgcrypto:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
   ✅ You should see: "pgcrypto extension is enabled"

3. **Run File #2** - Copy entire content of `backend/database/direct-username-signup-no-email.sql`
   - Creates signup/login functions
   - Uses bcrypt password hashing
   - No email required!
   
   ✅ You should see: "DIRECT NO-EMAIL AUTHENTICATION - SETUP COMPLETE!"

4. **Run File #3** (Optional) - Copy content of `backend/database/add-profile-picture-columns.sql`
   - Adds profile picture support
   
   ✅ You should see: "Profile picture columns added successfully!"

## ✅ What Changed in Frontend:

### **Signup Flow:**
```javascript
// NO MORE EMAIL!
const { data, error } = await supabase.rpc('direct_supplier_signup', {
  p_username: 'mycompany',           // Just username
  p_password: 'SecurePass123',       // Just password
  p_full_name: 'John Doe',
  p_company_name: 'My Company Ltd',
  p_phone: '+256 700 123 456',       // Optional
  p_business_category: 'Groceries',  // Optional
  p_business_license: 'BL-12345',    // Optional
  p_address: 'Kampala, Uganda'       // Optional
});
```

### **Login Flow:**
```javascript
// NO MORE EMAIL!
const { data, error } = await supabase.rpc('direct_supplier_login', {
  p_username: 'mycompany',      // Just username
  p_password: 'SecurePass123'   // Just password
});
```

### **Session Management:**
- User data stored in localStorage (not Supabase Auth)
- Key: `supermarket_user`
- Contains: id, username, full_name, role, company_name, etc.

## 🎯 How It Works Now:

1. **Signup:**
   - User enters username + password (NO EMAIL!)
   - Database function creates user directly in `users` table
   - Password hashed with bcrypt
   - Status set to `pending` (inactive)
   - Appears in admin approval queue

2. **Login:**
   - User enters username + password
   - Database function verifies credentials
   - Checks if account is active (approved by admin)
   - Returns user data if successful
   - Frontend stores session in localStorage

3. **Admin Approval:**
   - Admin sees pending suppliers
   - Clicks "Approve"
   - Status changes from `pending` to `active`
   - User can now login

## ✅ Benefits:

- ✅ **NO Email Required** - Just username + password
- ✅ **NO Email Rate Limits** - Zero Supabase Auth emails
- ✅ **Unlimited Signups** - No restrictions
- ✅ **Simple & Fast** - Direct database access
- ✅ **Secure** - Bcrypt password hashing
- ✅ **Admin Control** - Manual approval workflow

## 🧪 Testing:

### Test Signup:
1. Go to supplier login page
2. Click "Apply"
3. Fill form with username and password (no email!)
4. Submit
5. Should see: "Supplier application submitted! Pending admin approval"

### Test Login (Before Approval):
1. Try to login with new account
2. Should see: "Account pending admin approval"

### Test Approval:
1. Admin portal → Pending Suppliers
2. Approve the supplier
3. Supplier can now login successfully

### Test Login (After Approval):
1. Login with username + password
2. Should redirect to supplier portal
3. Profile loads from database

## 📂 Files Modified:

### Frontend:
- ✅ `frontend/src/pages/SupplierAuth.jsx` - Updated signup/login to use RPC functions

### Backend (SQL to run):
- ✅ `backend/database/enable-pgcrypto.sql` - Enable password hashing extension
- ✅ `backend/database/direct-username-signup-no-email.sql` - Create auth functions
- ✅ `backend/database/add-profile-picture-columns.sql` - Add profile picture support

## 🔑 Important Notes:

1. **pgcrypto MUST be enabled first** - Run enable-pgcrypto.sql before anything else
2. **No Supabase Auth** - System now bypasses Supabase Auth completely
3. **localStorage sessions** - User data stored client-side
4. **Admin approval required** - New suppliers can't login until approved
5. **Password security** - Bcrypt hashing with salt rounds = 8

## 🆘 Troubleshooting:

### Error: "function gen_salt does not exist"
**Solution:** Run `enable-pgcrypto.sql` first

### Error: "function direct_supplier_signup does not exist"
**Solution:** Run `direct-username-signup-no-email.sql`

### Error: "email rate limit exceeded"
**Solution:** Frontend still calling `supabase.auth.signUp()` - Check code is updated

### Signup works but can't login
**Solution:** Account needs admin approval first

### Login works but portal shows no data
**Solution:** Check localStorage has `supermarket_user` key with user data

## ✅ Current Status:

- [x] Frontend updated to use direct database functions
- [x] SQL files created for database setup
- [ ] **Need to run SQL files in Supabase** ← YOU ARE HERE
- [ ] Test signup/login flow
- [ ] Test admin approval workflow

## 🚀 Next Action:

**Run these 2 SQL files in Supabase SQL Editor (in order):**

1. `backend/database/enable-pgcrypto.sql`
2. `backend/database/direct-username-signup-no-email.sql`

Then test signup with just username + password!

---

**Created:** ${new Date().toLocaleString()}
**Issue:** Email rate limits + gen_salt function missing
**Solution:** Direct database authentication with bcrypt
