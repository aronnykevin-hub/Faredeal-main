-- =====================================================================
-- 🚀 QUICK SETUP: Enable pgcrypto Extension
-- =====================================================================
-- Run this FIRST before running direct-username-signup-no-email.sql
-- This enables password hashing support in PostgreSQL
-- =====================================================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extension is installed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE NOTICE '✅ pgcrypto extension is enabled';
        RAISE NOTICE '✅ You can now run direct-username-signup-no-email.sql';
    ELSE
        RAISE EXCEPTION '❌ Failed to enable pgcrypto extension';
    END IF;
END $$;

-- =====================================================================
-- Next Steps:
-- 1. Run direct-username-signup-no-email.sql in Supabase SQL Editor
-- 2. Test signup in your app
-- =====================================================================
