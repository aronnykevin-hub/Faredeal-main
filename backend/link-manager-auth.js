#!/usr/bin/env node

/**
 * Link Manager Auth User to Database
 * Purpose: Find the auth user in Supabase Auth and link auth_id to database record
 * Usage: cd backend && node link-manager-auth.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function linkManagerAuth() {
  try {
    console.log('\n🔗 MANAGER AUTH LINKING SCRIPT');
    console.log('================================\n');

    const managerEmail = 'aronnykevin@gmail.com';
    console.log(`🔍 Finding auth user for: ${managerEmail}\n`);

    // Get all auth users
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing auth users:', listError);
      process.exit(1);
    }

    console.log(`📊 Total auth users found: ${authUsers.length}`);

    // Find matching auth user
    const matchingAuthUser = authUsers.find(u => u.email === managerEmail);

    if (!matchingAuthUser) {
      console.error(`\n❌ Auth user not found for ${managerEmail}`);
      console.log('\n📝 Manager with this email must login via Google OAuth first!');
      process.exit(1);
    }

    console.log(`\n✅ Found matching auth user for ${managerEmail}`);
    console.log(`   Auth ID: ${matchingAuthUser.id}`);
    console.log(`   Email confirmed: ${matchingAuthUser.email_confirmed_at ? 'Yes ✅' : 'No ⏳'}`);

    // Check if manager record exists in database
    console.log(`\n📊 Checking for manager record in database...`);
    const { data: existingManager, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', managerEmail)
      .eq('role', 'manager')
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking database:', checkError);
      process.exit(1);
    }

    if (!existingManager) {
      console.log('⚠️  No manager record found in database');
      console.log('📝 Creating manager record...\n');

      const { data: newManager, error: createError } = await supabase
        .from('users')
        .insert([{
          auth_id: matchingAuthUser.id,
          email: managerEmail,
          full_name: matchingAuthUser.user_metadata?.full_name || 'Manager User',
          role: 'manager',
          is_active: false,
          email_verified: !!matchingAuthUser.email_confirmed_at,
          profile_completed: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating manager:', createError);
        process.exit(1);
      }

      console.log('✅ Manager record created with auth_id linked!');
      console.log(`   Manager ID: ${newManager.id}`);
    } else {
      console.log('✅ Manager record found in database');
      console.log(`   Manager ID: ${existingManager.id}`);

      if (existingManager.auth_id === matchingAuthUser.id) {
        console.log('✅ auth_id already linked correctly!');
        return;
      }

      console.log('🔄 Linking auth_id...\n');

      // Update with auth_id
      const { data: updatedManager, error: updateError } = await supabase
        .from('users')
        .update({ auth_id: matchingAuthUser.id })
        .eq('email', managerEmail)
        .eq('role', 'manager')
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating auth_id:', updateError);
        process.exit(1);
      }

      console.log('✅ auth_id linked successfully!');
    }

    // Verify the link
    console.log(`\n🔍 Verifying link...\n`);
    const { data: verifyManager, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', matchingAuthUser.id)
      .eq('role', 'manager')
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      process.exit(1);
    }

    if (verifyManager) {
      console.log('✅ VERIFICATION SUCCESSFUL!');
      console.log(`   Manager Email: ${verifyManager.email}`);
      console.log(`   Auth ID: ${verifyManager.auth_id}`);
      console.log(`   Role: ${verifyManager.role}`);
      console.log(`   Active: ${verifyManager.is_active ? '✅ Yes' : '⏳ Pending admin approval'}`);
      console.log('\n✨ Manager auth link complete!');
    } else {
      console.error('❌ Verification failed - manager not found by auth_id');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

linkManagerAuth();
