#!/usr/bin/env node

/**
 * Service Contract Documentation Generator
 * Extracts and documents service interfaces, contracts, and API specifications
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class ServiceContractGenerator {
  constructor() {
    this.services = new Map();
    this.contracts = new Map();
    this.apiEndpoints = new Map();
  }

  async generateContracts(rootDir) {
    console.log("📋 Starting Service Contract Documentation Generation...\n");

    // Phase 1: Extract service interfaces
    await this.extractServiceInterfaces(path.join(rootDir, "lib/services"));

    // Phase 2: Extract API contracts
    await this.extractAPIContracts(path.join(rootDir, "app/api"));

    // Phase 3: Generate documentation
    this.generateDocumentation();
  }

  async extractServiceInterfaces(servicesDir) {
    console.log("🔍 Extracting service interfaces...");

    const files = await this.getTypeScriptFiles(servicesDir);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const contract = this.extractServiceContract(file, content);

        if (contract) {
          this.contracts.set(contract.name, contract);
          console.log(`  ✓ Documented: ${contract.name}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Error processing ${file}: ${error.message}`);
      }
    }

    console.log(
      `\n📊 Total service contracts documented: ${this.contracts.size}\n`,
    );
  }

  async extractAPIContracts(apiDir) {
    console.log("🌐 Extracting API contracts...");

    const files = await this.getAPIRouteFiles(apiDir);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const apiContract = this.extractAPIContract(file, content);

        if (apiContract) {
          this.apiEndpoints.set(apiContract.path, apiContract);
          console.log(`  ✓ API: ${apiContract.method} ${apiContract.path}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Error processing API ${file}: ${error.message}`);
      }
    }

    console.log(
      `\n📊 Total API endpoints documented: ${this.apiEndpoints.size}\n`,
    );
  }

  async getTypeScriptFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  async getAPIRouteFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item === "route.ts") {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  extractServiceContract(filePath, content) {
    const fileName = path.basename(filePath, ".ts");

    // Skip non-service files
    if (!fileName.includes("service") && !fileName.includes("Service")) {
      return null;
    }

    const interfaces = this.extractInterfaces(content);
    const classes = this.extractClassMethods(content);
    const publicMethods = this.extractPublicMethods(content);
    const dependencies = this.extractDependencies(content);
    const errorTypes = this.extractErrorTypes(content);

    return {
      name: fileName,
      filePath,
      description: this.extractDescription(content),
      interfaces,
      classes,
      publicMethods,
      dependencies,
      errorTypes,
      inputTypes: this.extractInputTypes(content),
      outputTypes: this.extractOutputTypes(content),
      configuration: this.extractConfiguration(content),
      examples: this.extractExamples(content),
    };
  }

  extractAPIContract(filePath, content) {
    const pathParts = filePath.split("/");
    const apiPath =
      "/" +
      pathParts
        .slice(pathParts.indexOf("api") + 1)
        .filter((part) => part !== "route.ts")
        .map((part) =>
          part.startsWith("[") && part.endsWith("]")
            ? `:${part.slice(1, -1)}`
            : part,
        )
        .join("/");

    const methods = this.extractHTTPMethods(content);
    const schemas = this.extractValidationSchemas(content);
    const responses = this.extractResponseTypes(content);

    if (methods.length === 0) return null;

    return {
      path: apiPath,
      filePath,
      methods,
      schemas,
      responses,
      middleware: this.extractMiddleware(content),
      rateLimit: this.extractRateLimit(content),
      authentication: this.extractAuthRequirements(content),
      description: this.extractAPIDescription(content),
    };
  }

  extractInterfaces(content) {
    const interfaceRegex =
      /interface\s+(\w+)(?:\s+extends\s+([\w,\s<>]+))?\s*\{([^}]+)\}/g;
    const interfaces = [];
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const extends_ = match[2];
      const body = match[3];

      const properties = this.extractInterfaceProperties(body);

      interfaces.push({
        name,
        extends: extends_
          ? extends_
              .trim()
              .split(",")
              .map((s) => s.trim())
          : [],
        properties,
        isPublic: this.isExported(content, name),
      });
    }

    return interfaces;
  }

  extractInterfaceProperties(body) {
    const properties = [];
    const lines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      if (line.includes(":") && !line.startsWith("//")) {
        const [namePart, typePart] = line.split(":");
        const name = namePart.trim();
        const type = typePart.replace(";", "").trim();
        const optional = name.includes("?");

        properties.push({
          name: name.replace("?", ""),
          type,
          optional,
          description: this.extractPropertyDescription(line),
        });
      }
    }

    return properties;
  }

  extractClassMethods(content) {
    const classRegex =
      /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([\s\S]*?)\n\s*\}/g;
    const classes = [];
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const extends_ = match[2];
      const classBody = match[3];

      const methods = this.extractMethodsFromClass(classBody);
      const properties = this.extractClassProperties(classBody);

      classes.push({
        name: className,
        extends: extends_ || null,
        methods,
        properties,
        isService: className.includes("Service"),
        isPublic: this.isExported(content, className),
      });
    }

    return classes;
  }

  extractMethodsFromClass(classBody) {
    const methodRegex =
      /(public|private|protected)?\s*(async\s+)?(static\s+)?(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/g;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
      const visibility = match[1] || "public";
      const isAsync = !!match[2];
      const isStatic = !!match[3];
      const name = match[4];
      const returnType = match[5].trim();

      // Extract parameters
      const paramMatch = classBody.match(
        new RegExp(`${name}\\s*\\(([^)]*)\\)`),
      );
      const parameters = paramMatch
        ? this.extractParameters(paramMatch[1])
        : [];

      methods.push({
        name,
        visibility,
        isAsync,
        isStatic,
        returnType,
        parameters,
        description: this.extractMethodDescription(classBody, name),
      });
    }

    return methods;
  }

  extractParameters(paramString) {
    if (!paramString.trim()) return [];

    const params = paramString
      .split(",")
      .map((param) => {
        const parts = param.trim().split(":");
        if (parts.length !== 2) return null;

        const name = parts[0].trim();
        const type = parts[1].trim();
        const optional = name.includes("?");

        return {
          name: name.replace("?", ""),
          type,
          optional,
        };
      })
      .filter((p) => p !== null);

    return params;
  }

  extractPublicMethods(content) {
    const exportRegex =
      /export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/g;
    const methods = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      const isAsync = !!match[1];
      const name = match[2];
      const returnType = match[3].trim();

      methods.push({
        name,
        isAsync,
        returnType,
        type: "function",
        isExported: true,
      });
    }

    return methods;
  }

  extractDependencies(content) {
    const importRegex = /import.*from\s+["']([^"']+)["']/g;
    const dependencies = {
      internal: [],
      external: [],
      services: [],
    };
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      if (importPath.includes("@/lib/services")) {
        dependencies.services.push(path.basename(importPath));
      } else if (importPath.startsWith("@/")) {
        dependencies.internal.push(importPath);
      } else if (!importPath.startsWith(".")) {
        dependencies.external.push(importPath);
      }
    }

    return dependencies;
  }

  extractErrorTypes(content) {
    const errorRegex = /(throw\s+new\s+(\w+Error))|(\w+Error)/g;
    const errors = new Set();
    let match;

    while ((match = errorRegex.exec(content)) !== null) {
      if (match[2]) errors.add(match[2]);
      if (match[3] && match[3].endsWith("Error")) errors.add(match[3]);
    }

    return Array.from(errors);
  }

  extractInputTypes(content) {
    const typeRegex = /interface\s+(\w+)(?:Params|Input|Request)\s*\{/g;
    const types = [];
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      types.push(
        match[1] +
          (match[0].includes("Params")
            ? "Params"
            : match[0].includes("Input")
              ? "Input"
              : "Request"),
      );
    }

    return types;
  }

  extractOutputTypes(content) {
    const typeRegex = /interface\s+(\w+)(?:Result|Output|Response)\s*\{/g;
    const types = [];
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      types.push(
        match[1] +
          (match[0].includes("Result")
            ? "Result"
            : match[0].includes("Output")
              ? "Output"
              : "Response"),
      );
    }

    return types;
  }

  extractConfiguration(content) {
    const configRegex =
      /interface\s+(\w+)(?:Config|Configuration|Settings)\s*\{([^}]+)\}/g;
    const configs = [];
    let match;

    while ((match = configRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const properties = this.extractInterfaceProperties(body);

      configs.push({
        name:
          name +
          (match[0].includes("Config")
            ? "Config"
            : match[0].includes("Configuration")
              ? "Configuration"
              : "Settings"),
        properties,
      });
    }

    return configs;
  }

  extractHTTPMethods(content) {
    const methods = [];

    if (content.includes("export async function GET")) {
      methods.push("GET");
    }
    if (content.includes("export async function POST")) {
      methods.push("POST");
    }
    if (content.includes("export async function PUT")) {
      methods.push("PUT");
    }
    if (content.includes("export async function DELETE")) {
      methods.push("DELETE");
    }
    if (content.includes("export async function PATCH")) {
      methods.push("PATCH");
    }

    return methods;
  }

  extractValidationSchemas(content) {
    const zodRegex = /z\.object\(\{([^}]+)\}\)/g;
    const schemas = [];
    let match;

    while ((match = zodRegex.exec(content)) !== null) {
      const schemaBody = match[1];
      const fields = this.extractZodFields(schemaBody);
      schemas.push({ fields });
    }

    return schemas;
  }

  extractZodFields(schemaBody) {
    const fields = [];
    const lines = schemaBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      if (line.includes(":") && !line.startsWith("//")) {
        const [name, validation] = line.split(":");
        fields.push({
          name: name.trim(),
          validation: validation.replace(",", "").trim(),
          required: !validation.includes("optional()"),
        });
      }
    }

    return fields;
  }

  extractResponseTypes(content) {
    const responseRegex = /Response\.json\(\{([^}]+)\}\)/g;
    const responses = [];
    let match;

    while ((match = responseRegex.exec(content)) !== null) {
      responses.push({
        type: "json",
        structure: match[1],
      });
    }

    return responses;
  }

  extractMiddleware(content) {
    const middleware = [];

    if (content.includes("validateRequestBody")) {
      middleware.push("validation");
    }
    if (content.includes("rateLimit")) {
      middleware.push("rate-limiting");
    }
    if (content.includes("auth")) {
      middleware.push("authentication");
    }

    return middleware;
  }

  extractRateLimit(content) {
    const rateLimitMatch = content.match(/rateLimit.*?(\d+).*?(\d+)/);
    if (rateLimitMatch) {
      return {
        requests: parseInt(rateLimitMatch[1]),
        window: parseInt(rateLimitMatch[2]),
      };
    }
    return null;
  }

  extractAuthRequirements(content) {
    if (content.includes("createClient") || content.includes("supabase")) {
      return {
        required: true,
        type: "supabase-auth",
      };
    }
    return { required: false };
  }

  extractDescription(content) {
    const lines = content.split("\n");
    const comments = [];

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("*")) {
        comments.push(line.replace(/^(\/\/|\*)\s*/, ""));
      }
    }

    return comments.join(" ").trim();
  }

  extractAPIDescription(content) {
    return this.extractDescription(content);
  }

  extractPropertyDescription(line) {
    const commentMatch = line.match(/\/\/\s*(.+)$/);
    return commentMatch ? commentMatch[1].trim() : "";
  }

  extractMethodDescription(classBody, methodName) {
    const lines = classBody.split("\n");
    const methodIndex = lines.findIndex((line) =>
      line.includes(`${methodName}(`),
    );

    if (methodIndex > 0) {
      const prevLine = lines[methodIndex - 1].trim();
      if (prevLine.startsWith("//")) {
        return prevLine.replace(/^\/\/\s*/, "");
      }
    }

    return "";
  }

  extractClassProperties(classBody) {
    const propRegex =
      /(private|public|protected)\s+(readonly\s+)?(\w+)\s*:\s*([^;]+)/g;
    const properties = [];
    let match;

    while ((match = propRegex.exec(classBody)) !== null) {
      properties.push({
        name: match[3],
        type: match[4].trim(),
        visibility: match[1],
        readonly: !!match[2],
      });
    }

    return properties;
  }

  extractExamples(content) {
    // Extract code examples from comments or dedicated example blocks
    const examples = [];
    const exampleRegex = /\/\*\*[\s\S]*?@example([\s\S]*?)\*\//g;
    let match;

    while ((match = exampleRegex.exec(content)) !== null) {
      examples.push(match[1].trim());
    }

    return examples;
  }

  isExported(content, name) {
    return (
      content.includes(`export class ${name}`) ||
      content.includes(`export interface ${name}`) ||
      content.includes(`export const ${name}`) ||
      content.includes(`export function ${name}`)
    );
  }

  generateDocumentation() {
    console.log("📄 Generating service contract documentation...\n");

    // Generate service contracts documentation
    this.generateServiceContractsDoc();

    // Generate API reference documentation
    this.generateAPIReferenceDoc();

    // Generate unified contract overview
    this.generateContractOverviewDoc();

    console.log("🎉 Service contract documentation generated successfully!");
  }

  generateServiceContractsDoc() {
    const docContent = `# Service Contracts Documentation

Generated: ${new Date().toLocaleString()}

## Overview

This document provides comprehensive documentation for all service contracts in EstimatePro, including interfaces, methods, dependencies, and usage examples.

**Total Services**: ${this.contracts.size}

---

${Array.from(this.contracts.values())
  .map((contract) => this.generateServiceDoc(contract))
  .join("\n---\n\n")}

---
*Generated by EstimatePro Service Contract Generator*
`;

    fs.writeFileSync("service-contracts.md", docContent);
    console.log(
      "📋 Service contracts documentation saved to: service-contracts.md",
    );
  }

  generateServiceDoc(contract) {
    return `## ${contract.name}

**File**: \`${contract.filePath}\`  
**Description**: ${contract.description || "No description available"}

### Interfaces

${
  contract.interfaces.length > 0
    ? contract.interfaces
        .map(
          (iface) => `
#### \`${iface.name}\`${iface.extends.length > 0 ? ` extends ${iface.extends.join(", ")}` : ""}

${iface.properties
  .map(
    (prop) =>
      `- \`${prop.name}${prop.optional ? "?" : ""}: ${prop.type}\`${prop.description ? ` - ${prop.description}` : ""}`,
  )
  .join("\n")}
`,
        )
        .join("\n")
    : "No public interfaces defined."
}

### Public Methods

${
  contract.publicMethods.length > 0
    ? contract.publicMethods
        .map(
          (method) =>
            `- \`${method.isAsync ? "async " : ""}${method.name}(): ${method.returnType}\``,
        )
        .join("\n")
    : "No public methods defined."
}

