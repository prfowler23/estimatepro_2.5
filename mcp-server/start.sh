#!/bin/bash

# EstimatePro MCP Server Startup Script

set -a # automatically export all variables
source /home/prfowler/Projects/estimatepro_2.5/mcp-server/.env
set +a

cd /home/prfowler/Projects/estimatepro_2.5

# Build the MCP server
echo "Building MCP server..."
npm run mcp:build

# Start the MCP server
echo "Starting MCP server..."
cd mcp-server
exec node build/supabase-mcp-server.js