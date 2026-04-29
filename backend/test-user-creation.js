import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

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

async function testUserCreation() {
  console.log('🧪 Testing user creation with different email...\n');
  
  try {
    const testEmail = `test-${Date.now()}@test.com`;
    
    console.log(`→ Attempting to create test user: ${testEmail}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    if (error) {
      console.log('❌ Test user creation failed:', error.message);
      console.log('   Status:', error.status);
      console.log('   Code:', error.code);
      
      // Check if other users still exist
      console.log('\n📊 Checking remaining auth users...');
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.log('❌ Cannot list users:', listError);
      } else {
        console.log(`✅ Auth users found: ${users.length}`);
        users.slice(0, 5).forEach(u => {
          console.log(`   - ${u.email} (Created: ${new Date(u.created_at).toLocaleDateString()})`);
        });
      }
      
      return;
    }
    
    console.log('✅ Test user created successfully!');
    console.log('   User ID:', data.user.id);
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

testUserCreation().catch(console.error);
