# 🧪 Admin Authentication - Testing & Troubleshooting

## 🎯 Current Setup

Your admin portal now requires **proper authentication** through Supabase. Here's how it works:

### Access Flow
```
User visits http://localhost:5173/#admin
    ↓
Redirects to /admin-login
    ↓
User logs in with Supabase credentials
    ↓
Redirects to /admin-portal
    ↓
User accesses admin features
```

---

## ✅ Step-by-Step Testing

### Test 1: Fresh Start (No Login)

**Steps:**
1. Open browser in **Incognito/Private mode**
2. Navigate to: `http://localhost:5173/#admin`
3. **Expected:** Should redirect to `/admin-login`
4. **Expected:** Should see the beautiful login page

**If it doesn't work:**
```javascript
// Open browser console (F12) and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Test 2: Login with Existing Account

**Steps:**
1. On the login page, enter:
   - **Email:** `heradmin@faredeal.ug`
   - **Password:** `Administrator`
2. Click "Login to Portal"
3. **Expected:** Green success message "Welcome back, Admin!"
4. **Expected:** Redirect to `/admin-portal` within 0.5 seconds
5. **Expected:** See admin dashboard

**If login fails:**
```javascript
// Test Supabase connection in console:
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'heradmin@faredeal.ug',
  password: 'Administrator'
});
console.log('Result:', { data, error });
```

### Test 3: Create New Admin Account

**Steps:**
1. On login page, click **"Sign Up"** tab
2. Fill in:
   - **Full Name:** Your Name
   - **Email:** newemail@faredeal.ug
   - **Phone:** +256 700 123 456 (optional)
   - **Password:** SecurePass123!
   - **Confirm Password:** SecurePass123!
3. Watch the password strength meter turn green
4. Click "Create Account"
5. **Expected:** Success message
6. **Expected:** Auto-switch to Login tab
7. Login with new credentials
8. **Expected:** Redirect to admin portal

### Test 4: Protected Route Access

**Steps:**
1. Logout from admin portal
2. Manually type in URL: `http://localhost:5173/admin-portal`
3. **Expected:** Automatic redirect to `/admin-login`
4. Login successfully
5. **Expected:** Return to `/admin-portal`

### Test 5: Session Persistence

**Steps:**
1. Login to admin portal
2. Press **F5** to refresh
3. **Expected:** Still logged in, no redirect
4. Close browser tab
5. Reopen: `http://localhost:5173/#admin`
6. **Expected:** Go directly to admin portal (session persists)

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot find module supabase"

**Error in console:**
```
Error: Cannot find module '../services/supabase'
```

**Fix:**
```powershell
# Make sure supabase is installed
cd C:\Users\Aban\Desktop\FD\frontend
npm install @supabase/supabase-js
```

### Issue 2: Login page doesn't show

**Symptoms:** Blank page or loading forever

**Fix:**
```javascript
// Check in browser console:
console.log('Current path:', window.location.pathname);
console.log('Admin key:', localStorage.getItem('adminKey'));

// Clear everything:
localStorage.clear();
sessionStorage.clear();
location.href = '/admin-login';
```

### Issue 3: Redirect loop (keeps redirecting)

**Symptoms:** Page keeps bouncing between login and portal

**Fix:**
```javascript
// Run in console:
await supabase.auth.signOut();
localStorage.clear();
location.href = '/admin-login';
```

### Issue 4: Login doesn't redirect to portal

**Symptoms:** Login succeeds but stays on login page

**Fix - Check console for errors:**
```javascript
// Test navigate function:
console.log('Testing navigation...');
window.location.href = '/admin-portal';
```

**If React Router isn't working:**
```javascript
// In AdminAuth.jsx, replace:
navigate('/admin-portal');

// With:
window.location.href = '/admin-portal';
```

### Issue 5: "Invalid login credentials"

**Symptoms:** Can't login with heradmin@faredeal.ug

**Fix - Verify account exists:**
```powershell
cd C:\Users\Aban\Desktop\FD\backend
node verify-admin.js
```

**Or create new admin:**
```powershell
node create-admin.js
```

### Issue 6: Password strength meter not showing

**Symptoms:** Meter stays at 0% or doesn't appear

**Fix:** This is normal behavior - it only shows during **Signup**, not Login

---

## 🔧 Manual Testing Commands

### Check Supabase Connection
```javascript
// Paste in browser console:
const testSupabase = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('✅ Supabase connected');
    console.log('Session:', data.session ? 'Active' : 'None');
    return true;
  } catch (error) {
    console.error('❌ Supabase error:', error);
    return false;
  }
};
testSupabase();
```

### Test Login Programmatically
```javascript
// Quick login test:
const quickLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'heradmin@faredeal.ug',
    password: 'Administrator'
  });
  if (error) {
    console.error('❌ Login failed:', error);
  } else {
    console.log('✅ Login successful!');
    console.log('User:', data.user.email);
    localStorage.setItem('adminKey', 'true');
    window.location.href = '/admin-portal';
  }
};
quickLogin();
```

### Force Logout
```javascript
// Complete logout and reset:
const forceLogout = async () => {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Logged out completely');
  window.location.href = '/admin-login';
};
forceLogout();
```

