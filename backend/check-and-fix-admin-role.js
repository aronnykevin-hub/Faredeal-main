// Save as backend/check-and-fix-admin-role.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndFixAdminRole() {
  console.log('\n🔍 CHECKING ADMIN ROLE IN DATABASE\n');
  
  const email = 'abanabaasa2@gmail.com';
  
  try {
    // Step 1: Check current role
    console.log('Step 1️⃣: Checking current role in database...');
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, is_active, email_verified, auth_id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Database error:', checkError);
      return;
    }

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('   Need to create user record first');
      return;
    }

    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role || '❌ NOT SET'}`);
    console.log(`   Auth ID: ${user.auth_id || '❌ NOT LINKED'}`);
    console.log(`   Is Active: ${user.is_active ? '✅ YES' : '❌ NO'}`);
    console.log(`   Email Verified: ${user.email_verified ? '✅ YES' : '❌ NO'}`);

    // Step 2: Fix if not admin
    if (user.role !== 'admin') {
      console.log('\nStep 2️⃣: Updating role to admin...');
      
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          role: 'admin',
          is_active: true,
          email_verified: true
        })
        .eq('id', user.id)
        .select();

      if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
      }

      console.log(`✅ Role updated to admin!`);
      console.log(`   New role: ${updated[0].role}`);
      console.log(`   Is active: ${updated[0].is_active}`);
      console.log(`   Email verified: ${updated[0].email_verified}`);
    } else {
      console.log('\n✅ Role is already set to admin!');
    }

    // Step 3: Test access
    console.log('\nStep 3️⃣: Testing admin portal access...');
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
      email: email,
      password: 'Test123456'
    });

    if (loginError) {
      console.error(`❌ Login failed: ${loginError.message}`);
      return;
    }

    // After login, check role
    const { data: { user: loggedInUser }, error: getError } = await anonSupabase.auth.getUser(
      loginData.session.access_token
    );

    if (getError || !loggedInUser) {
      console.error('❌ Could not get user');
      return;
    }

    const { data: loggedInUserData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', loggedInUser.id)
      .maybeSingle();

    if (roleError) {
      console.error('❌ Role check error:', roleError);
      return;
    }

    console.log(`\n✅ LOGIN SUCCESSFUL!`);
    console.log(`   Email: ${loggedInUser.email}`);
    console.log(`   Role: ${loggedInUserData?.role}`);
    console.log(`   Access: ${loggedInUserData?.role === 'admin' ? '✅ ADMIN ACCESS GRANTED' : '❌ NO ADMIN ACCESS'}`);

    if (loggedInUserData?.role === 'admin') {
      console.log('\n🎉 Admin can now access the admin portal!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkAndFixAdminRole().catch(console.error);
