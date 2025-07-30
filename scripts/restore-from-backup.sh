#!/bin/bash

echo "Restoring services from temp backup..."

# Restore original files
cp -r temp-backup-routes/* app/api/ 2>/dev/null || echo "No backup found"

# Reset modified files
git checkout lib/services/estimate-service.ts
git checkout lib/analytics/enhanced-analytics-service.ts
git checkout lib/services/ai-conversation-service.ts

echo "Files restored. Please fix imports manually or use a previous working commit."