### Classes

${
  contract.classes.length > 0
    ? contract.classes
        .map(
          (cls) => `
#### \`${cls.name}\`${cls.extends ? ` extends ${cls.extends}` : ""}

**Public Methods**:
${cls.methods
  .filter((m) => m.visibility === "public")
  .map(
    (m) =>
      `- \`${m.isAsync ? "async " : ""}${m.isStatic ? "static " : ""}${m.name}(${m.parameters.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`).join(", ")}): ${m.returnType}\`${m.description ? ` - ${m.description}` : ""}`,
  )
  .join("\n")}
`,
        )
        .join("\n")
    : "No classes defined."
}

### Dependencies

**Internal Services**: ${contract.dependencies.services.length > 0 ? contract.dependencies.services.join(", ") : "None"}  
**External Libraries**: ${contract.dependencies.external.length > 0 ? contract.dependencies.external.join(", ") : "None"}

### Input/Output Types

**Input Types**: ${contract.inputTypes.length > 0 ? contract.inputTypes.join(", ") : "None"}  
**Output Types**: ${contract.outputTypes.length > 0 ? contract.outputTypes.join(", ") : "None"}

### Error Types

${contract.errorTypes.length > 0 ? contract.errorTypes.map((error) => `- \`${error}\``).join("\n") : "No custom errors defined."}

