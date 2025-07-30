#!/bin/bash

# Build script for production with increased memory
export NODE_OPTIONS="--max-old-space-size=8192"

echo "Building EstimatePro for production..."
echo "Node options: $NODE_OPTIONS"

# Clean previous builds
rm -rf .next

# Run the build
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "Build succeeded!"
    exit 0
else
    echo "Build failed!"
    exit 1
fi