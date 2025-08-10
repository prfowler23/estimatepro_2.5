/**
 * Library Import Optimization Utilities
 *
 * Helps identify and optimize third-party library imports for better tree shaking
 * and reduced bundle size. Works with Next.js modularizeImports configuration.
 */

export interface LibraryImportAnalysis {
  library: string;
  currentImports: string[];
  optimizedImports: string[];
  estimatedSaving: string;
  isOptimized: boolean;
}

export interface ImportPattern {
  pattern: RegExp;
  library: string;
  transform: (members: string[]) => string;
  estimatedSavingKB: number;
}

// Define optimization patterns for common heavy libraries
export const OPTIMIZATION_PATTERNS: ImportPattern[] = [
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g,
    library: "lucide-react",
    transform: (members) =>
      members
        .map(
          (m) =>
            `import { ${m.trim()} } from "lucide-react/icons/${m.trim().toLowerCase()}"`,
        )
        .join(";\n"),
    estimatedSavingKB: 150,
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]date-fns['"]/g,
    library: "date-fns",
    transform: (members) =>
      members
        .map((m) => `import { ${m.trim()} } from "date-fns/${m.trim()}"`)
        .join(";\n"),
    estimatedSavingKB: 65,
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lodash['"]/g,
    library: "lodash",
    transform: (members) =>
      members
        .map((m) => `import { ${m.trim()} } from "lodash/${m.trim()}"`)
        .join(";\n"),
    estimatedSavingKB: 70,
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]framer-motion['"]/g,
    library: "framer-motion",
    transform: (members) => {
      // Framer Motion has different export patterns
      const coreExports = [
        "motion",
        "AnimatePresence",
        "useAnimation",
        "useMotionValue",
      ];
      const optimized = members.map((m) => {
        const member = m.trim();
        if (coreExports.includes(member)) {
          return `import { ${member} } from "framer-motion"`;
        }
        return `import { ${member} } from "framer-motion/${member.toLowerCase()}"`;
      });
      return optimized.join(";\n");
    },
    estimatedSavingKB: 45,
  },
];

/**
 * Analyzes a file's imports and suggests optimizations
 */
export function analyzeFileImports(
  content: string,
  filePath: string,
): LibraryImportAnalysis[] {
  const results: LibraryImportAnalysis[] = [];

  for (const pattern of OPTIMIZATION_PATTERNS) {
    const matches = content.matchAll(pattern.pattern);
    const allMatches = Array.from(matches);

    if (allMatches.length === 0) continue;

    const currentImports: string[] = [];
    const allMembers: string[] = [];

    for (const match of allMatches) {
      currentImports.push(match[0]);
      const members = match[1].split(",").map((m) => m.trim());
      allMembers.push(...members);
    }

    if (currentImports.length > 0) {
      const optimizedImports = [pattern.transform(allMembers)];

      results.push({
        library: pattern.library,
        currentImports,
        optimizedImports,
        estimatedSaving: `~${Math.round(pattern.estimatedSavingKB * 0.8)}KB`,
        isOptimized: false, // Assume not optimized if we found the pattern
      });
    }
  }

  return results;
}

/**
 * Scans entire codebase for import optimizations
 */
export async function scanCodebaseForOptimizations(): Promise<{
  totalFiles: number;
  filesWithOptimizations: number;
  totalEstimatedSaving: number;
  optimizations: Map<string, LibraryImportAnalysis[]>;
}> {
  const fs = await import("fs");
  const path = await import("path");
  const { glob } = await import("glob");

  const optimizations = new Map<string, LibraryImportAnalysis[]>();
  let totalEstimatedSaving = 0;

  // Find all TS/TSX files
  const files = await glob("**/*.{ts,tsx}", {
    cwd: process.cwd(),
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
  });

  let filesWithOptimizations = 0;

  for (const file of files) {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, "utf-8");
      const analysis = analyzeFileImports(content, file);

      if (analysis.length > 0) {
        optimizations.set(file, analysis);
        filesWithOptimizations++;

        // Calculate estimated savings
        for (const opt of analysis) {
          const savingMatch = opt.estimatedSaving.match(/(\d+)KB/);
          if (savingMatch) {
            totalEstimatedSaving += parseInt(savingMatch[1]);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not analyze ${file}:`, error);
    }
  }

  return {
    totalFiles: files.length,
    filesWithOptimizations,
    totalEstimatedSaving,
    optimizations,
  };
}

/**
 * Library size reference for bundle analysis
 */
export const LIBRARY_SIZES = {
  "lucide-react": { full: 180, treeshaken: 2 },
  "date-fns": { full: 78, treeshaken: 3 },
  lodash: { full: 85, treeshaken: 2 },
  "framer-motion": { full: 52, treeshaken: 15 },
  "react-hook-form": { full: 42, treeshaken: 8 },
  "@radix-ui/react-slot": { full: 15, treeshaken: 2 },
  three: { full: 580, treeshaken: 120 },
  "@react-three/fiber": { full: 95, treeshaken: 25 },
  "@react-three/drei": { full: 150, treeshaken: 30 },
} as const;

/**
 * Webpack bundle optimization recommendations
 */
export interface BundleOptimizationTip {
  category: "import" | "dynamic" | "external" | "splitting";
  library: string;
  description: string;
  implementation: string;
  estimatedSaving: string;
  priority: "high" | "medium" | "low";
}

export function getBundleOptimizationTips(): BundleOptimizationTip[] {
  return [
    {
      category: "import",
      library: "lucide-react",
      description: "Use individual icon imports instead of named imports",
      implementation: "Already configured in next.config.mjs modularizeImports",
      estimatedSaving: "~150KB",
      priority: "high",
    },
    {
      category: "dynamic",
      library: "three",
      description: "Load 3D visualization components dynamically",
      implementation: "Use React.lazy() for 3D demo and visualization pages",
      estimatedSaving: "~460KB",
      priority: "high",
    },
    {
      category: "external",
      library: "chart.js",
      description: "Consider making chart libraries external dependencies",
      implementation: "Add to next.config.mjs externals for CDN loading",
      estimatedSaving: "~120KB",
      priority: "medium",
    },
    {
      category: "splitting",
      library: "framer-motion",
      description: "Split animation components into separate chunks",
      implementation: "Use dynamic imports for pages with heavy animations",
      estimatedSaving: "~37KB",
      priority: "medium",
    },
    {
      category: "import",
      library: "date-fns",
      description: "Import only needed date functions",
      implementation: "Already configured in next.config.mjs modularizeImports",
      estimatedSaving: "~65KB",
      priority: "medium",
    },
  ];
}

/**
 * Performance impact calculator
 */
export function calculatePerformanceImpact(
  optimizations: Map<string, LibraryImportAnalysis[]>,
) {
  let totalSavings = 0;
  let highPriorityFiles = 0;
  const libraryUsage = new Map<string, number>();

  for (const [filePath, analyses] of optimizations) {
    let fileHasHighPriority = false;

    for (const analysis of analyses) {
      const savingMatch = analysis.estimatedSaving.match(/(\d+)KB/);
      if (savingMatch) {
        const saving = parseInt(savingMatch[1]);
        totalSavings += saving;

        if (saving > 50) {
          fileHasHighPriority = true;
        }

        libraryUsage.set(
          analysis.library,
          (libraryUsage.get(analysis.library) || 0) + 1,
        );
      }
    }

    if (fileHasHighPriority) {
      highPriorityFiles++;
    }
  }

  return {
    totalSavings,
    highPriorityFiles,
    libraryUsage,
    performanceScore: Math.min(100, Math.max(0, 100 - totalSavings / 10)),
  };
}
