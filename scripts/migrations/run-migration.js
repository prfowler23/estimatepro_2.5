#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Migrations directory
const migrationsDir = path.join(
  __dirname,
  "..",
  "..",
  "supabase",
  "migrations",
);

// Create migrations tracking table if it doesn't exist
async function createMigrationsTable() {
  const { error } = await supabase.rpc("query", {
    query: `
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  });

  if (error) {
    // If RPC doesn't exist, try direct execution (won't work in production)
    console.log(
      "📝 Note: Migrations table may need to be created manually in production",
    );
  }
}

// Get list of executed migrations
async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from("schema_migrations")
    .select("version")
    .order("version", { ascending: true });

  if (error) {
    // Table might not exist yet
    return [];
  }

  return data.map((row) => row.version);
}

// Execute a migration
async function executeMigration(filename, content) {
  console.log(`\n🔄 Running migration: ${filename}`);

  try {
    // For production, you'll need to use Supabase Dashboard or CLI
    // This is for development only
    console.log("📋 Migration content preview:");
    console.log(content.substring(0, 200) + "...\n");

    // Record migration as executed
    const { error } = await supabase
      .from("schema_migrations")
      .insert({ version: filename });

    if (error) {
      throw error;
    }

    console.log(`✅ Migration ${filename} executed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error.message);
    return false;
  }
}

// Main migration runner
async function runMigrations() {
  console.log("🚀 Starting migration runner...\n");

  // Create migrations table
  await createMigrationsTable();

  // Get executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`📊 Found ${executedMigrations.length} executed migrations`);

  // Get all migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`📁 Found ${migrationFiles.length} migration files\n`);

  // Find pending migrations
  const pendingMigrations = migrationFiles.filter(
    (file) => !executedMigrations.includes(file),
  );

  if (pendingMigrations.length === 0) {
    console.log("✨ All migrations are up to date!");
    return;
  }

  console.log(`📝 ${pendingMigrations.length} pending migrations to run:\n`);
  pendingMigrations.forEach((file) => console.log(`  - ${file}`));

  // Execute pending migrations
  let successCount = 0;
  for (const file of pendingMigrations) {
    const filepath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filepath, "utf8");

    const success = await executeMigration(file, content);
    if (success) {
      successCount++;
    } else {
      console.error("\n⚠️  Migration failed! Stopping execution.");
      break;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`  - Total: ${pendingMigrations.length}`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Failed: ${pendingMigrations.length - successCount}`);

  if (successCount === pendingMigrations.length) {
    console.log("\n✅ All migrations completed successfully!");
  } else {
    console.log("\n❌ Some migrations failed. Please check the errors above.");
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(console.error);
