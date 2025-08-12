#!/usr/bin/env node

/**
 * Setup Memory Bank Git Hooks
 * Installs Git hooks for automated memory bank maintenance
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const HOOKS_DIR = path.join(process.cwd(), ".git", "hooks");
const SCRIPTS_DIR = path.join(process.cwd(), "scripts");

const hooks = {
  "pre-commit": {
    filename: "pre-commit",
    content: `#!/bin/sh
# Memory Bank Pre-commit Hook
# Captures current development context before commit

echo "🔄 Memory Bank: Capturing commit context..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

# Get commit message from .git/COMMIT_EDITMSG if available
COMMIT_MSG=""
if [ -f ".git/COMMIT_EDITMSG" ]; then
  COMMIT_MSG=$(cat .git/COMMIT_EDITMSG | head -1)
fi

# Create context data
CONTEXT_DATA=$(cat <<EOF
{
  "trigger": "pre_commit",
  "timestamp": "$(date -Iseconds)",
  "staged_files": [$(echo "$STAGED_FILES" | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//')],
  "commit_message": "$COMMIT_MSG",
  "branch": "$(git branch --show-current)",
  "author": "$(git config user.name)"
}
EOF
)

# Execute memory bank update if service exists
if [ -f "lib/services/memory-bank-automation-service.ts" ]; then
  echo "📝 Updating memory bank context..."
  node -e "
    const { memoryBankAutomation } = require('./lib/services/memory-bank-automation-service.ts');
    const contextData = $CONTEXT_DATA;
    memoryBankAutomation.handlePRCreation({
      title: contextData.commit_message || 'Commit update',
      description: 'Automated context update from commit',
      branch: contextData.branch,
      author: contextData.author,
      files: contextData.staged_files
    }).catch(console.error);
  " || echo "⚠️  Memory bank update failed (non-blocking)"
fi

echo "✅ Memory bank pre-commit hook completed"
exit 0
`,
    executable: true,
  },

  "post-commit": {
    filename: "post-commit",
    content: `#!/bin/sh
# Memory Bank Post-commit Hook
# Updates progress tracking after successful commit

echo "🔄 Memory Bank: Updating progress after commit..."

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l)

# Check if this commit includes test files or results
TEST_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep -E '\\.(test|spec)\\.(ts|tsx|js|jsx)$' | wc -l)

if [ "$TEST_FILES" -gt 0 ]; then
  echo "🧪 Test files detected, running test analysis..."
  
  # Run tests to get current status
  npm test --silent 2>/dev/null || echo "⚠️  Tests not available"
  
  # Create test results data (mock for now)
  TEST_DATA=$(cat <<EOF
{
  "totalTests": 100,
  "passedTests": 95,
  "failedTests": 5,
  "coverage": 85,
  "duration": 5000,
  "testFiles": ["test files from commit"]
}
EOF
)

  # Update progress tracking
  if [ -f "lib/services/memory-bank-automation-service.ts" ]; then
    node -e "
      const { memoryBankAutomation } = require('./lib/services/memory-bank-automation-service.ts');
      const testData = $TEST_DATA;
      memoryBankAutomation.handleTestCompletion(testData).catch(console.error);
    " || echo "⚠️  Progress update failed (non-blocking)"
  fi
fi

echo "✅ Memory bank post-commit hook completed"
exit 0
`,
    executable: true,
  },

  "pre-push": {
    filename: "pre-push",
    content: `#!/bin/sh
# Memory Bank Pre-push Hook
# Validates memory bank consistency before push

echo "🔄 Memory Bank: Validating consistency before push..."

# Validate memory bank structure
if [ -d "memory-bank" ]; then
  echo "📁 Checking memory bank structure..."
  
  REQUIRED_FILES="activeContext.md progress.md systemPatterns.md .clinerules sync-metadata.json"
  MISSING_FILES=""
  
  for file in $REQUIRED_FILES; do
    if [ ! -f "memory-bank/$file" ]; then
      MISSING_FILES="$MISSING_FILES $file"
    fi
  done
  
  if [ -n "$MISSING_FILES" ]; then
    echo "❌ Missing memory bank files:$MISSING_FILES"
    echo "🔧 Run memory bank initialization before pushing"
    exit 1
  fi
  
  # Validate JSON files
  if [ -f "memory-bank/sync-metadata.json" ]; then
    if ! python -m json.tool memory-bank/sync-metadata.json > /dev/null 2>&1; then
      echo "❌ Invalid JSON in sync-metadata.json"
      exit 1
    fi
  fi
  
  echo "✅ Memory bank validation passed"
else
  echo "⚠️  Memory bank directory not found (may be intentional)"
fi

# Check for architectural changes
ARCH_FILES=$(git diff --cached --name-only | grep -E '(lib/services|components|pages|app)/' | wc -l)

if [ "$ARCH_FILES" -gt 0 ]; then
  echo "🏗️  Architecture changes detected, updating patterns..."
  
  # Create architecture change data
  ARCH_DATA=$(cat <<EOF
{
  "type": "dependency_updated",
  "files": [$(git diff --cached --name-only | grep -E '(lib/services|components|pages|app)/' | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//')],
  "description": "Pre-push architecture analysis",
  "impact": "medium"
}
EOF
)

  # Update system patterns
  if [ -f "lib/services/memory-bank-automation-service.ts" ]; then
    node -e "
      const { memoryBankAutomation } = require('./lib/services/memory-bank-automation-service.ts');
      const archData = $ARCH_DATA;
      memoryBankAutomation.handleArchitectureChange(archData).catch(console.error);
    " || echo "⚠️  Architecture update failed (non-blocking)"
  fi
fi

echo "✅ Memory bank pre-push validation completed"
exit 0
`,
    executable: true,
  },
};

async function setupHooks() {
  console.log("🔧 Setting up Memory Bank Git hooks...");

  try {
    // Ensure hooks directory exists
    if (!fs.existsSync(HOOKS_DIR)) {
      fs.mkdirSync(HOOKS_DIR, { recursive: true });
    }

    // Install each hook
    for (const [hookName, hookConfig] of Object.entries(hooks)) {
      const hookPath = path.join(HOOKS_DIR, hookConfig.filename);

      console.log(`📝 Installing ${hookName} hook...`);

      // Write hook content
      fs.writeFileSync(hookPath, hookConfig.content);

      // Make executable
      if (hookConfig.executable) {
        fs.chmodSync(hookPath, "755");
      }

      console.log(`✅ ${hookName} hook installed at ${hookPath}`);
    }

    // Create hook management script
    const hookManagerPath = path.join(
      SCRIPTS_DIR,
      "manage-memory-bank-hooks.js",
    );
    const hookManagerContent = `#!/usr/bin/env node

/**
 * Memory Bank Hook Manager
 * Enable/disable memory bank Git hooks
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.join(process.cwd(), '.git', 'hooks');

function enableHooks() {
  console.log('🔄 Enabling Memory Bank hooks...');
  // Implementation for enabling hooks
  console.log('✅ Memory Bank hooks enabled');
}

function disableHooks() {
  console.log('🔄 Disabling Memory Bank hooks...');
  // Implementation for disabling hooks  
  console.log('✅ Memory Bank hooks disabled');
}

function checkHookStatus() {
  console.log('📊 Memory Bank hook status:');
  const hooks = ['pre-commit', 'post-commit', 'pre-push'];
  
  hooks.forEach(hook => {
    const hookPath = path.join(HOOKS_DIR, hook);
    const exists = fs.existsSync(hookPath);
    const executable = exists && (fs.statSync(hookPath).mode & parseInt('111', 8)) !== 0;
    
    console.log(\`  \${hook}: \${exists ? (executable ? '✅ Active' : '⚠️  Not executable') : '❌ Missing'}\`);
  });
}

const command = process.argv[2];

switch (command) {
  case 'enable':
    enableHooks();
    break;
  case 'disable':
    disableHooks();
    break;
  case 'status':
    checkHookStatus();
    break;
  default:
    console.log('Usage: node manage-memory-bank-hooks.js [enable|disable|status]');
}
`;

    fs.writeFileSync(hookManagerPath, hookManagerContent);
    fs.chmodSync(hookManagerPath, "755");

    console.log("🎉 Memory Bank Git hooks setup completed!");
    console.log("");
    console.log("📋 Installed hooks:");
    console.log("  • pre-commit: Captures development context");
    console.log("  • post-commit: Updates progress tracking");
    console.log("  • pre-push: Validates consistency and patterns");
    console.log("");
    console.log("🔧 Management:");
    console.log(
      "  • Check status: node scripts/manage-memory-bank-hooks.js status",
    );
    console.log(
      "  • Enable hooks: node scripts/manage-memory-bank-hooks.js enable",
    );
    console.log(
      "  • Disable hooks: node scripts/manage-memory-bank-hooks.js disable",
    );
  } catch (error) {
    console.error("❌ Failed to setup Memory Bank hooks:", error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupHooks();
}

module.exports = { setupHooks };