### Configuration

${
  contract.configuration.length > 0
    ? contract.configuration
        .map(
          (config) => `
#### \`${config.name}\`

${config.properties
  .map(
    (prop) =>
      `- \`${prop.name}${prop.optional ? "?" : ""}: ${prop.type}\`${prop.description ? ` - ${prop.description}` : ""}`,
  )
  .join("\n")}
`,
        )
        .join("\n")
    : "No configuration interfaces defined."
}

${
  contract.examples.length > 0
    ? `
### Examples

${contract.examples.map((example) => `\`\`\`typescript\n${example}\n\`\`\``).join("\n\n")}
`
    : ""
}`;
  }

  generateAPIReferenceDoc() {
    const apiDoc = `# API Reference Documentation

Generated: ${new Date().toLocaleString()}

## Overview

This document provides comprehensive API reference for all HTTP endpoints in EstimatePro.

**Total Endpoints**: ${this.apiEndpoints.size}

---

${Array.from(this.apiEndpoints.values())
  .map((endpoint) => this.generateAPIDoc(endpoint))
  .join("\n---\n\n")}

---
*Generated by EstimatePro Service Contract Generator*
`;

    fs.writeFileSync("api-reference.md", apiDoc);
    console.log("🌐 API reference documentation saved to: api-reference.md");
  }

  generateAPIDoc(endpoint) {
    return `## ${endpoint.methods.join(", ")} ${endpoint.path}

**File**: \`${endpoint.filePath}\`  
**Description**: ${endpoint.description || "No description available"}

### Methods

${endpoint.methods.map((method) => `- **${method}**`).join("\n")}

### Authentication

${
  endpoint.authentication.required
    ? `✅ **Required** (${endpoint.authentication.type})`
    : "❌ **Not Required**"
}

### Rate Limiting

${
  endpoint.rateLimit
    ? `⚡ **${endpoint.rateLimit.requests} requests per ${endpoint.rateLimit.window}ms**`
    : "♾️ **No rate limiting**"
}

### Middleware

${
  endpoint.middleware.length > 0
    ? endpoint.middleware.map((middleware) => `- ${middleware}`).join("\n")
    : "No middleware applied"
}

### Request Schema

${
  endpoint.schemas.length > 0
    ? endpoint.schemas
        .map(
          (schema) => `
\`\`\`typescript
{
${schema.fields.map((field) => `  ${field.name}: ${field.validation} // ${field.required ? "Required" : "Optional"}`).join("\n")}
}
\`\`\`
`,
        )
        .join("\n")
    : "No request validation schema defined"
}

