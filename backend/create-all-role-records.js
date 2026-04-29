#!/usr/bin/env node

/**
 * Create All Role Records for User
 * Purpose: Create separate records for manager, cashier, and supplier roles with the same email/auth_id
 * Usage: cd backend && node create-all-role-records.js
 */

import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createAllRoleRecords() {
  try {
    console.log('\n🔧 CREATE ALL ROLE RECORDS');
    console.log('================================\n');

    const userEmail = 'aronnykevin@gmail.com';
    const authId = '1a5aa3ab-24a5-46e6-ba97-ed25c25fe103';
    const roles = ['manager', 'cashier', 'supplier'];

    // Get current record to use as template
    console.log('📋 Fetching current user record...');
    const { data: currentRecord, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching current record:', fetchError);
      process.exit(1);
    }

    if (!currentRecord) {
      console.error('❌ No user record found for', userEmail);
      process.exit(1);
    }

    console.log('✅ Current record found');
    console.log(`   Email: ${currentRecord.email}`);
    console.log(`   Current role: ${currentRecord.role}`);
    console.log(`   Auth ID: ${currentRecord.auth_id}`);

    // Now create/update records for each role
    console.log('\n🔄 Setting up records for all roles...\n');

    for (const role of roles) {
      console.log(`Processing role: ${role}...`);
      
      // Check if record exists for this role
      const { data: existingRole, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .eq('role', role)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking ${role}:`, checkError);
        continue;
      }

      if (existingRole) {
        console.log(`✅ ${role} record already exists`);
        continue;
      }

      // Need to create a new record for this role
      console.log(`📝 Creating new record for role: ${role}`);

      // First, try to delete any duplicate email records with different roles
      // Actually, we can't due to constraint. Let's use a different approach.
      
      // Try to insert the new role record
      const newRecord = {
        auth_id: authId,
        email: userEmail,
        full_name: currentRecord.full_name || 'User',
        role: role,
        is_active: false,
        email_verified: true,
        profile_completed: currentRecord.profile_completed || false
      };

      const { data: insertedRecord, error: insertError } = await supabase
        .from('users')
        .insert([newRecord])
        .select()
        .maybeSingle();

      if (insertError) {
        if (insertError.code === '23505') {
          console.log(`⚠️  Cannot insert ${role} - constraint violation (email unique). Updating existing record instead...`);
          
          // Update the existing record
          const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ role: role, auth_id: authId })
            .eq('email', userEmail)
            .select()
            .maybeSingle();

          if (updateError) {
            console.error(`❌ Error updating ${role}:`, updateError);
          } else {
            console.log(`✅ ${role} record updated`);
          }
        } else {
          console.error(`❌ Error creating ${role}:`, insertError);
        }
      } else {
        console.log(`✅ ${role} record created successfully`);
      }
    }

    console.log('\n🔍 Final verification...\n');
    const { data: allRecords, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role, auth_id')
      .eq('email', userEmail);

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      console.log(`Found ${allRecords.length} record(s):`);
      allRecords.forEach(record => {
        console.log(`  - ${record.role}: auth_id = ${record.auth_id}`);
      });
    }

    console.log('\n✨ Setup complete!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. If you see constraint violations above, run this SQL in Supabase:');
    console.log('   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;');
    console.log('2. Then re-run this script');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createAllRoleRecords();
