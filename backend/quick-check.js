import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  console.log('📊 Checking users table...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Users in database:');
    console.log(JSON.stringify(data, null, 2));
    if (data.length === 0) console.log('(No users in table)');
  }

  // Also check auth users
  console.log('\n📊 Checking Supabase Auth users...');
  try {
    const { data, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('❌ Error:', authError);
    } else if (data && data.users) {
      console.log('✅ Auth users:');
      data.users.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id}), Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('✅ Auth data:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

check().catch(console.error);
