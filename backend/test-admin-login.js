import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Try with service key
);

async function testLogin() {
  console.log('🔐 Testing admin login credentials...\n');
  
  const email = 'abanabaasa2@gmail.com';
  const password = 'Test123456';
  
  try {
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}\n`);
    
    console.log('→ Attempting login...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      console.log('❌ Auth ERROR:', error.message);
      console.log('   Error code:', error.code);
      return;
    }
    
    console.log('✅ Auth login SUCCESSFUL!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    
    // Check user in database
    console.log('\n→ Checking if user exists in database...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (dbError && dbError.code === 'PGRST116') {
      console.log('❌ User NOT found in database');
      console.log('   → User needs to be created in database');
      return;
    }
    
    if (dbError) {
      console.log('❌ Database error:', dbError.message);
      return;
    }
    
    console.log('✅ User found in database');
    console.log('   Role:', dbUser.role);
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

testLogin().catch(console.error);
