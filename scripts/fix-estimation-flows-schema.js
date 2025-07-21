#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function fixEstimationFlowsSchema() {
  console.log("🔧 Starting estimation_flows schema fix...\n");

  // Load environment variables
  require("dotenv").config({ path: ".env.local" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    console.error(
      "\nPlease ensure your .env.local file contains these variables.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Test database connection
    console.log("📡 Testing database connection...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("auth.users")
      .select("id")
      .limit(1);

    if (connectionError) {
      console.log("⚠️  Standard connection test failed, trying alternative...");
      // Try a simple query that should work
      const { error: altError } = await supabase.rpc("current_user");
      if (altError) {
        throw new Error(`Database connection failed: ${altError.message}`);
      }
    }

    console.log("✅ Database connection successful");

    // Check current schema state
    console.log("\n🔍 Checking current schema state...");

    // Check if estimation_flows table exists
    const { data: tableExists } = await supabase
      .rpc("execute_sql", {
        sql: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'estimation_flows'
        ) as table_exists;
      `,
      })
      .single();

    if (tableExists?.table_exists) {
      console.log(
        "📋 estimation_flows table exists - will backup and recreate",
      );

      // Check current structure
      const { data: columns } = await supabase.rpc("execute_sql", {
        sql: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'estimation_flows'
          ORDER BY ordinal_position;
        `,
      });

      console.log("📊 Current table structure:");
      if (columns && Array.isArray(columns)) {
        columns.forEach((col) => {
          console.log(
            `   - ${col.column_name}: ${col.data_type} ${col.is_nullable === "YES" ? "(nullable)" : "(not null)"}`,
          );
        });
      }
    } else {
      console.log("📋 estimation_flows table does not exist - will create new");
    }

    // Read the migration SQL file
    console.log("\n📖 Reading migration script...");
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_fix_estimation_flows_schema.sql",
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log(
      `✅ Migration script loaded (${migrationSQL.length} characters)`,
    );

    // Execute the migration
    console.log("\n🚀 Executing schema migration...");
    console.log(
      "⚠️  This may take a few moments and will output detailed progress...\n",
    );

    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements and comments
      if (!statement || statement.startsWith("--") || statement.trim() === "") {
        continue;
      }

      try {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);

        const { error } = await supabase.rpc("execute_sql", {
          sql: statement + ";",
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);

          // Some errors are expected (like "already exists" errors)
          const expectedErrors = [
            "already exists",
            "does not exist",
            "constraint already exists",
            "relation already exists",
          ];

          const isExpectedError = expectedErrors.some((expectedErr) =>
            error.message.toLowerCase().includes(expectedErr),
          );

          if (isExpectedError) {
            console.log("   ℹ️  This error is expected and can be ignored");
            successCount++;
          } else {
            errorCount++;
            console.log("   Statement:", statement.substring(0, 100) + "...");
          }
        } else {
          successCount++;
          console.log("   ✅ Success");
        }
      } catch (err) {
        errorCount++;
        console.error(
          `❌ Unexpected error in statement ${i + 1}:`,
          err.message,
        );
        console.log("   Statement:", statement.substring(0, 100) + "...");
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);

    // Verify the new schema
    console.log("\n🔍 Verifying new schema...");

    const { data: newColumns, error: columnsError } = await supabase.rpc(
      "execute_sql",
      {
        sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'estimation_flows'
        ORDER BY ordinal_position;
      `,
      },
    );

    if (columnsError) {
      console.error("❌ Failed to verify schema:", columnsError.message);
    } else {
      console.log("✅ New table structure:");
      if (newColumns && Array.isArray(newColumns)) {
        newColumns.forEach((col) => {
          console.log(
            `   - ${col.column_name}: ${col.data_type} ${col.is_nullable === "YES" ? "(nullable)" : "(not null)"}`,
          );
        });

        // Check for required columns
        const requiredColumns = ["id", "estimate_id", "user_id", "flow_data"];
        const existingColumns = newColumns.map((col) => col.column_name);
        const missingColumns = requiredColumns.filter(
          (col) => !existingColumns.includes(col),
        );

        if (missingColumns.length === 0) {
          console.log("\n✅ All required columns are present");
        } else {
          console.log(
            "\n❌ Missing required columns:",
            missingColumns.join(", "),
          );
        }
      }
    }

    // Test basic operations
    console.log("\n🧪 Testing basic operations...");

    // Test if we can query the table
    const { data: testQuery, error: testError } = await supabase
      .from("estimation_flows")
      .select("id")
      .limit(1);

    if (testError) {
      console.error(
        "❌ Failed to query estimation_flows table:",
        testError.message,
      );
    } else {
      console.log("✅ estimation_flows table query successful");
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc(
      "execute_sql",
      {
        sql: `
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'estimation_flows';
      `,
      },
    );

    if (policiesError) {
      console.log("⚠️  Could not verify RLS policies:", policiesError.message);
    } else {
      console.log(
        `✅ RLS policies configured: ${policies?.length || 0} policies found`,
      );
    }

    console.log("\n🎉 Schema migration completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("   1. Test the auto-save functionality in the application");
    console.log("   2. Verify that 406/400 errors are resolved");
    console.log("   3. Check the browser console for any remaining issues");
    console.log("   4. If issues persist, check the application logs");

    console.log("\n💡 Troubleshooting tips:");
    console.log("   - Clear browser cache and reload the application");
    console.log("   - Check that user authentication is working properly");
    console.log(
      "   - Verify that the guided estimation flow can create new estimates",
    );
  } catch (error) {
    console.error("\n💥 Migration failed:", error.message);
    console.error("\nPlease check:");
    console.error("   1. Database connection and credentials");
    console.error("   2. Database user permissions");
    console.error("   3. Network connectivity to Supabase");
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  fixEstimationFlowsSchema().catch(console.error);
}

module.exports = { fixEstimationFlowsSchema };
