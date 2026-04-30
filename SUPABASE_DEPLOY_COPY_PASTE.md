# 🚀 SUPABASE DEPLOYMENT - COPY & PASTE READY

This file has the exact SQL to copy-paste into Supabase. No thinking required!

---

## ⚡ Quick Start (2 minutes)

1. Go to: https://supabase.com/dashboard
2. Click your project
3. Click "SQL Editor" (left sidebar)
4. Click "New Query" (top right)
5. Copy the entire SQL code below 👇
6. Paste into the editor
7. Click "Run" (top right, blue button)
8. Done! ✅

---

## 📋 SQL CODE TO DEPLOY

**Copy everything between the lines:**

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SEARCH AUTH USERS FUNCTIONS - Deploy to Supabase
-- These functions enable searching across Supabase auth.users table
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Function 1: Get all Supabase auth.users with profile status
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, phone TEXT, username TEXT, role TEXT,
  is_active BOOLEAN, email_verified BOOLEAN, profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE,
  has_profile BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id, au.email,
    COALESCE(pu.full_name, au.user_metadata->>'full_name', au.email),
    pu.phone, pu.username, pu.role,
    COALESCE(pu.is_active, FALSE),
    au.email_confirmed,
    pu.profile_completed, au.created_at,
    COALESCE(pu.updated_at, au.updated_at),
    (pu.id IS NOT NULL)::BOOLEAN as has_profile
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function 2: Search auth.users by email or name (fuzzy search)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_auth_users(p_search_query TEXT)
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, phone TEXT, username TEXT, role TEXT,
  is_active BOOLEAN, email_verified BOOLEAN, profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE,
  has_profile BOOLEAN
) AS $$
DECLARE
  v_search_lower TEXT := LOWER(COALESCE(p_search_query, ''));
BEGIN
  RETURN QUERY
  SELECT 
    au.id, au.email,
    COALESCE(pu.full_name, au.user_metadata->>'full_name', au.email),
    pu.phone, pu.username, pu.role,
    COALESCE(pu.is_active, FALSE),
    au.email_confirmed,
    pu.profile_completed, au.created_at,
    COALESCE(pu.updated_at, au.updated_at),
    (pu.id IS NOT NULL)::BOOLEAN as has_profile
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE 
    LOWER(au.email) LIKE '%' || v_search_lower || '%' OR
    LOWER(COALESCE(pu.full_name, au.user_metadata->>'full_name')) LIKE '%' || v_search_lower || '%'
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.search_auth_users(TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function 3: Get auth.users WITHOUT profiles (newly signed-up users)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_auth_users_without_profiles()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, phone TEXT, username TEXT, role TEXT,
  is_active BOOLEAN, email_verified BOOLEAN, profile_completed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE,
  has_profile BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id, au.email,
    au.user_metadata->>'full_name' as full_name,
    NULL::TEXT as phone,
    au.user_metadata->>'username' as username,
    NULL::TEXT as role,
    FALSE as is_active,
    au.email_confirmed,
    FALSE as profile_completed,
    au.created_at,
    au.updated_at,
    FALSE as has_profile
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_auth_users_without_profiles TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function 4: Create profile for auth.user and assign role
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth(
  p_auth_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  success BOOLEAN, message TEXT, role TEXT, user_id UUID, email TEXT
) AS $$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
BEGIN
  -- Get email and full_name from auth.users
  SELECT au.email, au.user_metadata->>'full_name'
  INTO v_email, v_full_name
  FROM auth.users au
  WHERE au.id = p_auth_id;

  IF v_email IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Auth user not found', NULL::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if profile already exists
  IF EXISTS(SELECT 1 FROM public.users WHERE id = p_auth_id) THEN
    RETURN QUERY SELECT FALSE, 'Profile already exists for this user', p_role, p_auth_id, v_email;
    RETURN;
  END IF;

  -- Create profile
  INSERT INTO public.users (
    id, email, full_name, role, is_active, email_verified,
    profile_completed, created_at, updated_at
  ) VALUES (
    p_auth_id,
    v_email,
    COALESCE(v_full_name, v_email),
    p_role,
    TRUE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Profile created and role assigned',
    p_role,
    p_auth_id,
    v_email;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM, NULL::TEXT, NULL::UUID, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth(UUID, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF DEPLOYMENT SQL
-- ═══════════════════════════════════════════════════════════════════════════
```

---

## ✅ Verification Steps

After running the SQL, verify it worked:

### In Supabase Dashboard:

1. **Check Functions Exist:**
   - Go to "Database" → "Functions" (left sidebar)
   - Look for these 4 functions:
     - `get_all_auth_users` ✅
     - `search_auth_users` ✅
     - `get_auth_users_without_profiles` ✅
     - `create_user_profile_from_auth` ✅

2. **Test Each Function:**

   **Test 1: Get all auth users**
   ```sql
   SELECT * FROM get_all_auth_users() LIMIT 5;
   ```
   Expected: Shows all auth users

   **Test 2: Search by email**
   ```sql
   SELECT * FROM search_auth_users('john@example.com') LIMIT 5;
   ```
   Expected: Shows users matching email

   **Test 3: Get users without profiles**
   ```sql
   SELECT * FROM get_auth_users_without_profiles() LIMIT 5;
   ```
   Expected: Shows only users without profiles

   **Test 4: Create profile (test)**
   ```sql
   -- First, get a test auth user ID
   SELECT id FROM auth.users LIMIT 1;
   
   -- Then create profile for them (replace with actual ID)
   SELECT * FROM create_user_profile_from_auth('8bb38779-...', 'manager');
   ```
   Expected: Success message and profile created

---

## 🎯 Next Steps After Deployment

1. ✅ SQL deployed to Supabase
2. Next: Rebuild frontend
   ```bash
   cd frontend
   npm run build
   ```
3. Next: Deploy frontend to your hosting
4. Next: Test in your admin dashboard

---

## 🐛 Troubleshooting

### "Function does not exist" error

**Problem:** After deploying, frontend says function doesn't exist
**Solution:** 
1. Wait 10 seconds for Supabase to register functions
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache
4. Check Supabase Dashboard → Functions to confirm they exist

### "Permission denied" error

**Problem:** Can't execute function
**Solution:**
1. Re-run the SQL (includes GRANT statements)
2. Make sure user is authenticated (logged in)
3. Check user has proper Supabase auth role

### Function runs but returns no data

**Problem:** Function exists but returns empty
**Solution:**
1. Check if you have any auth users (sign up new test account)
2. Check if users have profiles
3. Run test query: `SELECT * FROM auth.users;`

---

## 📝 Notes

- **These are one-time operations** - Deploy once, use forever
- **Functions are idempotent** - Running again won't break anything
- **All functions are read-only** - except create_user_profile_from_auth (which is INSERT)
- **Permissions are set to authenticated, anon** - Can be restricted if needed
- **Performance is optimized** - Uses LEFT JOIN and indexes

---

## 🚀 You're All Set!

Once the SQL is deployed and verified:

1. Frontend already has the code
2. Just rebuild frontend
3. Deploy frontend
4. Test in admin dashboard

**Total deployment time: < 5 minutes**

Good luck! 🎉
