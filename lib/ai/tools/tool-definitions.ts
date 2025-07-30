import { z } from "zod";

// Tool parameter schemas using Zod for validation
export const toolSchemas = {
  analyzePhoto: z.object({
    imageUrl: z.string().url().describe("URL of the image to analyze"),
    analysisType: z
      .enum(["facade", "general", "measurement"])
      .describe("Type of analysis to perform"),
  }),

  calculateService: z.object({
    serviceType: z
      .enum([
        "window-cleaning",
        "pressure-washing",
        "soft-washing",
        "granite-reconditioning",
        "parking-deck",
      ])
      .describe("Type of service to calculate"),
    parameters: z
      .record(z.any())
      .describe("Service-specific calculation parameters"),
  }),

  searchEstimates: z.object({
    query: z.string().optional().describe("Search query"),
    status: z
      .enum(["draft", "pending", "approved", "rejected", "archived"])
      .optional()
      .describe("Filter by estimate status"),
    dateRange: z
      .object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      })
      .optional()
      .describe("Filter by date range"),
    limit: z.number().int().positive().max(50).default(10),
  }),

  getWeather: z.object({
    location: z.string().describe("Location for weather data"),
    days: z
      .number()
      .int()
      .positive()
      .max(7)
      .default(1)
      .describe("Number of days forecast"),
  }),

  createQuote: z.object({
    services: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number().positive(),
          unitPrice: z.number().positive(),
          description: z.string().optional(),
        }),
      )
      .describe("List of services to include"),
    customerInfo: z
      .object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
      .describe("Customer information"),
  }),

  analyzeRisk: z.object({
    projectDescription: z.string().describe("Description of the project"),
    factors: z
      .array(z.string())
      .optional()
      .describe("Specific risk factors to consider"),
  }),

  findSimilarProjects: z.object({
    projectType: z.string().describe("Type of project"),
    budget: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Budget range"),
    features: z
      .array(z.string())
      .optional()
      .describe("Project features to match"),
  }),
};

// OpenAI function definitions
export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "analyzePhoto",
      description:
        "Analyze a photo for facade details, measurements, or general building information",
      parameters: {
        type: "object",
        properties: {
          imageUrl: {
            type: "string",
            description: "URL of the image to analyze",
          },
          analysisType: {
            type: "string",
            enum: ["facade", "general", "measurement"],
            description: "Type of analysis to perform",
          },
        },
        required: ["imageUrl", "analysisType"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculateService",
      description:
        "Calculate pricing for various building services like window cleaning, pressure washing, etc.",
      parameters: {
        type: "object",
        properties: {
          serviceType: {
            type: "string",
            enum: [
              "window-cleaning",
              "pressure-washing",
              "soft-washing",
              "granite-reconditioning",
              "parking-deck",
            ],
            description: "Type of service to calculate",
          },
          parameters: {
            type: "object",
            description: "Service-specific calculation parameters",
          },
        },
        required: ["serviceType", "parameters"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "searchEstimates",
      description: "Search and retrieve estimates based on various criteria",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          status: {
            type: "string",
            enum: ["draft", "pending", "approved", "rejected", "archived"],
            description: "Filter by estimate status",
          },
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string" },
              end: { type: "string" },
            },
            description: "Filter by date range",
          },
          limit: {
            type: "number",
            description: "Maximum number of results",
            default: 10,
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getWeather",
      description: "Get weather information for a specific location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location for weather data",
          },
          days: {
            type: "number",
            description: "Number of days forecast",
            default: 1,
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createQuote",
      description: "Create a new quote with services and pricing",
      parameters: {
        type: "object",
        properties: {
          services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
                description: { type: "string" },
              },
              required: ["name", "quantity", "unitPrice"],
            },
            description: "List of services to include",
          },
          customerInfo: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              address: { type: "string" },
            },
            required: ["name"],
            description: "Customer information",
          },
        },
        required: ["services", "customerInfo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyzeRisk",
      description: "Analyze project risks and provide risk assessment",
      parameters: {
        type: "object",
        properties: {
          projectDescription: {
            type: "string",
            description: "Description of the project",
          },
          factors: {
            type: "array",
            items: { type: "string" },
            description: "Specific risk factors to consider",
          },
        },
        required: ["projectDescription"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findSimilarProjects",
      description: "Find similar projects based on type, budget, and features",
      parameters: {
        type: "object",
        properties: {
          projectType: {
            type: "string",
            description: "Type of project",
          },
          budget: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
            },
            description: "Budget range",
          },
          features: {
            type: "array",
            items: { type: "string" },
            description: "Project features to match",
          },
        },
        required: ["projectType"],
      },
    },
  },
];

// Type for tool names
export type ToolName = keyof typeof toolSchemas;

// Type for tool parameters
export type ToolParameters<T extends ToolName> = z.infer<
  (typeof toolSchemas)[T]
>;
