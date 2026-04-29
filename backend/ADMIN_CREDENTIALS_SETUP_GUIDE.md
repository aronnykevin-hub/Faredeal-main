# 🔐 Admin Credentials Setup Guide

## Problem
Login with email `abanabaasa2@gmail.com` and password `Test123456` is returning "Invalid login credentials" error.

## Solution

You have **3 options** to fix this. Choose the one that works best for you:

---

## ✅ Option 1: Automated Setup (RECOMMENDED)

This is the easiest and fastest method.

### Prerequisites
Make sure your `backend/.env` has:
```env
SUPABASE_URL=https://zwmupgbixextqlexknnu.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
```

### Steps

1. **Install dependencies** (if not already installed):
```bash
cd backend
npm install @supabase/supabase-js dotenv
```

2. **Run the setup script**:
```bash
node setup-admin-credentials.js
```

3. **Verify success** - You should see:
```
✅ ADMIN USER SETUP COMPLETE!
📧 Email: abanabaasa2@gmail.com
🔐 Password: Test123456
```

4. **Login** - Go to the admin auth page and login with those credentials

---

## ✅ Option 2: Manual SQL Setup

If you prefer to use Supabase dashboard directly:

### Step 1: Create Auth User
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **Faredeal** project
3. Go to **Authentication** → **Users**
4. Click **Create New User** (or invite user)
5. Enter:
   - **Email**: `abanabaasa2@gmail.com`
   - **Password**: `Test123456`
   - **Confirm Password**: `Test123456`
6. **IMPORTANT**: Check **"Auto confirm user"**
7. Click **Create User** and copy the **User ID**

### Step 2: Run Database SQL
1. Go to **SQL Editor** in Supabase
2. Click **New Query**
3. Paste the entire content from: `backend/CREATE_ADMIN_USER.sql`
4. Click **Run**
5. Verify you see the user record created

### Step 3: Link Auth User to Database
1. In the same SQL Editor, run:
```sql
UPDATE public.users 
SET auth_id = 'PASTE_YOUR_AUTH_USER_ID_HERE'
WHERE email = 'abanabaasa2@gmail.com';
```
Replace `PASTE_YOUR_AUTH_USER_ID_HERE` with the User ID you copied in Step 1.

4. Click **Run**

### Step 4: Test Login
Go back to the admin auth page and try logging in.

---

## ✅ Option 3: Supabase RPC Function

If your Supabase has custom functions, you can create this function:

```sql
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email VARCHAR,
  admin_password VARCHAR
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Note: Direct password hashing is not available in SQL
  -- This function serves as a template; you'll need to use
  -- the admin API (Node.js option 1) for proper password handling
  
  INSERT INTO public.users (
    email,
    full_name,
    phone,
    role,
    is_active,
    email_verified,
    profile_completed
  ) VALUES (
    admin_email,
    'Admin User',
    '+256-700-000000',
    'admin',
    TRUE,
    TRUE,
    TRUE
  ) RETURNING id INTO new_user_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'user_id', new_user_id,
    'email', admin_email,
    'message', 'Admin user created'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🧪 Testing After Setup

### Test 1: Check Database Record
```bash
# Run this in Supabase SQL Editor:
SELECT id, email, role, is_active, auth_id 
FROM public.users 
WHERE email = 'abanabaasa2@gmail.com';
```

You should see:
```
id              | email                      | role  | is_active | auth_id
─────────────────────────────────────────────────────────────────────────
[some-uuid]     | abanabaasa2@gmail.com     | admin | true      | [auth-id]
```

### Test 2: Check Auth User
In Supabase Dashboard → Authentication → Users, you should see:
- Email: `abanabaasa2@gmail.com`
- Status: Confirmed ✓

### Test 3: Login Test
1. Go to your Faredeal admin page: `http://localhost:5173/admin-auth` (or your deployment URL)
2. Click **Login**
3. Enter:
   - **Email**: `abanabaasa2@gmail.com`
   - **Password**: `Test123456`
4. Click **Login**

You should be redirected to the admin portal! 🎉

---

## ❌ Troubleshooting

### Error: "Invalid login credentials"
**Causes & Solutions:**
- ✗ Auth user doesn't exist in Supabase
  - **Fix**: Run Option 1 or manually create in Supabase dashboard
- ✗ Database user record missing
  - **Fix**: Run the SQL from `CREATE_ADMIN_USER.sql`
- ✗ Auth user not linked to database record
  - **Fix**: Run the linking SQL in Option 2, Step 3
- ✗ User email not confirmed
  - **Fix**: In Supabase Auth → Users, check **Confirmed** is checked

### Error: "Invalid email format"
- Verify email is exactly: `abanabaasa2@gmail.com`
- No typos or extra spaces

### Error: "Password too weak"
- Password must be at least 6 characters
- `Test123456` is valid (12 characters)

### Error: "User already exists"
- This is fine! Run the update SQL instead:
```sql
UPDATE public.users 
SET full_name = 'Admin User',
    role = 'admin',
    is_active = TRUE,
    email_verified = TRUE
WHERE email = 'abanabaasa2@gmail.com';
```

---

## 📝 Admin Credentials Summary

Once setup, use these to login:

| Field | Value |
|-------|-------|
| **Email** | `abanabaasa2@gmail.com` |
| **Password** | `Test123456` |
| **Role** | Admin |
| **Status** | Active ✅ |

---

## 🔒 Security Notes

⚠️ **For Development Only:**
- These are test credentials
- Change password after first login
- In production, use strong passwords
- Enable 2FA for admin accounts

---

## 📞 Need Help?

If you still have issues:

1. **Check .env file** - Ensure Supabase credentials are correct
2. **Check Supabase Status** - Visit https://status.supabase.com
3. **Browser Console** - Open DevTools (F12) and check for detailed error messages
4. **Supabase Logs** - Check Supabase dashboard for auth logs

---

**Created**: $(date)
**For**: Faredeal POS System
**Status**: ✅ Ready to use
