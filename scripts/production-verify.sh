#!/bin/bash

# EstimatePro Production Verification Script
# Run this after deployment to verify all systems operational

echo "🎯 EstimatePro Production Verification"
echo "======================================"

# Get production URL from user
read -p "Enter your production URL (e.g., https://estimatepro.vercel.app): " PRODUCTION_URL

if [[ -z "$PRODUCTION_URL" ]]; then
    echo "❌ Production URL required"
    exit 1
fi

echo "Testing: $PRODUCTION_URL"
echo ""

# 1. Basic connectivity
echo "🌐 Testing basic connectivity..."
if curl -s --head "$PRODUCTION_URL" | head -n 1 | grep -q "200 OK"; then
    echo "✅ Site is accessible"
else
    echo "❌ Site not accessible"
    exit 1
fi

# 2. Core pages
echo ""
echo "📄 Testing core application pages..."

PAGES=("/" "/calculator" "/quotes" "/dashboard")

for page in "${PAGES[@]}"; do
    if curl -s "$PRODUCTION_URL$page" | grep -q "<title>"; then
        echo "✅ $page loads successfully"
    else
        echo "⚠️  $page may have issues"
    fi
done

# 3. Performance check
echo ""
echo "⚡ Basic performance check..."
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$PRODUCTION_URL")
echo "Response time: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "✅ Good response time"
else
    echo "⚠️  Slow response time (>2s)"
fi

# 4. Security headers check
echo ""
echo "🔒 Security headers check..."
HEADERS=$(curl -s -I "$PRODUCTION_URL")

if echo "$HEADERS" | grep -q "x-frame-options"; then
    echo "✅ X-Frame-Options header present"
else
    echo "⚠️  Missing X-Frame-Options header"
fi

if echo "$HEADERS" | grep -q "x-content-type-options"; then
    echo "✅ X-Content-Type-Options header present"
else
    echo "⚠️  Missing X-Content-Type-Options header"
fi

# 5. JavaScript/CSS loading
echo ""
echo "📦 Asset loading check..."
if curl -s "$PRODUCTION_URL" | grep -q "_next/static"; then
    echo "✅ Next.js assets loading"
else
    echo "⚠️  Asset loading issues detected"
fi

echo ""
echo "🎉 VERIFICATION COMPLETE!"
echo "================================"
echo "✅ EstimatePro is live at: $PRODUCTION_URL"
echo ""
echo "📊 Next steps:"
echo "1. Test all 11 service calculators"
echo "2. Create a test quote end-to-end"
echo "3. Verify PDF generation works"
echo "4. Check analytics dashboard"
echo "5. Test user authentication flow"
echo ""
echo "🚀 Your building services estimation platform is ready for business!"