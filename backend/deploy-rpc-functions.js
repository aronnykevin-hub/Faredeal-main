import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deployRPCs() {
  console.log('\n📋 Deploying RPC functions...\n');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('./SEARCH_AUTH_USERS_FUNCTIONS.sql', 'utf-8');

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.length < 5) continue; // Skip empty statements

      try {
        console.log(`\n🔧 Executing: ${statement.substring(0, 60)}...`);
        
        const { data, error } = await supabase.rpc('db_exec', { query: statement }).catch(() => ({
          error: { message: 'db_exec not available, using direct SQL' }
        }));

        // Try direct SQL if RPC not available
        if (error) {
          console.log('⚠️ Using alternative method...');
          const response = await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/`,
            {
              method: 'POST',
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: statement })
            }
          );

          if (!response.ok) {
            console.warn(`⚠️ Statement may have failed: ${response.status}`);
          }
        } else {
          console.log('✅ Statement executed');
        }
      } catch (err) {
        console.warn(`⚠️ Error executing statement:`, err.message);
      }
    }

    // Now test the RPC function
    console.log('\n🧪 Testing get_all_auth_users RPC...');
    const { data, error } = await supabase.rpc('get_all_auth_users');

    if (error) {
      console.error('❌ RPC test failed:', error);
      console.log('\n📝 Function may not be deployed. Use Supabase Dashboard:');
      console.log('1. Go to SQL Editor');
      console.log('2. Paste contents of SEARCH_AUTH_USERS_FUNCTIONS.sql');
      console.log('3. Click "Run"');
    } else {
      console.log('✅ RPC function working!');
      console.log(`   Found ${data.length} users`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deployRPCs();
