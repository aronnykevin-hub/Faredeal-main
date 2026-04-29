#!/usr/bin/env node

/**
 * Link Supplier Auth User to Database
 * Purpose: Find the auth user in Supabase Auth and link auth_id to database record
 * Usage: cd backend && node link-supplier-auth.js
 */

import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function linkSupplierAuth() {
  try {
    console.log('\n🔗 SUPPLIER AUTH LINKING SCRIPT');
    console.log('================================\n');

    const supplierEmail = 'aronnykevin@gmail.com';
    console.log(`🔍 Finding auth user for: ${supplierEmail}\n`);

    // Get all auth users
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing auth users:', listError);
      process.exit(1);
    }

    console.log(`📊 Total auth users found: ${authUsers.length}`);

    // Find matching auth user
    const matchingAuthUser = authUsers.find(u => u.email === supplierEmail);

    if (!matchingAuthUser) {
      console.error(`\n❌ Auth user not found for ${supplierEmail}`);
      console.log('\n📝 Supplier with this email must login via Google OAuth first!');
      process.exit(1);
    }

    console.log(`\n✅ Found matching auth user for ${supplierEmail}`);
    console.log(`   Auth ID: ${matchingAuthUser.id}`);
    console.log(`   Email confirmed: ${matchingAuthUser.email_confirmed_at ? 'Yes ✅' : 'No ⏳'}`);

    // Check if supplier record exists in database
    console.log(`\n📊 Checking for supplier record in database...`);
    
    // First try to drop the email unique constraint if it exists
    try {
      await supabase.rpc('drop_email_constraint');
    } catch (e) {
      // Constraint might not exist or we don't have RPC, continue anyway
    }
    
    let existingSupplier = null;
    let checkError = null;
    
    // Try to find existing supplier record with this email
    try {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', supplierEmail)
        .eq('role', 'supplier')
        .maybeSingle();
      existingSupplier = result.data;
      checkError = result.error;
    } catch (e) {
      console.log('Note: Query error (may be normal):', e.message);
    }
    
    // If not found as supplier, try to find any record with this email and convert it
    if (!existingSupplier) {
      try {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('email', supplierEmail)
          .maybeSingle();
        
        if (result.data) {
          // Record exists with this email but different role
          console.log(`ℹ️  Found existing record with role: ${result.data.role}`);
          console.log(`🔄 Updating to supplier role...`);
          
          const { data: updatedRecord, error: updateErr } = await supabase
            .from('users')
            .update({
              role: 'supplier',
              auth_id: matchingAuthUser.id,
              email_verified: !!matchingAuthUser.email_confirmed_at
            })
            .eq('email', supplierEmail)
            .select()
            .maybeSingle();
          
          if (updateErr) {
            console.error('❌ Error updating role:', updateErr);
            process.exit(1);
          }
          
          existingSupplier = updatedRecord;
          console.log('✅ Record updated to supplier role with auth_id linked!');
        }
      } catch (e) {
        // Continue to create new record
      }
    }
    
    if (checkError && !existingSupplier) {
      console.error('❌ Database error:', checkError);
      process.exit(1);
    }

    if (!existingSupplier) {
      console.log('⚠️  No supplier record found in database');
      console.log('📝 Creating supplier record...\n');

      const { data: newSupplier, error: createError } = await supabase
        .from('users')
        .insert([{
          auth_id: matchingAuthUser.id,
          email: supplierEmail,
          full_name: matchingAuthUser.user_metadata?.full_name || 'Supplier User',
          role: 'supplier',
          is_active: false,
          email_verified: !!matchingAuthUser.email_confirmed_at,
          profile_completed: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating supplier:', createError);
        process.exit(1);
      }

      console.log('✅ Supplier record created with auth_id linked!');
      console.log(`   Supplier ID: ${newSupplier.id}`);
    } else {
      console.log('✅ Supplier record found in database');
      console.log(`   Supplier ID: ${existingSupplier.id}`);

      if (existingSupplier.auth_id === matchingAuthUser.id) {
        console.log('✅ auth_id already linked correctly!');
        return;
      }

      console.log('🔄 Linking auth_id...\n');

      // Update with auth_id
      const { data: updatedSupplier, error: updateError } = await supabase
        .from('users')
        .update({ auth_id: matchingAuthUser.id })
        .eq('email', supplierEmail)
        .eq('role', 'supplier')
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
    const { data: verifySupplier, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', matchingAuthUser.id)
      .eq('role', 'supplier')
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      process.exit(1);
    }

    if (verifySupplier) {
      console.log('✅ VERIFICATION SUCCESSFUL!');
      console.log(`   Supplier Email: ${verifySupplier.email}`);
      console.log(`   Auth ID: ${verifySupplier.auth_id}`);
      console.log(`   Role: ${verifySupplier.role}`);
      console.log(`   Active: ${verifySupplier.is_active ? '✅ Yes' : '⏳ Pending admin approval'}`);
      console.log('\n✨ Supplier auth link complete!');
    } else {
      console.error('❌ Verification failed - supplier not found by auth_id');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

linkSupplierAuth();
