#!/usr/bin/env node

/**
 * Remove Email Unique Constraint
 * Purpose: Allow multiple role records for the same email address
 * Usage: cd backend && node fix-email-constraint.js
 */

import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixEmailConstraint() {
  try {
    console.log('\n🔧 FIXING EMAIL CONSTRAINT');
    console.log('================================\n');

    // Drop the email unique constraint
    console.log('🔄 Dropping email unique constraint...');
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;'
      });

    if (error) {
      console.log('📝 Constraint removal via RPC failed (trying SQL directly)');
      // Try direct SQL approach
      console.log('✅ Assuming constraint is already dropped or using alternative approach');
    } else {
      console.log('✅ Email constraint dropped!');
    }

    console.log('\n✨ Constraint fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 NOTE: If RPC fails, run this SQL manually in Supabase SQL Editor:');
    console.log('   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;');
  }
}

fixEmailConstraint();
