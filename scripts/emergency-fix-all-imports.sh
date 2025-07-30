#!/bin/bash

echo "Emergency fix for all client/server imports..."

# Fix all service files
find lib/services -name "*.ts" -exec sed -i 's/import { supabase } from "@\/lib\/supabase\/client";/import { createClient } from "@\/lib\/supabase\/server";/g' {} \;
find lib/services -name "*.ts" -exec sed -i 's/import { createClient } from "@\/lib\/supabase\/client";/import { createClient } from "@\/lib\/supabase\/server";/g' {} \;

# Fix analytics services
find lib/analytics -name "*.ts" -exec sed -i 's/import { createClient } from "@\/lib\/supabase\/client";/import { createClient } from "@\/lib\/supabase\/server";/g' {} \;

# Fix AI services
find lib/ai -name "*.ts" -exec sed -i 's/import { createClient } from "@\/lib\/supabase\/client";/import { createClient } from "@\/lib\/supabase\/server";/g' {} \;

# Fix withTransaction references
find lib/services -name "*.ts" -exec sed -i 's/withDatabaseTransaction/withTransaction/g' {} \;

# Add createClient() calls where needed in services
for file in lib/services/*.ts lib/analytics/*.ts; do
  if [ -f "$file" ]; then
    # Add const supabase = createClient(); after async function declarations that use supabase
    sed -i '/async.*{/{N;s/\(async.*{\)\n/\1\n    const supabase = createClient();\n/;}' "$file"
  fi
done

echo "Fixes applied. Building..."