#!/bin/bash

# EstimatePro Supabase MCP Server Setup Script

set -e

echo "🚀 Setting up EstimatePro Supabase MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_SERVER_DIR="$PROJECT_ROOT/mcp-server"

echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}MCP server directory: $MCP_SERVER_DIR${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Check if TypeScript is available
if ! npx tsc --version &> /dev/null; then
    echo -e "${YELLOW}⚠️  TypeScript not found. Installing globally...${NC}"
    npm install -g typescript
fi

echo -e "${GREEN}✅ TypeScript is available${NC}"

# Create MCP server environment file if it doesn't exist
ENV_FILE="$MCP_SERVER_DIR/.env"
ENV_EXAMPLE="$MCP_SERVER_DIR/.env.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo -e "${YELLOW}⚠️  Please edit $ENV_FILE and add your Supabase credentials${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Build the MCP server
echo -e "${BLUE}🔨 Building MCP server...${NC}"
cd "$PROJECT_ROOT"
npm run mcp:build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MCP server built successfully${NC}"
else
    echo -e "${RED}❌ MCP server build failed${NC}"
    exit 1
fi

# Check if Claude Desktop config directory exists
CLAUDE_CONFIG_DIR="$HOME/.config/claude-desktop"
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${YELLOW}📁 Creating Claude Desktop config directory...${NC}"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# Update Claude Desktop configuration
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
MCP_CONFIG_TEMPLATE="$MCP_SERVER_DIR/claude-desktop-config.json"

echo -e "${BLUE}⚙️  Setting up Claude Desktop configuration...${NC}"

# Check if Claude config file exists
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Claude Desktop config already exists${NC}"
    echo -e "${YELLOW}📋 You'll need to manually merge the MCP server configuration:${NC}"
    echo -e "${BLUE}Source: $MCP_CONFIG_TEMPLATE${NC}"
    echo -e "${BLUE}Target: $CLAUDE_CONFIG_FILE${NC}"
    
    echo -e "\n${YELLOW}Add this to your existing claude_desktop_config.json:${NC}"
    cat "$MCP_CONFIG_TEMPLATE" | jq '.mcpServers'
else
    echo -e "${GREEN}📋 Creating Claude Desktop configuration...${NC}"
    cp "$MCP_CONFIG_TEMPLATE" "$CLAUDE_CONFIG_FILE"
    echo -e "${GREEN}✅ Claude Desktop configuration created${NC}"
fi

# Test the MCP server
echo -e "${BLUE}🧪 Testing MCP server...${NC}"
if [ -f "$ENV_FILE" ]; then
    # Check if environment variables are set
    source "$ENV_FILE"
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${YELLOW}⚠️  Environment variables not set. Please configure $ENV_FILE first${NC}"
        echo -e "${YELLOW}Then run: npm run mcp:start${NC}"
    else
        echo -e "${GREEN}🚀 Starting MCP server test...${NC}"
        timeout 5 npm run mcp:start || echo -e "${YELLOW}⚠️  MCP server test timed out (this is normal)${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 MCP Server setup complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. ${YELLOW}Configure your environment variables in: $ENV_FILE${NC}"
echo -e "2. ${YELLOW}Restart Claude Desktop application${NC}"
echo -e "3. ${YELLOW}Test the MCP connection in Claude Desktop${NC}"
echo -e "\n${BLUE}Available commands:${NC}"
echo -e "- ${GREEN}npm run mcp:build${NC} - Build the MCP server"
echo -e "- ${GREEN}npm run mcp:start${NC} - Start the MCP server"
echo -e "\n${BLUE}MCP Server provides these tools:${NC}"
echo -e "- execute_sql: Run SQL queries on your Supabase database"
echo -e "- list_tables: List all tables in your database"
echo -e "- describe_table: Get table schema information"
echo -e "- get_estimates: Fetch estimate records"
echo -e "- get_analytics_data: Fetch analytics data"
echo -e "- manage_facade_analysis: CRUD operations for facade analyses"
echo -e "- backup_database: Create database backups"
