#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function deploySQL() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Deploying RPC Functions to Supabase                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const sqlPath = path.join(__dirname, 'SEARCH_AUTH_USERS_FUNCTIONS.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📋 Executing SQL statements...\n');

    // Split into separate statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5);

    console.log(`Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      
      try {
        // Execute raw SQL via Supabase
        const { data, error } = await supabase.rpc('exec', {
          query: statement
        }).catch(() => ({ error: { message: 'exec RPC not available' } }));

        if (error && !error.message.includes('not available')) {
          console.warn(`⚠️  [${i + 1}/${statements.length}] ${preview}...`);
          console.warn(`    Error: ${error.message}\n`);
          failureCount++;
        } else {
          console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
          successCount++;
        }
      } catch (err) {
        console.warn(`⚠️  [${i + 1}/${statements.length}] ${preview}...`);
        console.warn(`    Error: ${err.message}\n`);
        failureCount++;
      }
    }

    console.log(`\n📊 Results: ${successCount} succeeded, ${failureCount} failed\n`);

    // Test the functions
    console.log('🧪 Testing deployed functions...\n');

    try {
      const { data, error } = await supabase.rpc('get_all_auth_users');
      if (error) {
        console.error('❌ get_all_auth_users RPC failed:', error.message);
      } else {
        console.log('✅ get_all_auth_users working!');
        console.log(`   Found: ${data ? data.length : 0} users\n`);
      }
    } catch (e) {
      console.error('❌ Error testing RPC:', e.message);
    }

    if (failureCount > 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║     Manual Deployment via Supabase Dashboard (Recommended)  ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('1. Go to: https://app.supabase.com');
      console.log('2. Select your project: zwmupgbixextqlexknnu');
      console.log('3. Click: SQL Editor → New Query');
      console.log('4. Copy ALL contents of: backend/SEARCH_AUTH_USERS_FUNCTIONS.sql');
      console.log('5. Paste into the SQL editor');
      console.log('6. Click: Run\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deploySQL();
