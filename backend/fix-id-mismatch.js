// ============================================================
// FIX USER ID MISMATCH
// Make users table ID match auth.users.id
// ============================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixIdMismatch() {
  const email = "abanabaasa2@gmail.com";
  const authId = "88a77423-7f0d-4cd0-861a-3012cf671bd4";
  const oldUsersId = "66f000a1-2ad4-4ca6-a3d5-0d3a3f399e65";

  try {
    console.log("🔧 FIXING USER ID MISMATCH...\n");

    // Step 1: Get current user record
    console.log("📋 Step 1: Fetching current user record...");
    const { data: oldUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", oldUsersId)
      .single();

    if (fetchError) throw fetchError;
    console.log("✅ Found user record");

    // Step 2: Create new user record with correct ID first
    console.log("\n📋 Step 2: Creating new user record with correct ID...");
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: authId,  // Use auth ID as primary key
        auth_id: authId,  // Also store as reference
        email: oldUser.email,
        full_name: oldUser.full_name,
        phone: oldUser.phone,
        username: oldUser.username,
        role: "admin",
        is_active: true,
        email_verified: true,
        profile_completed: oldUser.profile_completed,
        created_at: oldUser.created_at,
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    console.log("✅ New user record created with auth ID");

    // Step 3: Reassign companies to new ID
    console.log("\n📋 Step 3: Reassigning companies...");
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id, name, created_by")
      .eq("created_by", oldUsersId);

    if (compError) {
      console.log("   ℹ️  No companies (table may not exist or already fixed)");
    } else if (companies?.length > 0) {
      console.log(`   Found ${companies.length} company/companies, reassigning...`);
      
      // Reassign companies to new ID
      const { error: updateCompError } = await supabase
        .from("companies")
        .update({ created_by: authId })
        .eq("created_by", oldUsersId);

      if (updateCompError) throw updateCompError;
      console.log("   ✅ Companies reassigned");
    } else {
      console.log("   ℹ️  No companies linked");
    }

    // Step 4: Delete old record
    console.log("\n📋 Step 4: Deleting old user record...");
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", oldUsersId);

    if (deleteError) throw deleteError;
    console.log("✅ Old record deleted");

    // Step 5: Verify
    console.log("\n📋 Step 5: Verification...");
    const { data: newUser, error: verifyError } = await supabase
      .from("users")
      .select("id, auth_id, email, role, is_active")
      .eq("id", authId)
      .single();

    if (verifyError) throw verifyError;

    console.log("✅ NEW USER RECORD:");
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Auth ID: ${newUser.auth_id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role} ✅`);
    console.log(`   Active: ${newUser.is_active} ✅`);

    console.log("\n✅ ID MISMATCH FIXED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Now test login:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: Nathan777`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixIdMismatch();
