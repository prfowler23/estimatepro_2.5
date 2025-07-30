#!/bin/bash

# Emergency fix: Replace server imports with universal client

echo "Applying emergency import fixes..."

# Find all files importing from lib/supabase/server
files=$(grep -r "from \"@/lib/supabase/server\"" lib/services hooks components --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u)

echo "Found ${#files[@]} files to fix"

# Replace imports
for file in $files; do
    echo "Fixing: $file"
    sed -i 's|from "@/lib/supabase/server"|from "@/lib/supabase/universal-client"|g' "$file"
done

echo "Emergency fixes applied!"
echo "NOTE: This is a temporary fix. Proper server/client separation should be implemented after the emergency."