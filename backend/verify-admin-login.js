// Save as backend/verify-admin-login.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyAdminLogin() {
  console.log('\n🔍 VERIFYING ADMIN ACCOUNT STATUS\n');
  
  const email = 'abanabaasa2@gmail.com';
  
  try {
    // Step 1: Check Supabase Auth
    console.log('Step 1️⃣: Checking Supabase Auth...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error:', authError);
      return;
    }

    const authUser = users.find(u => u.email === email);
    
    if (!authUser) {
      console.error(`❌ NOT FOUND in Auth! Email: ${email}`);
      console.error('   Available users:');
      users.forEach(u => console.error(`      - ${u.email}`));
      return;
    }

    console.log(`✅ Auth user found:`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Auth ID: ${authUser.id}`);
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
    console.log(`   Created: ${new Date(authUser.created_at).toLocaleString()}`);
    console.log(`   Last Sign In: ${authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Never'}`);

    // Step 2: Check Database
    console.log('\nStep 2️⃣: Checking Database...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return;
    }

    if (!dbUser) {
      console.error(`❌ NOT FOUND in Database! Email: ${email}`);
      console.log('   Need to create user record in database');
      return;
    }

    console.log(`✅ Database user found:`);
    console.log(`   ID: ${dbUser.id}`);
    console.log(`   Email: ${dbUser.email}`);
    console.log(`   Role: ${dbUser.role}`);
    console.log(`   Auth ID: ${dbUser.auth_id || '❌ NOT SET'}`);
    console.log(`   Is Active: ${dbUser.is_active ? '✅ YES' : '❌ NO'}`);
    console.log(`   Email Verified: ${dbUser.email_verified ? '✅ YES' : '❌ NO'}`);

    // Step 3: Test Login
    console.log('\nStep 3️⃣: Testing Login...');
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
      email: email,
      password: 'Test123456'
    });

    if (loginError) {
      console.error(`❌ LOGIN FAILED: ${loginError.message}`);
      console.error('   Code:', loginError.code);
      
      if (loginError.message.includes('email not confirmed')) {
        console.log('\n🔧 FIX: Email not confirmed');
        console.log('   → Go to Supabase Dashboard > Auth > Users');
        console.log(`   → Find ${email}`);
        console.log('   → Click menu (⋮) > Confirm email');
      } else if (loginError.message.includes('invalid')) {
        console.log('\n🔧 FIX: Invalid credentials');
        console.log('   → Password may be wrong');
        console.log('   → Run: npm run fix-admin-password');
      }
      return;
    }

    console.log(`✅ LOGIN SUCCESSFUL!`);
    console.log(`   Session Token: ${loginData.session.access_token.substring(0, 40)}...`);
    console.log('\n🎉 Admin can now login!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

verifyAdminLogin().catch(console.error);
