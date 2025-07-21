#!/bin/bash

# Database Security Fixes Script
# Applies security fixes using psql directly

set -e

echo "🔒 EstimatePro Database Security Fixes"
echo "======================================"

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL environment variable is not set"
    echo "Please set it to your Supabase database connection string:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres'"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed or not in PATH"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/../fix-database-security.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: Security fix SQL file not found at $SQL_FILE"
    exit 1
fi

echo "📄 Found security fix SQL file: $SQL_FILE"
echo "📊 File size: $(du -h "$SQL_FILE" | cut -f1)"
echo ""

# Execute the security fixes
echo "⚡ Applying security fixes to database..."
echo ""

if psql "$SUPABASE_DB_URL" -f "$SQL_FILE"; then
    echo ""
    echo "✅ Security fixes applied successfully!"
    echo ""
    echo "🔒 Summary of fixes applied:"
    echo "   ✅ Removed SECURITY DEFINER views (service_type_stats, quote_summary, integration_health_view)"
    echo "   ✅ Created secure replacement functions with SECURITY INVOKER"
    echo "   ✅ Enabled RLS on estimation_flows_backup table"
    echo "   ✅ Fixed RLS policies that referenced user_metadata"
    echo "   ✅ Added comprehensive RLS policies for core tables"
    echo "   ✅ Created security verification function"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Update your application code to use the new functions:"
    echo "      - SELECT * FROM get_service_type_stats();"
    echo "      - SELECT * FROM get_quote_summary();"
    echo "      - SELECT * FROM get_integration_health();"
    echo "   2. Test your application functionality"
    echo "   3. Run the Supabase linter again to verify all issues are resolved"
    echo ""
    echo "🔍 To verify fixes were applied correctly, run:"
    echo "   SELECT * FROM verify_security_fixes();"
    echo ""
else
    echo ""
    echo "❌ Error applying security fixes"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "   1. Verify your SUPABASE_DB_URL is correct"
    echo "   2. Check that you have sufficient database permissions"
    echo "   3. Ensure your database is accessible"
    echo "   4. Try applying the SQL file manually in Supabase dashboard"
    echo ""
    echo "💡 You can also run the fixes manually by copying the contents of:"
    echo "   $SQL_FILE"
    echo "   and pasting it into the Supabase SQL editor"
    exit 1
fi