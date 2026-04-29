#!/usr/bin/env node

/**
 * ================================================================
 * SETUP ADMIN CREDENTIALS FOR FAREDEAL
 * ================================================================
 * This script creates the admin auth user and database record
 * for Faredeal application.
 *
 * Usage: node setup-admin-credentials.js
 * ================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'abanabaasa2@gmail.com',
  password: 'Test123456',
  fullName: 'Admin User',
  phone: '+256-700-000000'
};

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdminCredentials() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     FAREDEAL ADMIN CREDENTIALS SETUP                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check if admin already exists in database
    console.log('📋 Step 1: Checking for existing admin user...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_CREDENTIALS.email)
      .eq('role', 'admin')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', checkError);
      throw checkError;
    }

    if (existingUser) {
      console.log('⚠️  Admin user already exists in database');
      console.log('   ID:', existingUser.id);
      console.log('   Email:', existingUser.email);
      console.log('   Auth ID:', existingUser.auth_id || 'NOT SET');
    }

    // Step 2: Check if auth user exists
    console.log('\n📋 Step 2: Checking for existing auth user...');
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing auth users:', listError);
      throw listError;
    }

    const existingAuthUser = authUsers.find(u => u.email === ADMIN_CREDENTIALS.email);

    if (existingAuthUser) {
      console.log('✅ Auth user already exists');
      console.log('   ID:', existingAuthUser.id);
      console.log('   Email:', existingAuthUser.email);

      // Update database record with auth_id if needed
      if (existingUser && !existingUser.auth_id) {
        console.log('\n📝 Linking auth user to database record...');
        const { error: linkError } = await supabase
          .from('users')
          .update({ auth_id: existingAuthUser.id })
          .eq('id', existingUser.id);

        if (linkError) {
          console.error('❌ Error linking auth user:', linkError);
        } else {
          console.log('✅ Auth user linked successfully');
        }
      }
    } else {
      // Step 3: Create new auth user
      console.log('\n📝 Step 3: Creating new auth user...');
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_CREDENTIALS.fullName,
          role: 'admin'
        }
      });

      if (createAuthError) {
        console.error('❌ Error creating auth user:', createAuthError);
        throw createAuthError;
      }

      console.log('✅ Auth user created successfully');
      console.log('   ID:', newAuthUser.user.id);
      console.log('   Email:', newAuthUser.user.email);

      // Step 4: Create database record
      console.log('\n📝 Step 4: Creating database user record...');
      const { data: dbUser, error: createDbError } = await supabase
        .from('users')
        .insert({
          auth_id: newAuthUser.user.id,
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.fullName,
          phone: ADMIN_CREDENTIALS.phone,
          role: 'admin',
          is_active: true,
          email_verified: true,
          profile_completed: true
        })
        .select()
        .single();

      if (createDbError) {
        console.error('❌ Error creating database record:', createDbError);
        // Try update instead
        if (createDbError.code === '23505') {
          console.log('   User already exists, updating...');
          const { error: updateError } = await supabase
            .from('users')
            .update({
              auth_id: newAuthUser.user.id,
              full_name: ADMIN_CREDENTIALS.fullName,
              phone: ADMIN_CREDENTIALS.phone,
              role: 'admin',
              is_active: true,
              email_verified: true
            })
            .eq('email', ADMIN_CREDENTIALS.email);

          if (updateError) {
            console.error('❌ Error updating database record:', updateError);
          } else {
            console.log('✅ Database record updated successfully');
          }
        }
      } else {
        console.log('✅ Database user record created successfully');
        console.log('   ID:', dbUser.id);
      }
    }

    // Step 5: Verify setup
    console.log('\n✅ Step 5: Verifying admin setup...');
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_CREDENTIALS.email)
      .eq('role', 'admin')
      .maybeSingle();

    if (finalError) {
      console.error('❌ Error verifying setup:', finalError);
    } else if (finalUser) {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ ADMIN USER SETUP COMPLETE!                 ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('Admin Credentials:');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`📧 Email:          ${ADMIN_CREDENTIALS.email}`);
      console.log(`🔐 Password:       ${ADMIN_CREDENTIALS.password}`);
      console.log(`👤 Full Name:      ${ADMIN_CREDENTIALS.fullName}`);
      console.log(`📱 Phone:          ${ADMIN_CREDENTIALS.phone}`);
      console.log(`✅ Role:           admin`);
      console.log(`✅ Active:         ${finalUser.is_active}`);
      console.log(`✅ Email Verified: ${finalUser.email_verified}`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('\n🎉 You can now login with these credentials!\n');
    } else {
      console.error('❌ Admin user not found after setup');
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupAdminCredentials();
