// ============================================================
// UPDATE AUTH_ID FIELD IN USERS TABLE
// ============================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAuthId() {
  const email = "abanabaasa2@gmail.com";
  const correctAuthId = "88a77423-7f0d-4cd0-861a-3012cf671bd4";
  const oldUsersId = "66f000a1-2ad4-4ca6-a3d5-0d3a3f399e65";

  try {
    console.log("📋 UPDATING AUTH_ID FIELD...\n");

    // Step 1: Check current record
    console.log("Step 1: Checking current record...");
    const { data: user, error: checkError } = await supabase
      .from("users")
      .select("id, auth_id, email, role")
      .eq("email", email)
      .single();

    if (checkError) throw checkError;

    console.log("✅ Found user record:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Auth ID: ${user.auth_id || 'NOT SET'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    // Step 2: Update auth_id field
    console.log("\nStep 2: Updating auth_id field...");
    const { error: updateError } = await supabase
      .from("users")
      .update({
        auth_id: correctAuthId,
        updated_at: new Date().toISOString()
      })
      .eq("email", email);

    if (updateError) throw updateError;
    console.log("✅ Auth ID updated");

    // Step 3: Verify
    console.log("\nStep 3: Verifying update...");
    const { data: updated, error: verifyError } = await supabase
      .from("users")
      .select("id, auth_id, email, role")
      .eq("email", email)
      .single();

    if (verifyError) throw verifyError;

    console.log("✅ VERIFICATION:");
    console.log(`   ID: ${updated.id}`);
    console.log(`   Auth ID: ${updated.auth_id} ✅`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Role: ${updated.role}`);

    console.log("\n✅ AUTH_ID UPDATE COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("AdminPortal now fixed to query using auth_id");
    console.log("\nNext steps:");
    console.log("1. Hard refresh browser: Ctrl+Shift+Delete (all cache)");
    console.log("2. Clear browser console errors");
    console.log("3. Open Incognito window");
    console.log("4. Login with:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: Nathan777`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updateAuthId();
