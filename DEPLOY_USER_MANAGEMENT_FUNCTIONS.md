# QUICK FIX: Copy & Paste into Supabase SQL Editor

## How to Use:
1. Open: https://supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy ALL code below (from next line to end)
4. Paste into the SQL editor window
5. Click "Run" button
6. Done! ✅

---

## IMPORTANT: Function Overloads

The SQL file now includes TWO separate `approve_user()` functions:
- `approve_user(UUID)` - Approve without changing role
- `approve_user(UUID, VARCHAR)` - Approve and change role

This allows both calling patterns:
```javascript
// Pattern 1: Just approve (keeps existing role)
supabase.rpc('approve_user', { p_user_id: userId });

// Pattern 2: Approve with role change
supabase.rpc('approve_user', { p_user_id: userId, p_role: 'manager' });
```

---

## PASTE EVERYTHING BELOW INTO SUPABASE SQL EDITOR:

```sql
-- =========================================
-- COMPLETE RPC FUNCTIONS FOR USER MANAGEMENT
-- =========================================

-- 1. GET PENDING USERS FUNCTION
DROP FUNCTION IF EXISTS public.get_pending_users() CASCADE;

CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  username VARCHAR,
  full_name TEXT,
  phone VARCHAR,
  role TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.username,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS full_name,
    u.phone,
    u.role::TEXT,
    u.status::TEXT,
    u.created_at,
    jsonb_build_object(
      'phone', u.phone,
      'role', u.role,
      'status', u.status,
      'permissions', u.permissions,
      'settings', u.settings
    ) AS metadata
  FROM public.users u
  WHERE u.status = 'pending'
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated;

-- 2. APPROVE USER FUNCTION (Two versions - with and without role)
DROP FUNCTION IF EXISTS public.approve_user(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(UUID) CASCADE;

-- Version 1: Approve user WITHOUT changing role
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role VARCHAR;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  UPDATE public.users
  SET
    status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User approved successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role,
    'status', 'active'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to approve user: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Version 2: Approve user WITH role change
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_role VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role VARCHAR;
  v_new_role user_role;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  IF p_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Role is required'
    );
  END IF;

  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  v_new_role := p_role::user_role;

  UPDATE public.users
  SET
    status = 'active',
    updated_at = NOW(),
    role = v_new_role
  WHERE id = p_user_id;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User approved successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_new_role::TEXT,
    'status', 'active'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to approve user: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.approve_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user(UUID, VARCHAR) TO authenticated;

-- 3. REJECT USER FUNCTION
DROP FUNCTION IF EXISTS public.reject_user(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_email TEXT;
  v_user_role VARCHAR;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User ID is required'
    );
  END IF;

  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  DELETE FROM public.users
  WHERE id = p_user_id;

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'User rejected and deleted successfully',
    'user_id', p_user_id,
    'email', v_user_email,
    'role', v_user_role
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'Failed to reject user: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_user(UUID) TO authenticated;

-- 4. CREATE AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Done! All functions created successfully ✅
```

---

## After Running:

### Test the Functions Work:
```sql
-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('approve_user', 'reject_user', 'get_pending_users');

-- Should return 3 rows with function names
```

### Test Reject User:
1. Go to Admin Portal
2. Find a pending user
3. Click "Reject" button
4. Should work without errors ✅

## If You Get Errors:

**Error: "Column does not exist"**
- Make sure your `users` table has these columns: id, email, username, first_name, last_name, phone, role, status
- If missing columns, add them first

**Error: "Type user_role does not exist"**
- Your database may use different role type name
- Replace `user_role` with `varchar` temporarily

**Error: "Permission denied"**
- Make sure you're logged in with admin/service role in Supabase
- Switch to "Authenticated" user scope if needed

## Questions?
Check: `FIX_REJECT_USER_ERROR.md` or `ERROR_FIX_SUMMARY.md`
