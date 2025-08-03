#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");

const migrationsDir = path.join(
  __dirname,
  "..",
  "..",
  "supabase",
  "migrations",
);

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Get migration name from command line
const migrationName = process.argv[2];
if (!migrationName) {
  console.error("Please provide a migration name");
  console.error("Usage: npm run create-migration <migration-name>");
  process.exit(1);
}

// Create timestamp and filename
const timestamp = format(new Date(), "yyyyMMddHHmmss");
const filename = `${timestamp}_${migrationName.toLowerCase().replace(/\s+/g, "_")}.sql`;
const filepath = path.join(migrationsDir, filename);

// Migration template
const template = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here

-- Example:
-- CREATE TABLE IF NOT EXISTS new_table (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Don't forget to:
-- 1. Add appropriate indexes
-- 2. Set up RLS policies if needed
-- 3. Grant necessary permissions
`;

// Write migration file
fs.writeFileSync(filepath, template);

console.log(`✅ Created migration: ${filename}`);
console.log(`📁 Location: ${filepath}`);
console.log("\nNext steps:");
console.log("1. Edit the migration file with your SQL");
console.log("2. Test locally: npm run migrate:up");
console.log("3. Commit the migration file");
