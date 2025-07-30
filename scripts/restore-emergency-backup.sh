#!/bin/bash

# Restore files from emergency backup

echo "Restoring files from emergency backup..."

# Remove placeholder
rm -rf app/estimates/new/guided

# Restore original files
if [ -d ".backup-emergency/guided" ]; then
    mv .backup-emergency/guided app/estimates/new/
    echo "Restored: app/estimates/new/guided"
fi

if [ -d ".backup-emergency/drone-demo" ]; then
    mv .backup-emergency/drone-demo app/
    echo "Restored: app/drone-demo"
fi

if [ -d ".backup-emergency/3d-demo" ]; then
    mv .backup-emergency/3d-demo app/
    echo "Restored: app/3d-demo"
fi

# Clean up backup directory
rmdir .backup-emergency 2>/dev/null || true

echo "Restoration complete!"