### Response Format

${
  endpoint.responses.length > 0
    ? endpoint.responses
        .map(
          (response) => `
**${response.type.toUpperCase()}**:
\`\`\`json
${response.structure}
\`\`\`
`,
        )
        .join("\n")
    : "No response format documented"
}`;
  }

  generateContractOverviewDoc() {
    const servicesByType = new Map();
    for (const contract of this.contracts.values()) {
      const type = this.getServiceType(contract.name);
      if (!servicesByType.has(type)) {
        servicesByType.set(type, []);
      }
      servicesByType.get(type).push(contract);
    }

    const overviewDoc = `# Service Architecture Overview

Generated: ${new Date().toLocaleString()}

## Service Distribution

${Array.from(servicesByType.entries())
  .map(
    ([type, services]) =>
      `- **${type}**: ${services.length} services (${services.map((s) => s.name).join(", ")})`,
  )
  .join("\n")}

## Service Dependency Graph

${Array.from(this.contracts.values())
  .map((contract) =>
    contract.dependencies.services.length > 0
      ? `- **${contract.name}** → [${contract.dependencies.services.join(", ")}]`
      : `- **${contract.name}** → No service dependencies`,
  )
  .join("\n")}

## External Dependencies

${this.getUniqueExternalDeps()
  .map((dep) => `- ${dep}`)
  .join("\n")}

