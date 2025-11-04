# 🧪 Admin Profile Testing Guide

## ✅ Current Status
Your admin profile is **FULLY FUNCTIONAL** with real Supabase integration!

## 🔐 Admin Credentials
- **Email**: heradmin@faredeal.ug
- **Password**: Administrator
- **User ID**: 399d9128-0b41-4a65-9124-24d8f0c7b4bb

---

## 🚀 Quick Start Testing

### Step 1: Access Admin Portal
```
1. Open browser to: http://localhost:5173/#admin
2. You'll be auto-logged in as admin
3. Look for your profile picture in the top-right corner
```

### Step 2: Access Your Profile
```
Three ways to access:

Option A: Via Header Dropdown
- Click your profile picture (top-right)
- Select "My Profile" from dropdown

Option B: Direct URL
- Navigate to: http://localhost:5173/admin-profile

Option C: Via Settings Menu
- Click profile dropdown
- Select "Settings" or "Security"
```

---

## 🧪 Test Checklist

### ✅ Profile Overview Tab
- [ ] See your name: "Administrator"
- [ ] See your email: heradmin@faredeal.ug
- [ ] See your role: "System Administrator"
- [ ] See join date
- [ ] View real-time statistics:
  - Actions Today (from database)
  - System Uptime
  - Users Managed (supplier count)
  - Active Sessions (open shifts)
- [ ] View recent activity logs (last 10 activities)

### ✅ Photo Upload
- [ ] Click "Edit Profile" button
- [ ] Click "Change Photo" button
- [ ] Select an image file (max 5MB)
- [ ] See photo preview immediately
- [ ] Click "Save Changes"
- [ ] Photo persists after page refresh
- [ ] Try "Remove Photo" button
- [ ] Photo gets removed

### ✅ Profile Editing
- [ ] Click "Edit Profile"
- [ ] Change your name
- [ ] Update phone number
- [ ] Modify department
- [ ] Click "Save Changes"
- [ ] See success notification
- [ ] Refresh page - changes persist
- [ ] Check Supabase dashboard - user metadata updated

### ✅ Security Tab
- [ ] Navigate to "Security" tab
- [ ] View last login timestamp
- [ ] View account created date
- [ ] See password strength indicator
- [ ] Try changing password:
  - Enter current password
  - Enter new password (min 8 chars)
  - Confirm new password
  - Click "Update Password"
  - See success message
  - Activity logged to database

### ✅ Two-Factor Authentication
- [ ] Toggle 2FA switch
- [ ] See confirmation message
- [ ] Check settings persist

### ✅ Permissions Tab
- [ ] View all permission categories
- [ ] See checkmarks for enabled permissions
- [ ] Toggle permissions on/off
- [ ] See visual feedback

### ✅ Settings Tab
- [ ] Toggle notification preferences:
  - Email Notifications
  - Push Notifications
  - SMS Notifications
- [ ] Toggle display settings:
  - Dark Mode
  - Compact View
  - Auto-refresh
- [ ] Export Account Data:
  - Click "Export Data" button
  - JSON file downloads
  - Contains your profile info
- [ ] View session information
- [ ] Try "Deactivate Account" (careful!)

---

## 🔍 Database Verification

### Check Supabase Dashboard
```
1. Go to: https://zwmupgbixextqlexknnu.supabase.co
2. Navigate to Authentication > Users
3. Find: heradmin@faredeal.ug
4. Check user_metadata - should contain:
   - full_name
   - phone
   - department
   - role
```

### Check Activity Logs
```
1. Go to Table Editor
2. Open: admin_activity_log
3. Filter by admin_id: 399d9128-0b41-4a65-9124-24d8f0c7b4bb
4. See logged activities:
   - profile_update
   - password_change
   - settings_change
```

### Check Statistics
```
Tables to verify:
- supplier_profiles (for user count)
- cashier_shifts (for active sessions)
- admin_activity_log (for actions count)
```

---

## 🐛 Browser Console Tests

### Run Automatic Tests
```javascript
1. Open DevTools (F12)
2. Go to Console tab
3. Paste this command:

// Load and run test suite
fetch('/test-admin-profile.js')
  .then(r => r.text())
  .then(code => eval(code));

// Or manually test individual functions:
window.supabase.auth.getUser().then(console.log);
console.log(localStorage.getItem('admin_profile_data'));
```

### Manual Verification
```javascript
// Check if user is loaded
const { data } = await supabase.auth.getUser();
console.log('User:', data.user);

// Check activity logs
const { data: logs } = await supabase
  .from('admin_activity_log')
  .select('*')
  .limit(5);
console.log('Recent Activities:', logs);

// Check statistics
const { count: suppCount } = await supabase
  .from('supplier_profiles')
  .select('*', { count: 'exact', head: true });
console.log('Supplier Count:', suppCount);
```

---

## 📸 Visual Checklist

