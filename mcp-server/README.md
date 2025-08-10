# EstimatePro Supabase MCP Server

This is a custom Model Context Protocol (MCP) server that provides Claude Desktop with direct access to your EstimatePro Supabase database. It allows Claude to interact with your database through a secure, structured interface.

## Features

- **Secure Database Access**: Uses Supabase service role key for authenticated database operations
- **SQL Execution**: Execute SELECT, INSERT, UPDATE, DELETE queries safely
- **Schema Introspection**: List tables and describe table structures
- **EstimatePro-Specific Operations**:
  - Manage estimates
  - Handle facade analyses
  - Access analytics data
  - Database backups
- **Built-in Security**: SQL injection protection and query validation

## Quick Setup

### 1. Automated Setup (Recommended)

Run the setup script to automatically configure everything:

```bash
cd /home/prfowler/Projects/estimatepro_2.5
./mcp-server/setup-mcp.sh
```

This will:

- Build the MCP server
- Create environment configuration
- Set up Claude Desktop integration
- Test the connection

### 2. Manual Setup

If you prefer manual setup:

#### Step 1: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk --save-dev
```

#### Step 2: Configure Environment

```bash
cp mcp-server/.env.example mcp-server/.env
# Edit mcp-server/.env with your Supabase credentials
```

#### Step 3: Build the Server

```bash
npm run mcp:build
```

#### Step 4: Configure Claude Desktop

Edit your Claude Desktop configuration file at `~/.config/claude-desktop/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "estimatepro-supabase": {
      "command": "node",
      "args": [
        "/home/prfowler/Projects/estimatepro_2.5/mcp-server/build/supabase-mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### Step 5: Restart Claude Desktop

Close and restart the Claude Desktop application to load the MCP server.

## Environment Variables

The MCP server requires the same Supabase credentials as your main EstimatePro application:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional
MCP_SERVER_PORT=3001
MCP_LOG_LEVEL=info
```

## Available Tools

Once configured, Claude Desktop will have access to these tools:

### 1. `execute_sql`

Execute SQL queries on your database:

```typescript
{
  query: "SELECT * FROM estimates WHERE status = 'draft' LIMIT 5",
  params?: string[] // Optional query parameters
}
```

### 2. `list_tables`

List all tables in your database:

```typescript
// No parameters required
```

### 3. `describe_table`

Get schema information for a specific table:

```typescript
{
  table_name: "estimates";
}
```

### 4. `get_estimates`

Fetch estimates with filtering options:

```typescript
{
  limit?: number,      // Default: 10
  status?: string,     // Filter by status
  user_id?: string     // Filter by user
}
```

### 5. `get_analytics_data`

Retrieve analytics and metrics:

```typescript
{
  metric_type?: string,    // Type of metric
  date_from?: string,      // Start date (YYYY-MM-DD)
  date_to?: string         // End date (YYYY-MM-DD)
}
```

### 6. `manage_facade_analysis`

CRUD operations for facade analysis records:

```typescript
{
  action: "list" | "get" | "create" | "update" | "delete",
  id?: string,       // Required for get/update/delete
  data?: object      // Required for create/update
}
```

### 7. `backup_database`

Create backups of critical tables:

```typescript
{
  tables?: string[]  // Optional: specific tables to backup
}
```

## Security Features

- **Query Validation**: Only allows SELECT, INSERT, UPDATE, DELETE, and WITH operations
- **Service Role Authentication**: Uses Supabase service role key for secure access
- **Input Sanitization**: Validates and sanitizes all inputs
- **Error Handling**: Comprehensive error handling and logging

## Usage Examples

Once configured, you can ask Claude Desktop to:

- "Show me the latest 5 estimates from the database"
- "What's the schema of the facade_analyses table?"
- "Create a backup of the estimates and analytics_events tables"
- "Find all estimates with 'draft' status created in the last 30 days"
- "Update the facade analysis with ID 123 to mark it as complete"

## Troubleshooting

### MCP Server Not Connecting

1. **Check Environment Variables**: Ensure all required variables are set in `mcp-server/.env`
2. **Verify Supabase Credentials**: Test your Supabase connection independently
3. **Check Claude Desktop Configuration**: Ensure the path in `claude_desktop_config.json` is correct
4. **Restart Claude Desktop**: Always restart after configuration changes

### Build Errors

```bash
# Clean build and rebuild
rm -rf mcp-server/build
npm run mcp:build
```

### Permission Issues

```bash
# Ensure script is executable
chmod +x mcp-server/setup-mcp.sh
```

### Environment Loading Issues

Make sure your `.env` file is in the correct location:

```
/home/prfowler/Projects/estimatepro_2.5/mcp-server/.env
```

## Development

### Testing the MCP Server

```bash
# Start the server for testing
npm run mcp:start

# Build only
npm run mcp:build
```

### Adding New Tools

1. Edit `mcp-server/supabase-mcp-server.ts`
2. Add new tool definition in `ListToolsRequestSchema` handler
3. Add new tool implementation in `CallToolRequestSchema` handler
4. Rebuild: `npm run mcp:build`
5. Restart Claude Desktop

### Logs and Debugging

The MCP server logs to stderr. To see logs:

```bash
# Run with verbose logging
MCP_LOG_LEVEL=debug npm run mcp:start
```

## Support

For issues specific to this MCP server:

1. Check the troubleshooting section above
2. Verify your Supabase configuration
3. Test database connectivity independently
4. Review Claude Desktop MCP documentation

## Version History

- **1.0.0**: Initial release with core database operations
  - SQL execution with safety checks
  - Schema introspection
  - EstimatePro-specific operations
  - Database backup functionality
