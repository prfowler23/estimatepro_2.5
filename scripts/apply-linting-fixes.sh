#!/bin/bash

# Supabase Linting Fixes Application Script
# This script applies the SQL fixes to resolve Supabase database linting errors

set -e  # Exit on any error

echo "🔧 Supabase Database Linting Fixes"
echo "=================================="

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL environment variable is not set"
    echo "Please set it to your Supabase database connection string:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres'"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Check if SQL file exists
SQL_FILE="fix-supabase-linting-errors.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL fix file not found: $SQL_FILE"
    echo "Please ensure the file exists in the current directory"
    exit 1
fi

echo "📝 Applying SQL fixes..."
echo "📄 File: $SQL_FILE"
echo "🔗 Database: $SUPABASE_DB_URL"
echo ""

# Apply the SQL fixes
if psql "$SUPABASE_DB_URL" -f "$SQL_FILE"; then
    echo ""
    echo "✅ SQL fixes applied successfully!"
    echo ""
    echo "🔍 Next steps:"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to Database > Database Linter"
    echo "3. Run the linter to verify all issues are resolved"
    echo ""
    echo "Expected results:"
    echo "  ✅ Auth RLS Initialization Plan: All warnings resolved"
    echo "  ✅ Multiple Permissive Policies: All warnings resolved"
    echo "  ✅ Duplicate Index: All warnings resolved"
else
    echo ""
    echo "❌ Failed to apply SQL fixes"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check your database connection string"
    echo "2. Ensure you have the correct permissions"
    echo "3. Try running the SQL manually in Supabase SQL Editor"
    exit 1
fi 