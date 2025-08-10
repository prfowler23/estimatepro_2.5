#!/bin/bash

# EstimatePro MCP Configuration Script
# This script helps set up the MCP server with your Supabase credentials

set -e

echo "🔧 EstimatePro MCP Configuration Setup"
echo "======================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "📝 Please create .env.local with your Supabase credentials first."
    echo ""
    echo "You can copy the template:"
    echo "  cp .env.local.template .env.local"
    echo ""
    echo "Then edit .env.local with your actual Supabase credentials from:"
    echo "  https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    echo ""
    exit 1
fi

echo "✅ Found .env.local file"

# Source environment variables
source .env.local

# Check required variables
REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"here"* ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing or unconfigured variables in .env.local:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please edit .env.local and set these variables with your actual Supabase credentials."
    exit 1
fi

echo "✅ All required Supabase credentials are configured"

# Update MCP server environment file
MCP_ENV_FILE="mcp-server/.env"
echo "📝 Updating MCP server environment file..."

cat > "$MCP_ENV_FILE" << EOF
# EstimatePro MCP Server Environment Configuration
# Auto-generated from .env.local

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Optional: Additional MCP Configuration
MCP_SERVER_PORT=3001
MCP_LOG_LEVEL=info
EOF

echo "✅ MCP server environment configured"

# Test the configuration
echo "🧪 Testing MCP server configuration..."
if npm run mcp:build > /dev/null 2>&1; then
    echo "✅ MCP server builds successfully"
else
    echo "❌ MCP server build failed"
    exit 1
fi

# Test connectivity
echo "🔗 Testing Supabase connectivity..."
if npm run test:connectivity | grep -q "Database Connectivity"; then
    echo "✅ Connectivity test completed"
else
    echo "⚠️  Connectivity test had issues (check npm run test:connectivity for details)"
fi

echo ""
echo "🎉 MCP Configuration Complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop application"
echo "2. Test the MCP connection by asking Claude to 'list tables in my database'"
echo ""
echo "Available commands:"
echo "  npm run mcp:start  - Start the MCP server"
echo "  npm run mcp:build  - Build the MCP server"
echo "  npm run test:connectivity - Test all connections"
