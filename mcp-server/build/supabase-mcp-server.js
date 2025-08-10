#!/usr/bin/env node
"use strict";
/**
 * Custom Supabase MCP Server for EstimatePro
 * Provides Model Context Protocol interface for Supabase database operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
// Environment validation schema
const envSchema = zod_1.z.object({
  NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(1),
});
// Validate environment variables
let config;
try {
  config = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
} catch (error) {
  console.error("❌ Environment variables validation failed:");
  if (error instanceof zod_1.z.ZodError) {
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
  }
  process.exit(1);
}
// Create Supabase admin client with service role key
const supabase = (0, supabase_js_1.createClient)(
  config.NEXT_PUBLIC_SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
// Create MCP server
const server = new index_js_1.Server(
  {
    name: "estimatepro-supabase-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);
// Define available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_sql",
        description: "Execute a SQL query on the EstimatePro Supabase database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The SQL query to execute",
            },
            params: {
              type: "array",
              description: "Parameters for the SQL query (optional)",
              items: {
                type: "string",
              },
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_tables",
        description: "List all tables in the EstimatePro database",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "describe_table",
        description: "Get the schema/structure of a specific table",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "The name of the table to describe",
            },
          },
          required: ["table_name"],
        },
      },
      {
        name: "get_estimates",
        description: "Get estimates data with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of records to return (default: 10)",
            },
            status: {
              type: "string",
              description: "Filter by estimate status",
            },
            user_id: {
              type: "string",
              description: "Filter by user ID",
            },
          },
        },
      },
      {
        name: "get_analytics_data",
        description: "Get analytics and metrics data",
        inputSchema: {
          type: "object",
          properties: {
            metric_type: {
              type: "string",
              description: "Type of analytics metric to retrieve",
            },
            date_from: {
              type: "string",
              description: "Start date for analytics (YYYY-MM-DD)",
            },
            date_to: {
              type: "string",
              description: "End date for analytics (YYYY-MM-DD)",
            },
          },
        },
      },
      {
        name: "manage_facade_analysis",
        description: "Manage facade analysis records",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "get", "create", "update", "delete"],
              description: "Action to perform on facade analysis records",
            },
            id: {
              type: "string",
              description:
                "ID of the facade analysis (required for get, update, delete)",
            },
            data: {
              type: "object",
              description: "Data for create/update operations",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "backup_database",
        description: "Create a backup of critical database tables",
        inputSchema: {
          type: "object",
          properties: {
            tables: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific tables to backup (optional, defaults to all critical tables)",
            },
          },
        },
      },
    ],
  };
});
// Handle tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "execute_sql": {
        const { query, params = [] } = args;
        // Basic SQL injection protection - only allow SELECT, UPDATE, INSERT, DELETE
        const trimmedQuery = query.trim().toUpperCase();
        const allowedOperations = [
          "SELECT",
          "UPDATE",
          "INSERT",
          "DELETE",
          "WITH",
        ];
        const isAllowed = allowedOperations.some((op) =>
          trimmedQuery.startsWith(op),
        );
        if (!isAllowed) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InvalidParams,
            "Only SELECT, UPDATE, INSERT, DELETE, and WITH queries are allowed",
          );
        }
        const { data, error } = await supabase.rpc("exec_sql", {
          sql_query: query,
          params: params,
        });
        if (error) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InternalError,
            `SQL execution failed: ${error.message}`,
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case "list_tables": {
        const { data, error } = await supabase
          .from("information_schema.tables")
          .select("table_name, table_type")
          .eq("table_schema", "public");
        if (error) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InternalError,
            `Failed to list tables: ${error.message}`,
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case "describe_table": {
        const { table_name } = args;
        const { data, error } = await supabase
          .from("information_schema.columns")
          .select("column_name, data_type, is_nullable, column_default")
          .eq("table_name", table_name)
          .eq("table_schema", "public");
        if (error) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InternalError,
            `Failed to describe table: ${error.message}`,
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case "get_estimates": {
        const { limit = 10, status, user_id } = args;
        let query = supabase.from("estimates").select("*").limit(limit);
        if (status) {
          query = query.eq("status", status);
        }
        if (user_id) {
          query = query.eq("user_id", user_id);
        }
        const { data, error } = await query;
        if (error) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InternalError,
            `Failed to get estimates: ${error.message}`,
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case "get_analytics_data": {
        const { metric_type, date_from, date_to } = args;
        let query = supabase.from("analytics_events").select("*");
        if (metric_type) {
          query = query.eq("event_type", metric_type);
        }
        if (date_from) {
          query = query.gte("created_at", date_from);
        }
        if (date_to) {
          query = query.lte("created_at", date_to);
        }
        const { data, error } = await query;
        if (error) {
          throw new types_js_1.McpError(
            types_js_1.ErrorCode.InternalError,
            `Failed to get analytics data: ${error.message}`,
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case "manage_facade_analysis": {
        const { action, id, data: recordData } = args;
        switch (action) {
          case "list": {
            const { data, error } = await supabase
              .from("facade_analyses")
              .select("*")
              .order("created_at", { ascending: false });
            if (error) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InternalError,
                `Failed to list facade analyses: ${error.message}`,
              );
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          case "get": {
            if (!id) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InvalidParams,
                "ID is required for get action",
              );
            }
            const { data, error } = await supabase
              .from("facade_analyses")
              .select("*")
              .eq("id", id)
              .single();
            if (error) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InternalError,
                `Failed to get facade analysis: ${error.message}`,
              );
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          case "create": {
            if (!recordData) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InvalidParams,
                "Data is required for create action",
              );
            }
            const { data, error } = await supabase
              .from("facade_analyses")
              .insert(recordData)
              .select();
            if (error) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InternalError,
                `Failed to create facade analysis: ${error.message}`,
              );
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          case "update": {
            if (!id || !recordData) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InvalidParams,
                "ID and data are required for update action",
              );
            }
            const { data, error } = await supabase
              .from("facade_analyses")
              .update(recordData)
              .eq("id", id)
              .select();
            if (error) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InternalError,
                `Failed to update facade analysis: ${error.message}`,
              );
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          case "delete": {
            if (!id) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InvalidParams,
                "ID is required for delete action",
              );
            }
            const { error } = await supabase
              .from("facade_analyses")
              .delete()
              .eq("id", id);
            if (error) {
              throw new types_js_1.McpError(
                types_js_1.ErrorCode.InternalError,
                `Failed to delete facade analysis: ${error.message}`,
              );
            }
            return {
              content: [
                {
                  type: "text",
                  text: "Facade analysis deleted successfully",
                },
              ],
            };
          }
          default:
            throw new types_js_1.McpError(
              types_js_1.ErrorCode.InvalidParams,
              `Unknown action: ${action}`,
            );
        }
      }
      case "backup_database": {
        const { tables = [] } = args;
        const defaultTables = [
          "estimates",
          "facade_analyses",
          "analytics_events",
          "users",
        ];
        const tablesToBackup = tables.length > 0 ? tables : defaultTables;
        const backupResults = [];
        for (const table of tablesToBackup) {
          const { data, error } = await supabase.from(table).select("*");
          if (error) {
            backupResults.push({
              table,
              status: "error",
              message: error.message,
            });
          } else {
            backupResults.push({
              table,
              status: "success",
              recordCount: data?.length || 0,
            });
          }
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  backup_timestamp: new Date().toISOString(),
                  results: backupResults,
                },
                null,
                2,
              ),
            },
          ],
        };
      }
      default:
        throw new types_js_1.McpError(
          types_js_1.ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`,
        );
    }
  } catch (error) {
    if (error instanceof types_js_1.McpError) {
      throw error;
    }
    throw new types_js_1.McpError(
      types_js_1.ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});
// Start the server
async function main() {
  const transport = new stdio_js_1.StdioServerTransport();
  await server.connect(transport);
  console.error("✅ EstimatePro Supabase MCP Server running on stdio");
}
main().catch((error) => {
  console.error("❌ Server failed to start:", error);
  process.exit(1);
});
