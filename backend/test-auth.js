import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testAdminAuth() {
  console.log('\n🔍 TESTING ADMIN AUTHENTICATION\n');
  
  try {
    // 1. Check if admin auth user exists
    console.log('1️⃣ Checking Supabase auth users...');
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const adminUser = authUsers.find(u => u.email === 'abanabaasa2@gmail.com');
    if (!adminUser) {
      console.error('❌ Admin auth user NOT found');
      console.log('Available auth users:', authUsers.map(u => u.email));
      return;
    }

    console.log(`✅ Admin auth user found`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email Confirmed: ${adminUser.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log(`   Last Sign In: ${adminUser.last_sign_in_at || 'Never'}`);

    // 2. Check database record
    console.log('\n2️⃣ Checking database record...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'abanabaasa2@gmail.com')
      .eq('role', 'admin')
      .maybeSingle();

    if (dbError) {
      console.error('❌ Error fetching user from database:', dbError);
      return;
    }

    if (!dbUser) {
      console.warn('⚠️ No admin user in database');
    } else {
      console.log(`✅ Admin user in database`);
      console.log(`   ID: ${dbUser.id}`);
      console.log(`   Auth ID: ${dbUser.auth_id}`);
      console.log(`   Active: ${dbUser.is_active}`);
      console.log(`   Email Verified: ${dbUser.email_verified}`);
    }

    // 3. TEST PASSWORD LOGIN WITH ANON KEY (how frontend does it)
    console.log('\n3️⃣ Testing password authentication (ANON KEY)...');
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
      email: 'abanabaasa2@gmail.com',
      password: 'Test123456'
    });

    if (loginError) {
      console.error('❌ LOGIN FAILED:', loginError.message);
      console.error('   Error Code:', loginError.code);
      console.error('   Status:', loginError.status);
      
      // Try to understand why
      console.log('\n🔍 Diagnostic info:');
      console.log(`   Email exists in auth: ${adminUser ? 'YES' : 'NO'}`);
      console.log(`   Email confirmed: ${adminUser?.email_confirmed_at ? 'YES' : 'NO'}`);
      console.log(`   Password format: Test123456 (12 chars, mixed case + numbers)`);
      
      return;
    }

    console.log('✅ LOGIN SUCCESSFUL!');
    console.log(`   User ID: ${loginData.user.id}`);
    console.log(`   Email: ${loginData.user.email}`);
    console.log(`   Session Token: ${loginData.session.access_token.substring(0, 30)}...`);

    // 4. Verify the session works
    console.log('\n4️⃣ Verifying session...');
    const { data: { user: sessionUser }, error: sessionError } = await anonSupabase.auth.getUser(
      loginData.session.access_token
    );

    if (sessionError) {
      console.error('❌ Session verification failed:', sessionError);
    } else {
      console.log('✅ Session verified successfully');
      console.log(`   Authenticated as: ${sessionUser.email}`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ AUTHENTICATION VERIFIED!                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAdminAuth();
