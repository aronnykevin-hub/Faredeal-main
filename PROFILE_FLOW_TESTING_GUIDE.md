# ✅ Profile Completion Flow - Testing Guide

## 🎯 How It Works Now

### Flow Logic:
```
User Signs In (Google/Magic Link/Password)
    ↓
Check User Status:
    ↓
1. ✅ APPROVED (is_active = true)
   → Redirect to Employee Portal immediately
    ↓
2. ❌ PROFILE NOT COMPLETED (profile_completed = false)
   → Show beautiful 3-step profile completion form
   → User fills all details
   → Profile saved (profile_completed = true)
   → User signed out
   → Message: "Wait for admin approval"
    ↓
3. ⏳ PROFILE COMPLETED BUT NOT APPROVED
   → Show message: "Pending admin approval"
   → Auto sign out after 2 seconds
   → User must wait for admin
```

## 🧪 Test Scenarios

### Scenario 1: New User (First Time Google Sign-In)
**Steps:**
1. Go to `/employee-auth`
2. Click "Sign in with Google"
3. Complete Google authentication
4. **Expected:** Redirected back to `/employee-auth`
5. **Expected:** Beautiful profile completion form appears 🎨
6. Fill Step 1 (Personal Info)
7. Click "Next Step"
8. Fill Step 2 (Work Info)
9. Click "Next Step"
10. Fill Step 3 (Emergency Contact)
11. Click "🎉 Submit Application"
12. **Expected:** Success message
13. **Expected:** Auto sign out
14. **Expected:** Back to login screen

**Database Check:**
```sql
SELECT 
  email, 
  full_name, 
  profile_completed, 
  is_active,
  position,
  emergency_contact
FROM users 
WHERE email = 'test@gmail.com';
```
Should show:
- `profile_completed` = `true`
- `is_active` = `false`

---

### Scenario 2: Incomplete Profile (User Started but Didn't Finish)
**Steps:**
1. User previously signed in with Google but closed browser
2. Go to `/employee-auth`
3. Sign in with Google again
4. **Expected:** Profile completion form appears
5. **Expected:** Previously entered data is loaded (if any)
6. Complete remaining steps
7. Submit

**Why:** The `profile_completed` flag is still `false`

---

### Scenario 3: Completed Profile Waiting for Approval
**Setup:**
- User has `profile_completed = true`
- User has `is_active = false` (not yet approved by admin)

**Steps:**
1. Go to `/employee-auth`
2. Sign in with Google/Magic Link/Password
3. **Expected:** Message: "⏳ Your account is pending admin approval"
4. **Expected:** User is auto signed out after 2 seconds
5. **Expected:** Cannot access Employee Portal

**Why:** We don't want users staying logged in while waiting for approval

---

### Scenario 4: Approved User (Happy Path)
**Setup:**
- Admin has approved user
- User has `is_active = true`
- User has `profile_completed = true`

**Steps:**
1. Go to `/employee-auth`
2. Sign in with Google/Magic Link/Password
3. **Expected:** Immediately redirected to `/employee-portal` ✅
4. **Expected:** NO profile form shown
5. **Expected:** User can access all portal features

**Why:** Approved users skip everything and go straight to work!

---

### Scenario 5: Traditional Signup (Full Form)
**Steps:**
1. Go to `/employee-auth`
2. Click "Create Account"
3. Fill complete signup form (all fields)
4. Submit
5. **Expected:** Success message
6. **Expected:** "Pending admin approval" message
7. Try to login
8. **Expected:** "Pending approval" message
9. **Expected:** Auto signed out

**Database Check:**
- `profile_completed` = `true` (all data from signup)
- `is_active` = `false`

---

### Scenario 6: Magic Link (Passwordless)
**Steps:**
1. Go to `/employee-auth`
2. Toggle to "📧 Email Link"
3. Enter email
4. Click "Send Magic Link"
5. Check email
6. Click magic link
7. **Expected:** Redirected to `/employee-auth`
8. **If new user:** Profile completion form appears
9. **If returning user:** Check status (approved/pending)

---

## 🔍 Admin Approval Process

### Admin Side:
1. Admin logs into Admin Portal
2. Goes to "User Management" or "Pending Users"
3. Sees employee with:
   - ✅ Full name, email, phone
   - ✅ Address, city, date of birth
   - ✅ Position, availability, education
   - ✅ Experience, skills
   - ✅ Emergency contact details
4. Admin clicks "Approve" button
5. Database updated: `is_active = true`
6. Employee receives notification (if implemented)

### Employee Side After Approval:
1. Employee tries to sign in again
2. **Expected:** Direct access to Employee Portal ✅
3. No profile form shown
4. Full portal features available

---

## 🐛 Debugging

### Issue: Profile form not showing for new user
**Check:**
```sql
-- See if user record was created
SELECT * FROM users WHERE email = 'user@gmail.com';

-- Check profile_completed flag
SELECT profile_completed FROM users WHERE email = 'user@gmail.com';
```
**Should be:** `false` for new users

---

### Issue: User goes straight to portal without approval
**Check:**
```sql
SELECT is_active FROM users WHERE email = 'user@gmail.com';
```
**Should be:** `false` until admin approves

---

### Issue: Profile form shows for approved users
**Check:**
```sql
SELECT is_active, profile_completed FROM users WHERE email = 'user@gmail.com';
```
**Should be:** Both `true` for approved users

---

### Issue: Data not saving from profile form
**Check browser console for errors**
**Run SQL migration:**
```bash
# Make sure all columns exist
backend/database/add-employee-profile-fields.sql
```

---

## ✅ Success Criteria

### ✓ New Users
- [x] Can sign in with Google/Magic Link/Password
- [x] See beautiful profile completion form
- [x] Complete 3 steps easily
- [x] Data saves to database
- [x] Auto signed out after completion
- [x] Cannot access portal until approved

### ✓ Returning Users (Not Approved)
- [x] Profile form appears if incomplete
- [x] Previous data is loaded
- [x] Pending message if profile complete
- [x] Auto signed out (don't stay logged in)

### ✓ Approved Users
- [x] Skip profile form entirely
- [x] Direct access to Employee Portal
- [x] No interruptions
- [x] Fast and smooth experience

### ✓ Admin
- [x] See complete employee profiles
- [x] All necessary information available
- [x] Can approve/reject easily
- [x] Professional hiring process

---

## 💡 User Experience

### For New Employees:
🎨 **Beautiful UI** with:
- Animated progress bar
- Step-by-step guidance
- Visual feedback on filled fields
- Smooth transitions
- Clear instructions
- Mobile responsive

### For Approved Employees:
⚡ **Lightning Fast:**
- No forms to fill
- Instant portal access
- Ready to work immediately

### For Admins:
📊 **Complete Information:**
- Full employee profiles
- Emergency contacts
- Work preferences
- Skills and experience
- All in one place

---

## 🚀 Summary

The system now **intelligently handles** all signup methods:

✅ **Google Sign-In** → Profile form → Approval → Portal  
✅ **Magic Link** → Profile form → Approval → Portal  
✅ **Password Signup** → (Already has profile) → Approval → Portal  

**Key Feature:** Only shows profile form when needed!
- ❌ Not shown to approved users
- ❌ Not shown if already completed
- ✅ Only shown to incomplete profiles

This creates a **smooth, professional onboarding experience** while maintaining security and complete employee records! 🎉
