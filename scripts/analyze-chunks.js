const fs = require("fs");
const path = require("path");

// Function to analyze chunk content
function analyzeChunk(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileSize = fs.statSync(filePath).size;

  // Pattern to find library names
  const patterns = {
    // "react-pdf": removed - no longer used
    sentry: /@sentry|sentry/gi,
    openai: /openai/gi,
    exceljs: /exceljs/gi,
    jspdf: /jspdf/gi,
    three: /three|@react-three/gi,
    recharts: /recharts/gi,
    "framer-motion": /framer-motion/gi,
    "radix-ui": /@radix-ui/gi,
    supabase: /@supabase|supabase/gi,
    "react-hook-form": /react-hook-form/gi,
    zod: /\bzod\b/gi,
    "date-fns": /date-fns/gi,
    lucide: /lucide-react/gi,
  };

  const results = {
    fileName: path.basename(filePath),
    fileSize: (fileSize / 1024).toFixed(2) + "KB",
    libraries: {},
  };

  // Count occurrences of each library
  for (const [lib, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    if (matches && matches.length > 10) {
      // Only report significant presence
      results.libraries[lib] = matches.length;
    }
  }

  return results;
}

// Analyze the largest chunks
const chunksDir = ".next/static/chunks";
const targetChunks = [
  "6381.3aaedffceba11db3.js",
  "6edf0643.574f2f14b2ec2534.js",
  "b536a0f1.7f549fadce00417f.js",
  "a4634e51.9e8e397a515e412c.js",
];

console.log("Analyzing large chunks...\n");

targetChunks.forEach((chunk) => {
  const filePath = path.join(chunksDir, chunk);
  if (fs.existsSync(filePath)) {
    const analysis = analyzeChunk(filePath);
    console.log(`Chunk: ${analysis.fileName} (${analysis.fileSize})`);
    console.log("Libraries found:");
    for (const [lib, count] of Object.entries(analysis.libraries)) {
      console.log(`  - ${lib}: ${count} references`);
    }
    console.log("");
  }
});

// Also check what's in the app chunks
console.log("\nAnalyzing route chunks...");
const appChunks = fs
  .readdirSync(path.join(chunksDir, "app"))
  .filter((f) => f.endsWith(".js"));
const largAppChunks = [];

appChunks.forEach((chunk) => {
  const filePath = path.join(chunksDir, "app", chunk);
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;

  if (sizeKB > 100) {
    largAppChunks.push({
      name: chunk,
      size: sizeKB.toFixed(2) + "KB",
    });
  }
});

if (largAppChunks.length > 0) {
  console.log("Large app chunks (>100KB):");
  largAppChunks.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  largAppChunks.forEach((chunk) => {
    console.log(`  - ${chunk.name}: ${chunk.size}`);
  });
}
