#!/bin/bash

echo "🔍 ESTIMATEPRO PRODUCTION READINESS CHECK"
echo "======================================="

# Environment Variables Check
echo "📋 Environment Variables:"
REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "OPENAI_API_KEY")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing: $var"
    else
        echo "✅ Present: $var"
    fi
done

# Dependencies Check
echo -e "\n📦 Dependencies:"
if npm audit --audit-level high; then
    echo "✅ No high-severity vulnerabilities"
else
    echo "⚠️  Security vulnerabilities found"
fi

# Build Check
echo -e "\n🏗️  Build:"
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
fi

# Type Check
echo -e "\n📝 TypeScript:"
if npm run type-check; then
    echo "✅ Type check passed"
else
    echo "❌ Type errors found"
fi

# Lint Check
echo -e "\n🧹 Linting:"
if npm run lint; then
    echo "✅ No linting errors"
else
    echo "⚠️  Linting issues found"
fi

echo -e "\n🎯 Production readiness assessment complete!"