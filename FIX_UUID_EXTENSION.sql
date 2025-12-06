-- =========================================
-- FIX: Enable UUID Extension
-- Run this in Supabase SQL Editor
-- =========================================

-- Enable the uuid-ossp extension (required for uuid_generate_v4() function)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Test the function
SELECT uuid_generate_v4();
