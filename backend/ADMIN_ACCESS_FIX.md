# 🔧 QUICK FIX: Admin Access Denied

Your login works, but you don't have admin permissions. Here's the fix:

---

## 🚀 **3-Step Fix (5 minutes)**

### **Step 1: Run Database Setup SQL**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select **Faredeal** project
3. Click **SQL Editor** → **New Query**
4. Copy all content from: `backend/CREATE_ADMIN_USER.sql`
5. Paste into SQL editor
6. Click **Run**

**You should see output showing the admin user was created ✅**

---

### **Step 2: Find Your Auth User ID**

1. Still in Supabase, click **Authentication** (left sidebar)
2. Click **Users** tab
3. Find the user: **abanabaasa2@gmail.com**
4. Click on the user email to open details
5. **Copy the User ID** (looks like: `123e4567-e89b-12d3-a456-426614174000`)

**Important**: Make sure it says "Confirmed" next to the user ✅

---

### **Step 3: Link Auth to Database**

1. Go back to **SQL Editor**
2. Click **New Query**
3. Paste this (replace the ID):

```sql
UPDATE public.users 
SET auth_id = 'PASTE_YOUR_AUTH_USER_ID_HERE'
WHERE email = 'abanabaasa2@gmail.com';

-- Verify it worked
SELECT id, email, role, auth_id 
FROM public.users 
WHERE email = 'abanabaasa2@gmail.com';
```

4. Replace `PASTE_YOUR_AUTH_USER_ID_HERE` with the UUID you copied
5. Click **Run**

---

## ✅ **You're Done!**

Now:
1. **Logout** from the admin portal
2. **Login again** with:
   - Email: `abanabaasa2@gmail.com`
   - Password: `Test123456`
3. You should now see the admin dashboard! 🎉

---

## ❌ **Still Not Working?**

**If you still see "Access Denied"**, check:

1. **Verify the user was created:**
   ```sql
   SELECT email, role, auth_id, is_active 
   FROM public.users 
   WHERE email = 'abanabaasa2@gmail.com';
   ```
   You should see:
   ```
   email                 | role  | auth_id      | is_active
   abanabaasa2@gmail.com | admin | [UUID here]  | true
   ```

2. **Verify auth user is confirmed:**
   - Go to Auth → Users
   - Check if `abanabaasa2@gmail.com` shows **"Confirmed" ✅**
   - If not, click the user and "Confirm email"

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Open DevTools (F12) and check Console for errors

---

## 📞 **Alternative: Automated Script**

If you prefer automated setup:

```bash
cd backend
node setup-admin-credentials.js
```

This will automatically link the auth user to the database!

---

**Questions?** Check the browser console (F12) for detailed error messages.
