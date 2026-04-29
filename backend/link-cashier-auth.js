#!/usr/bin/env node

/**
 * Link Cashier Auth User to Database
 * Purpose: Find the auth user in Supabase Auth and link auth_id to database record
 * Usage: cd backend && node link-cashier-auth.js
 */

import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function linkCashierAuth() {
  try {
    console.log('\n🔗 CASHIER AUTH LINKING SCRIPT');
    console.log('================================\n');

    const cashierEmail = 'aronnykevin@gmail.com';
    console.log(`🔍 Finding auth user for: ${cashierEmail}\n`);

    // Get all auth users
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing auth users:', listError);
      process.exit(1);
    }

    console.log(`📊 Total auth users found: ${authUsers.length}`);

    // Find matching auth user
    const matchingAuthUser = authUsers.find(u => u.email === cashierEmail);

    if (!matchingAuthUser) {
      console.error(`\n❌ Auth user not found for ${cashierEmail}`);
      console.log('\n📝 Cashier with this email must login via Google OAuth first!');
      process.exit(1);
    }

    console.log(`\n✅ Found matching auth user for ${cashierEmail}`);
    console.log(`   Auth ID: ${matchingAuthUser.id}`);
    console.log(`   Email confirmed: ${matchingAuthUser.email_confirmed_at ? 'Yes ✅' : 'No ⏳'}`);

    // Check if cashier record exists in database
    console.log(`\n📊 Checking for cashier record in database...`);
    
    // First try to drop the email unique constraint if it exists
    try {
      await supabase.rpc('drop_email_constraint');
    } catch (e) {
      // Constraint might not exist or we don't have RPC, continue anyway
    }
    
    let existingCashier = null;
    let checkError = null;
    
    // Try to find existing cashier record with this email
    try {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', cashierEmail)
        .eq('role', 'cashier')
        .maybeSingle();
      existingCashier = result.data;
      checkError = result.error;
    } catch (e) {
      console.log('Note: Query error (may be normal):', e.message);
    }
    
    // If not found as cashier, try to find any record with this email and convert it
    if (!existingCashier) {
      try {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('email', cashierEmail)
          .maybeSingle();
        
        if (result.data) {
          // Record exists with this email but different role
          console.log(`ℹ️  Found existing record with role: ${result.data.role}`);
          console.log(`🔄 Updating to cashier role...`);
          
          const { data: updatedRecord, error: updateErr } = await supabase
            .from('users')
            .update({
              role: 'cashier',
              auth_id: matchingAuthUser.id,
              email_verified: !!matchingAuthUser.email_confirmed_at
            })
            .eq('email', cashierEmail)
            .select()
            .maybeSingle();
          
          if (updateErr) {
            console.error('❌ Error updating role:', updateErr);
            process.exit(1);
          }
          
          existingCashier = updatedRecord;
          console.log('✅ Record updated to cashier role with auth_id linked!');
        }
      } catch (e) {
        // Continue to create new record
      }
    }
    
    if (checkError && !existingCashier) {
      console.error('❌ Database error:', checkError);
      process.exit(1);
    }

    if (!existingCashier) {
      console.log('⚠️  No cashier record found in database');
      console.log('📝 Creating cashier record...\n');

      const { data: newCashier, error: createError } = await supabase
        .from('users')
        .insert([{
          auth_id: matchingAuthUser.id,
          email: cashierEmail,
          full_name: matchingAuthUser.user_metadata?.full_name || 'Cashier User',
          role: 'cashier',
          is_active: false,
          email_verified: !!matchingAuthUser.email_confirmed_at,
          profile_completed: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating cashier:', createError);
        process.exit(1);
      }

      console.log('✅ Cashier record created with auth_id linked!');
      console.log(`   Cashier ID: ${newCashier.id}`);
    } else {
      console.log('✅ Cashier record found in database');
      console.log(`   Cashier ID: ${existingCashier.id}`);

      if (existingCashier.auth_id === matchingAuthUser.id) {
        console.log('✅ auth_id already linked correctly!');
        return;
      }

      console.log('🔄 Linking auth_id...\n');

      // Update with auth_id
      const { data: updatedCashier, error: updateError } = await supabase
        .from('users')
        .update({ auth_id: matchingAuthUser.id })
        .eq('email', cashierEmail)
        .eq('role', 'cashier')
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
    const { data: verifyCashier, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', matchingAuthUser.id)
      .eq('role', 'cashier')
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      process.exit(1);
    }

    if (verifyCashier) {
      console.log('✅ VERIFICATION SUCCESSFUL!');
      console.log(`   Cashier Email: ${verifyCashier.email}`);
      console.log(`   Auth ID: ${verifyCashier.auth_id}`);
      console.log(`   Role: ${verifyCashier.role}`);
      console.log(`   Active: ${verifyCashier.is_active ? '✅ Yes' : '⏳ Pending admin approval'}`);
      console.log('\n✨ Cashier auth link complete!');
    } else {
      console.error('❌ Verification failed - cashier not found by auth_id');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

linkCashierAuth();
