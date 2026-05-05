// ============================================================
// PROPERLY CLEANUP DUPLICATE USER RECORDS
// Handle foreign key constraints
// ============================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupWithFK() {
  const email = "abanabaasa2@gmail.com";
  const adminRecordId = "66f000a1-2ad4-4ca6-a3d5-0d3a3f399e65";
  const supplierRecordId = "88a77423-7f0d-4cd0-861a-3012cf671bd4";

  try {
    console.log("🧹 CLEANUP WITH FOREIGN KEY HANDLING...\n");

    // Step 1: Find companies linked to duplicate record
    console.log("📋 Step 1: Finding companies linked to duplicate...");
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, name, created_by")
      .eq("created_by", supplierRecordId);

    if (companyError) throw companyError;

    if (companies && companies.length > 0) {
      console.log(`   Found ${companies.length} company/companies`);
      
      // Step 2: Reassign companies to admin record
      console.log("\n📋 Step 2: Reassigning companies to admin record...");
      const { error: updateError } = await supabase
        .from("companies")
        .update({ created_by: adminRecordId })
        .eq("created_by", supplierRecordId);

      if (updateError) throw updateError;
      console.log(`   ✅ Reassigned ${companies.length} company/companies`);

      companies.forEach(c => {
        console.log(`      - ${c.name}`);
      });
    } else {
      console.log("   No companies linked");
    }

    // Step 3: Delete duplicate user
    console.log("\n📋 Step 3: Deleting duplicate user record...");
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", supplierRecordId);

    if (deleteError) throw deleteError;
    console.log("   ✅ Duplicate deleted");

    // Step 4: Verify
    console.log("\n✅ VERIFICATION");
    const { data: remaining, error: verifyError } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", email);

    if (verifyError) throw verifyError;

    console.log(`   Records for ${email}: ${remaining.length}`);
    remaining.forEach(r => {
      console.log(`   - ID: ${r.id}`);
      console.log(`     Role: ${r.role} ✅`);
    });

    console.log("\n✅ CLEANUP COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Password Reset: Nathan777");
    console.log("Next Steps:");
    console.log("1. Clear browser cache: Ctrl+Shift+Delete");
    console.log("2. Login with:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: Nathan777`);
    console.log("3. You should now see admin dashboard ✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanupWithFK();
