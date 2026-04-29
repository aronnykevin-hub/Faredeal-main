# FIX: Remove Email Unique Constraint

The email unique constraint is preventing multiple roles per user. 

## Solution: Run this SQL in Supabase SQL Editor

1. Go to: https://zwmupgbixextqlexknnu.supabase.co/project/default/sql/new
2. Copy and paste this SQL:

```sql
-- Remove the email unique constraint to allow multiple roles per email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- Optional: Create a new constraint on (email, role) to ensure uniqueness per role
ALTER TABLE public.users ADD CONSTRAINT users_email_role_unique UNIQUE(email, role);
```

3. Click "Run"
4. Then go back to terminal and run:
   ```
   node create-all-role-records.js
   ```

## Why This Matters

Currently, the database has ONE record with email="aronnykevin@gmail.com" and role="supplier". When the manager portal queries `WHERE auth_id = ? AND role = 'manager'`, it won't find a record because the role is "supplier".

With the constraint removed, we can have:
- 1 record: email="aronnykevin@gmail.com", role="manager", auth_id="1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"
- 1 record: email="aronnykevin@gmail.com", role="cashier", auth_id="1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"  
- 1 record: email="aronnykevin@gmail.com", role="supplier", auth_id="1a5aa3ab-24a5-46e6-ba97-ed25c25fe103"

All pointing to the same auth_id (Supabase Auth user), but with different roles in the application.

## Verification

After running the SQL and re-running the script, you should see:
```
Found 3 record(s):
  - manager: auth_id = 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
  - cashier: auth_id = 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
  - supplier: auth_id = 1a5aa3ab-24a5-46e6-ba97-ed25c25fe103
```
