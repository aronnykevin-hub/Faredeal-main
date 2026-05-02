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

async function deployRPCFunctions() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Deploying RPC Functions to Supabase                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'SEARCH_AUTH_USERS_FUNCTIONS.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📋 SQL file loaded, executing functions...\n');

    // Use Supabase admin API to execute raw SQL
    // This requires using the PostgREST API with a special header
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      }
    ).catch(() => null);

    if (!response || !response.ok) {
      console.log('⚠️ Direct SQL execution not available via API');
      console.log('\n📝 Alternative: Execute manually in Supabase Dashboard');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('1. Go to: https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to: SQL Editor → New Query');
      console.log('4. Copy contents of: backend/SEARCH_AUTH_USERS_FUNCTIONS.sql');
      console.log('5. Paste and click: Run');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    console.log('✅ SQL executed successfully!');

    // Verify functions are deployed
    console.log('\n🧪 Verifying RPC functions...\n');

    const tests = [
      { name: 'get_all_auth_users', rpc: 'get_all_auth_users', params: {} },
      { name: 'search_auth_users', rpc: 'search_auth_users', params: { p_search_query: 'test' } }
    ];

    for (const test of tests) {
      try {
        const { data, error } = await supabase.rpc(test.rpc, test.params);
        
        if (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`✅ ${test.name}: Working`);
          if (data && Array.isArray(data)) {
            console.log(`   Returns: ${data.length} records`);
          }
        }
      } catch (e) {
        console.log(`❌ ${test.name}: ${e.message}`);
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Deployment Complete!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your .env file has:');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_SERVICE_KEY');
  }
}

deployRPCFunctions();
