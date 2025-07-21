const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function fixAuthIssues() {
  console.log("🔧 EstimatePro Authentication Fix Tool");
  console.log("=====================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log("❌ Missing required environment variables");
    return;
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const regularClient = createClient(supabaseUrl, supabaseAnonKey);

  // Step 1: Create demo user using admin client
  console.log("👤 Step 1: Creating Demo User");
  console.log("-----------------------------");

  try {
    // Check if demo user already exists
    console.log("🔍 Checking if demo user already exists...");
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const demoUserExists = existingUsers?.users?.find(
      (user) => user.email === "demo@estimatepro.com",
    );

    if (demoUserExists) {
      console.log("✅ Demo user already exists!");
      console.log(`   ID: ${demoUserExists.id}`);
      console.log(`   Email: ${demoUserExists.email}`);
      console.log(
        `   Confirmed: ${demoUserExists.email_confirmed_at ? "✅" : "❌"}`,
      );

      // If not confirmed, confirm it
      if (!demoUserExists.email_confirmed_at) {
        console.log("📧 Confirming demo user email...");
        const { data: confirmData, error: confirmError } =
          await adminClient.auth.admin.updateUserById(demoUserExists.id, {
            email_confirm: true,
          });

        if (confirmError) {
          console.log(`❌ Failed to confirm email: ${confirmError.message}`);
        } else {
          console.log("✅ Demo user email confirmed");
        }
      }
    } else {
      console.log("🆕 Creating new demo user...");

      // Create demo user with admin client
      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email: "demo@estimatepro.com",
          password: "demo123",
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: "Demo User",
            company_name: "EstimatePro Demo",
          },
        });

      if (createError) {
        console.log(`❌ Failed to create demo user: ${createError.message}`);
        return;
      }

      console.log("✅ Demo user created successfully!");
      console.log(`   ID: ${createData.user.id}`);
      console.log(`   Email: ${createData.user.email}`);

      // Step 2: Create profile for demo user
      console.log("\\n📋 Step 2: Creating Demo User Profile");
      console.log("-------------------------------------");

      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: createData.user.id,
          full_name: "Demo User",
          email: "demo@estimatepro.com",
          role: "admin",
          company_name: "EstimatePro Demo",
          phone: "(555) 123-4567",
        });

      if (profileError) {
        console.log(`⚠️ Failed to create profile: ${profileError.message}`);
        console.log("Profile will be created automatically on first login");
      } else {
        console.log("✅ Demo user profile created");
      }
    }
  } catch (adminError) {
    console.log(`❌ Admin operation failed: ${adminError.message}`);
    console.log("\\nTrying alternative approach...");

    // Alternative: Use signup flow
    console.log("\\n🔄 Alternative: Using Signup Flow");
    console.log("----------------------------------");

    try {
      const { data: signupData, error: signupError } =
        await regularClient.auth.signUp({
          email: "demo@estimatepro.com",
          password: "demo123",
          options: {
            data: {
              full_name: "Demo User",
              company_name: "EstimatePro Demo",
            },
          },
        });

      if (signupError) {
        if (signupError.message.includes("already registered")) {
          console.log("✅ Demo user already exists (signup confirms this)");
        } else {
          console.log(`❌ Signup failed: ${signupError.message}`);
          return;
        }
      } else {
        console.log("✅ Demo user created via signup flow");
        console.log(`   ID: ${signupData.user?.id}`);
        console.log(`   Email: ${signupData.user?.email}`);
        console.log(
          "   📧 Check email for confirmation link (or email confirmation may be disabled)",
        );
      }
    } catch (signupErr) {
      console.log(`❌ Signup approach failed: ${signupErr.message}`);
    }
  }

  // Step 3: Test demo login
  console.log("\\n🧪 Step 3: Testing Demo Login");
  console.log("------------------------------");

  try {
    const { data: loginData, error: loginError } =
      await regularClient.auth.signInWithPassword({
        email: "demo@estimatepro.com",
        password: "demo123",
      });

    if (loginError) {
      console.log(`❌ Demo login still failing: ${loginError.message}`);

      if (loginError.message.includes("Invalid login credentials")) {
        console.log("\\n💡 Possible causes:");
        console.log("   - User was not created successfully");
        console.log("   - Password is different than expected");
        console.log("   - Email confirmation is required");
      } else if (loginError.message.includes("Email not confirmed")) {
        console.log(
          "\\n💡 Email confirmation required - check Supabase auth settings",
        );
      }
    } else {
      console.log("🎉 Demo login successful!");
      console.log(`   User ID: ${loginData.user.id}`);
      console.log(`   Email: ${loginData.user.email}`);

      // Check profile
      const { data: profile, error: profileCheckError } = await regularClient
        .from("profiles")
        .select("*")
        .eq("id", loginData.user.id)
        .single();

      if (profileCheckError) {
        console.log(`⚠️ Profile check: ${profileCheckError.message}`);
      } else {
        console.log("✅ Profile exists and accessible");
        console.log(`   Name: ${profile.full_name}`);
        console.log(`   Role: ${profile.role}`);
      }

      // Sign out to clean up
      await regularClient.auth.signOut();
      console.log("✅ Signed out successfully");
    }
  } catch (testError) {
    console.log(`❌ Login test failed: ${testError.message}`);
  }

  // Step 4: Additional fixes
  console.log("\\n🔧 Step 4: Additional Fixes");
  console.log("----------------------------");

  // Check auth settings that might be causing issues
  console.log("\\n📋 Auth Configuration Recommendations:");
  console.log("1. Go to Supabase Dashboard → Authentication → Settings");
  console.log(
    '2. Check "Enable email confirmations" - consider disabling for demo',
  );
  console.log(
    '3. Verify "Site URL" is set to http://localhost:3000 for development',
  );
  console.log('4. Check "Auth Providers" - ensure Email is enabled');

  console.log("\\n🎯 Manual Steps (if needed):");
  console.log("1. Go to Supabase Dashboard → Authentication → Users");
  console.log("2. Manually create user with email: demo@estimatepro.com");
  console.log("3. Set password to: demo123");
  console.log("4. Mark email as confirmed");

  console.log("\\n✅ Fix attempt complete!");
  console.log("\\n🧪 Run the diagnostic again to verify fixes:");
  console.log("   node diagnose-auth-issues.js");
}

fixAuthIssues().catch(console.error);