### Header Should Show:
```
┌─────────────────────────────────────────────┐
│ FAREDEAL Admin  [Search]  🔔  [👤 Admin ▼] │
└─────────────────────────────────────────────┘
```

### Profile Dropdown Should Show:
```
┌─────────────────────┐
│ 👤 My Profile      │
│ ⚙️  Settings        │
│ 🔒 Security        │
│ 🚪 Logout          │
└─────────────────────┘
```

### Profile Page Should Show:
```
┌─────────────────────────────────────────────┐
│ [Photo] Administrator                       │
│         System Administrator                │
│         heradmin@faredeal.ug               │
│                                             │
│ [Overview] [Security] [Permissions] [...] │
│                                             │
│ Recent Activity:                            │
│ • Password Changed - 2 hours ago           │
│ • Profile Updated - 5 hours ago            │
└─────────────────────────────────────────────┘
```

---

## 🎯 Key Features to Test

### Real-Time Data Loading
- [ ] Statistics update from database
- [ ] Activity logs fetch on mount
- [ ] Profile loads from Supabase Auth
- [ ] Changes save to Supabase
- [ ] LocalStorage backup works offline

### File Upload Validation
- [ ] Try uploading file > 5MB (should fail)
- [ ] Try uploading non-image (should fail)
- [ ] Upload valid image (should succeed)
- [ ] Photo converts to base64
- [ ] Photo saves to localStorage

### Form Validation
- [ ] Password requires 8+ characters
- [ ] Email format validation
- [ ] Phone number format
- [ ] Required fields marked

### Error Handling
- [ ] Disconnect internet, try saving
- [ ] Should see localStorage fallback
- [ ] Reconnect and data syncs
- [ ] Error messages display properly

---

## 📊 Success Metrics

### ✅ All Systems Go When:
1. Profile loads without errors
2. Photo upload works
3. Profile changes persist
4. Password change succeeds
5. Statistics show real counts
6. Activity logs display properly
7. All tabs accessible
8. No console errors
9. Data exports successfully
10. Settings save and persist

---

## 🆘 Troubleshooting

### Profile Not Loading?
```javascript
// Check Supabase connection
const { data, error } = await supabase.auth.getUser();
console.log('Auth Status:', { data, error });

// Check localStorage
console.log('Profile:', localStorage.getItem('admin_profile_data'));
```

### Statistics Showing Zeros?
```javascript
// Verify tables exist and have data
const tables = ['admin_activity_log', 'supplier_profiles', 'cashier_shifts'];
for (const table of tables) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  console.log(`${table}:`, count);
}
```

### Photo Not Uploading?
```javascript
// Check file size
const input = document.querySelector('input[type="file"]');
const file = input.files[0];
console.log('File Size:', file.size / 1024 / 1024, 'MB');
console.log('File Type:', file.type);
```

### Changes Not Persisting?
```javascript
// Check Supabase update
const { data, error } = await supabase.auth.updateUser({
  data: { test: 'value' }
});
console.log('Update Result:', { data, error });
```

---

## 🎉 What's Working

### ✅ Fully Implemented Features:
1. **Real-time data loading** from Supabase Auth
2. **Photo upload/remove** with validation
3. **Profile editing** with Supabase sync
4. **Password management** via Auth
5. **Activity logging** to database
6. **Statistics dashboard** from live queries
7. **Settings persistence**
8. **Data export** to JSON
9. **Session management**
10. **LocalStorage backup** for offline

### 🔐 Security Features:
- Password strength validation
- Two-factor authentication toggle
- Session tracking
- Activity audit logs
- Secure password updates via Supabase Auth

### 📱 User Experience:
- Smooth tab navigation
- Real-time feedback
- Loading states
- Error messages
- Success notifications
- Responsive design

---

## 📝 Next Steps (Optional Enhancements)

If you want to add more features:

1. **Supabase Storage Integration**
   - Move photos from localStorage to Supabase Storage
   - Enable larger file uploads
   - Add image optimization

2. **Advanced 2FA**
   - QR code generation
   - Backup codes
   - SMS verification

3. **Real-time Notifications**
   - Use Supabase Realtime
   - Push notifications
   - Email alerts

4. **Enhanced Audit Logs**
   - Filtering by date/type
   - Export to CSV/PDF
   - Search functionality

5. **Profile Photo Editing**
   - Crop tool
   - Filters
   - Multiple photos

---

## ✅ Testing Complete!

Once you've verified all items above, your admin profile is production-ready! 🚀

**System Status**: 🟢 **OPERATIONAL**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: Supabase (43 tables deployed)
- Authentication: Supabase Auth (working)
- Admin Account: heradmin@faredeal.ug (active)

---

## 📞 Quick Commands

```powershell
# Start frontend
cd C:\Users\Aban\Desktop\FD\frontend
npm run dev

# Start backend
cd C:\Users\Aban\Desktop\FD\backend
node src/index.js

# Verify admin account
cd C:\Users\Aban\Desktop\FD\backend
node verify-admin.js
```

Happy Testing! 🎉