### Check Current User
```javascript
// Who am I logged in as?
const whoAmI = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) {
    console.log('✅ Logged in as:', user.email);
    console.log('User ID:', user.id);
    console.log('Created:', new Date(user.created_at).toLocaleString());
  } else {
    console.log('❌ Not logged in');
  }
};
whoAmI();
```

---

## 📊 Debugging Checklist

Run through this checklist if things aren't working:

- [ ] Frontend dev server is running (`npm run dev`)
- [ ] No console errors in browser (F12)
- [ ] Supabase credentials in `.env` file
- [ ] `.env` file has correct format (no quotes around values)
- [ ] Admin account exists in Supabase
- [ ] Browser cache cleared
- [ ] localStorage cleared
- [ ] Using correct URL format
- [ ] React Router is working (other routes load)
- [ ] AdminAuth component renders without errors

---

## 🎯 Expected Console Output

### On Page Load (Admin Login)
```
Admin mode setup: (no errors)
✅ AdminAuth component mounted
```

### On Successful Login
```
✅ Login successful
User: heradmin@faredeal.ug
Redirecting to admin portal...
```

### On Protected Route Access
```
Checking authentication...
✅ Session valid
Allowing access to /admin-portal
```

### On Logout
```
Logging out...
✅ Logout successful
Redirecting to login...
```

---

## 🚀 Quick Fix Script

If nothing works, run this complete reset:

```javascript
// === COMPLETE RESET SCRIPT ===
// Paste this entire block in browser console

const completeReset = async () => {
  console.log('🔄 Starting complete reset...\n');
  
  // Step 1: Sign out
  console.log('1. Signing out from Supabase...');
  try {
    await supabase.auth.signOut();
    console.log('   ✅ Signed out\n');
  } catch (e) {
    console.log('   ⚠️  Already signed out\n');
  }
  
  // Step 2: Clear storage
  console.log('2. Clearing all storage...');
  localStorage.clear();
  sessionStorage.clear();
  console.log('   ✅ Storage cleared\n');
  
  // Step 3: Test Supabase
  console.log('3. Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('   ✅ Supabase connected\n');
  } catch (e) {
    console.log('   ❌ Supabase error:', e.message, '\n');
  }
  
  // Step 4: Redirect
  console.log('4. Redirecting to login page...');
  setTimeout(() => {
    window.location.href = '/admin-login';
  }, 1000);
  
  console.log('\n✅ Reset complete! Redirecting...');
};

completeReset();
```

---

## 📝 Environment Check

### Verify .env File
```env
# File: frontend/.env

VITE_SUPABASE_URL=https://zwmupgbixextqlexknnu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-key...
VITE_API_URL=http://localhost:3001/api
VITE_ENVIRONMENT=development
```

**Important:**
- No quotes around values
- No spaces around `=`
- File must be named exactly `.env`
- Must be in `frontend/` folder
- Restart dev server after changing

### Verify Admin Account
```powershell
cd C:\Users\Aban\Desktop\FD\backend
node verify-admin.js
```

**Expected output:**
```
✅ Admin account found!
📧 Email: heradmin@faredeal.ug
🆔 User ID: 399d9128-0b41-4a65-9124-24d8f0c7b4bb
```

---

## 🎉 Success Indicators

You know it's working when:

1. ✅ Visiting `#admin` redirects to `/admin-login`
2. ✅ Login page shows beautiful gradient background
3. ✅ Can toggle between Login and Signup tabs
4. ✅ Password show/hide toggle works
5. ✅ Login with valid credentials shows success message
6. ✅ After login, redirects to `/admin-portal`
7. ✅ Can access admin profile
8. ✅ Logout redirects to login page
9. ✅ Session persists after refresh
10. ✅ Protected routes require authentication

---

## 📞 Still Not Working?

### Check These Files Exist:
```
frontend/src/
  ├── pages/
  │   ├── AdminAuth.jsx ✅
  │   ├── AdminPortal.jsx ✅
  │   └── AdminProfile.jsx ✅
  ├── components/
  │   └── AdminProtectedRoute.jsx ✅
  ├── services/
  │   └── supabase.js ✅
  └── App.jsx ✅
```

### Verify Imports:
```javascript
// In App.jsx
import AdminAuth from '@/pages/AdminAuth';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';

// In AdminAuth.jsx
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
```

### Test Individual Components:
```javascript
// Test if AdminAuth loads:
window.location.href = '/admin-login';

// Test if protected route works:
window.location.href = '/admin-portal';
```

---

## 💡 Pro Tips

1. **Always test in Incognito** - Avoids cache issues
2. **Keep console open** - Catch errors immediately
3. **Use password manager** - Don't forget test credentials
4. **Clear storage often** - Prevents stale data issues
5. **Test logout** - Ensures clean state management

---

## 📚 Related Documentation

- **ADMIN_AUTH_GUIDE.md** - Complete feature guide
- **ADMIN_AUTH_SUMMARY.md** - Implementation details
- **ADMIN_ACCESS_FLOW.md** - Flow diagrams
- **QUICK_START.md** - Fast setup guide

---

## 🎯 Next Steps

Once everything is working:

1. Test signup flow with new email
2. Test password strength meter
3. Try forgetting password (feature coming soon)
4. Test on mobile device
5. Test session expiry
6. Add more admin users
7. Customize the login page design

---

**Need more help? Check the console for specific errors and use the debugging commands above!** 🚀
