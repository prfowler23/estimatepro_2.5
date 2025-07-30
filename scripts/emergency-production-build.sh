#!/bin/bash

# Emergency production build script - creates minimal build by excluding problematic features

echo "Starting emergency production build..."
echo "This will create a minimal build by temporarily disabling problematic features"

# Backup problematic files
mkdir -p .backup-emergency

# Move problematic pages temporarily
echo "Moving problematic pages..."
mv app/estimates/new/guided .backup-emergency/ 2>/dev/null || true
mv app/drone-demo .backup-emergency/ 2>/dev/null || true
mv app/3d-demo .backup-emergency/ 2>/dev/null || true

# Create simple placeholder for guided flow
mkdir -p app/estimates/new/guided
cat > app/estimates/new/guided/page.tsx << 'EOF'
"use client";

export default function GuidedEstimateFlow() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Guided Flow Temporarily Unavailable</h1>
      <p>The guided estimation flow is temporarily unavailable. Please use the quick estimation form instead.</p>
      <a href="/estimates/new/quick" className="mt-4 inline-block bg-primary-light text-white px-4 py-2 rounded">
        Use Quick Estimation
      </a>
    </div>
  );
}
EOF

# Set build options
export NODE_OPTIONS="--max-old-space-size=8192"

# Run the build
echo "Running Next.js build..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "Build succeeded!"
    echo "NOTE: The following features are temporarily disabled:"
    echo "- Guided estimation flow"
    echo "- Drone demo"
    echo "- 3D visualization demo"
    echo ""
    echo "To restore full functionality:"
    echo "1. Fix the server/client import issues"
    echo "2. Run: ./scripts/restore-emergency-backup.sh"
    exit 0
else
    echo "Build failed!"
    echo "Restoring original files..."
    
    # Restore files
    rm -rf app/estimates/new/guided
    mv .backup-emergency/guided app/estimates/new/ 2>/dev/null || true
    mv .backup-emergency/drone-demo app/ 2>/dev/null || true
    mv .backup-emergency/3d-demo app/ 2>/dev/null || true
    
    exit 1
fi