## API Coverage

**Total Endpoints**: ${this.apiEndpoints.size}  
**Authenticated Endpoints**: ${Array.from(this.apiEndpoints.values()).filter((ep) => ep.authentication.required).length}  
**Rate Limited Endpoints**: ${Array.from(this.apiEndpoints.values()).filter((ep) => ep.rateLimit).length}

### Endpoints by Category

${this.categorizeEndpoints()
  .map(
    ([category, endpoints]) =>
      `- **${category}**: ${endpoints.length} endpoints`,
  )
  .join("\n")}

---
*Generated by EstimatePro Service Contract Generator*
`;

    fs.writeFileSync("service-architecture-overview.md", overviewDoc);
    console.log(
      "📊 Architecture overview saved to: service-architecture-overview.md",
    );
  }

  getServiceType(serviceName) {
    if (serviceName.includes("ai")) return "AI Services";
    if (serviceName.includes("analytics")) return "Analytics Services";
    if (serviceName.includes("estimate")) return "Business Logic Services";
    if (
      serviceName.includes("real-time") ||
      serviceName.includes("session") ||
      serviceName.includes("auto-save")
    )
      return "Real-Time Services";
    if (
      serviceName.includes("performance") ||
      serviceName.includes("monitoring")
    )
      return "Infrastructure Services";
    return "Domain Services";
  }

  getUniqueExternalDeps() {
    const allDeps = new Set();
    for (const contract of this.contracts.values()) {
      contract.dependencies.external.forEach((dep) => allDeps.add(dep));
    }
    return Array.from(allDeps).sort();
  }

  categorizeEndpoints() {
    const categories = new Map();

    for (const endpoint of this.apiEndpoints.values()) {
      const category = endpoint.path.split("/")[1] || "root";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(endpoint);
    }

    return Array.from(categories.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }
}

// Run the contract generator
if (require.main === module) {
  const generator = new ServiceContractGenerator();
  generator.generateContracts(process.cwd()).catch((error) => {
    console.error("❌ Contract generation failed:", error.message);
    process.exit(1);
  });
}

module.exports = ServiceContractGenerator;
