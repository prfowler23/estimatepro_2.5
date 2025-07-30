#!/bin/bash

echo "Fixing syntax errors in service files..."

# List of files with the syntax error pattern
FILES=(
  "lib/analytics/new-feature-analytics.ts"
  "lib/services/ai-service.ts"
  "lib/services/analytics-service.ts"
  "lib/services/facade-analysis-service.ts"
  "lib/services/pilot-service.ts"
  "lib/services/risk-assessment-service.ts"
  "lib/services/vendor-service.ts"
  "lib/services/workflow-service.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    
    # Remove the incorrectly placed 'const supabase = createClient();' from parameter lists
    # This regex matches the pattern where it appears inside function parameters
    sed -i '/async.*{$/,/^[[:space:]]*const supabase = createClient();$/{
      /^[[:space:]]*const supabase = createClient();$/d
    }' "$file"
    
    # For methods that were affected, we need to add the createClient call 
    # at the beginning of the function body, not in the parameters
    # This is more complex and needs manual fixing
    
    echo "Removed incorrect createClient from $file parameters"
  fi
done

echo "Syntax fixes applied. You may need to manually add 'const supabase = createClient();' inside function bodies where needed."