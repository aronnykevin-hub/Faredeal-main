# 🚀 QUICK FIX - Database Setup

## ❌ Error You're Seeing:
```
Could not find the 'auth_id' column of 'users' in the schema cache
Could not find the 'department' column of 'users' in the schema cache
```

## ✅ Solution:

Your Supabase database is missing required columns. Run this **ONE SQL file** to fix everything:

### 📋 Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run Migration**
   - Open file: `backend/database/migrations/COMPLETE_DATABASE_SETUP.sql`
   - Copy ALL contents
   - Paste into Supabase SQL Editor
   - Click "Run" or press `Ctrl + Enter`

4. **Wait for Success**
   - You'll see: ✅ "MIGRATION COMPLETE!"
   - Takes ~5-10 seconds

5. **Refresh Your App**
   - Reload your frontend
   - Try signup again
   - No more errors! 🎉

---

## 📦 What This Migration Does:

### Adds Missing Columns:
- ✅ **auth_id** - For OAuth users
- ✅ **department** - For managers/employees
- ✅ **username** - For login
- ✅ **password** - Hashed passwords
- ✅ **profile_completed** - Track profile status
- ✅ **is_active** - Admin approval flag
- ✅ **All employee fields** - position, education, skills, etc.
- ✅ **All manager fields** - experience, certifications, etc.
- ✅ **All supplier fields** - company_name, business_license, etc.
- ✅ **All cashier fields** - shift, till_experience, etc.

### Creates:
- ✅ **Indexes** - Fast queries
- ✅ **Password hashing trigger** - Auto-hash passwords
- ✅ **RLS policies** - Security rules
- ✅ **Comments** - Documentation for each column

---

## 🧪 Test After Migration:

### 1. Test Manager Signup:
```
Go to: /manager-auth
Click: "Apply"
Fill form and submit
Expected: ✅ "Application submitted!"
```

### 2. Test Supplier Signup:
```
Go to: /supplier-auth
Click: "Apply"
Fill form and submit
Expected: ✅ "Application submitted!"
```

### 3. Check Database:
```sql
-- In Supabase SQL Editor, run:
SELECT username, role, is_active, profile_completed 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 If You Still Get Errors:

### Error: "relation users does not exist"
**Solution**: Your users table doesn't exist. The migration creates it automatically.

### Error: "permission denied"
**Solution**: Make sure you're using the service_role key in Supabase, or run as superuser.

### Error: "column already exists"
**Solution**: That's OK! The migration uses `IF NOT EXISTS`, so it won't break.

---

## 📁 Files Created:

- ✅ `COMPLETE_DATABASE_SETUP.sql` - **RUN THIS ONE FILE!**
- ✅ `QUICK_DATABASE_FIX.md` - This guide

---

## 🎯 Summary:

**Before**: Missing columns → Errors everywhere ❌
**After**: Run one SQL file → Everything works ✅

**Just run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor and you're done!** 🚀
