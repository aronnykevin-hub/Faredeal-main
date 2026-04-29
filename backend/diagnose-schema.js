#!/usr/bin/env node

/**
 * ================================================================
 * DIAGNOSE DATABASE SCHEMA
 * ================================================================
 * This script checks your users table structure and shows you
 * exactly what columns exist and what's missing.
 *
 * Usage: node diagnose-schema.js
 * ================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnoseSchema() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         DATABASE SCHEMA DIAGNOSTIC TOOL                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get users table info
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
      .catch(() => ({ data: null, error: 'RPC not available' }));

    if (columnsError || !columnsData) {
      console.log('⚠️  Could not get column info via RPC, trying direct query...\n');

      // Try direct query
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (testError) {
        console.error('❌ Error accessing users table:', testError.message);
        console.log('\n📋 Possible reasons:');
        console.log('   1. Users table does not exist');
        console.log('   2. You don\'t have permission to access it');
        console.log('   3. Supabase connection failed\n');
        return;
      }

      console.log('✅ Users table EXISTS');
      console.log('   (showing first record structure)\n');

      if (testData && testData.length > 0) {
        const columns = Object.keys(testData[0]);
        console.log(`📊 Found ${columns.length} columns:\n`);
        columns.forEach((col, i) => {
          console.log(`   ${String(i + 1).padStart(2, '0')}. ${col}`);
        });
      } else {
        console.log('   (table is empty, checking schema via information_schema)\n');
      }
    } else {
      console.log('✅ Users table columns:');
      columnsData.forEach((col, i) => {
        console.log(`   ${String(i + 1).padStart(2, '0')}. ${col.column_name}`);
      });
    }

    // Check for required columns
    console.log('\n\n📋 REQUIRED COLUMNS CHECK:\n');

    const requiredColumns = [
      'id',
      'email',
      'role',
      'is_active',
      'full_name',
      'auth_id',
      'email_verified',
      'profile_completed'
    ];

    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!sampleError && sampleUser) {
      requiredColumns.forEach(col => {
        const exists = col in sampleUser;
        console.log(`   ${exists ? '✅' : '❌'} ${col.padEnd(25)} ${exists ? 'EXISTS' : 'MISSING'}`);
      });
    }

    // Check for admin user
    console.log('\n\n👤 ADMIN USER CHECK:\n');

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'abanabaasa2@gmail.com')
      .maybeSingle();

    if (adminError) {
      console.log(`   ❌ Error checking admin: ${adminError.message}`);
    } else if (adminUser) {
      console.log('   ✅ Admin user EXISTS in database');
      console.log(`      ID: ${adminUser.id}`);
      console.log(`      Email: ${adminUser.email}`);
      console.log(`      Role: ${adminUser.role || 'NOT SET'}`);
      console.log(`      Active: ${adminUser.is_active || 'UNKNOWN'}`);
    } else {
      console.log('   ❌ Admin user NOT found (need to create)');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnoseSchema();
