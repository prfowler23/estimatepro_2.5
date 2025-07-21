#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Create a basic PNG icon using a simple base64 encoded PNG
function createBasicPNG(size) {
  // This is a minimal base64-encoded PNG (1x1 blue pixel) that we'll scale
  // In production, you'd use proper image generation tools
  const minimalPNG =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==";

  // Create a simple colored square
  // This is a hack for demonstration - in production use proper image libraries
  const pngHeader = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
  ]);

  // For simplicity, we'll create a data URL that can be used temporarily
  return `data:image/svg+xml;base64,${Buffer.from(
    `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="${size * 0.2}" font-weight="bold">EP</text>
    </svg>
  `,
  ).toString("base64")}`;
}

// Create placeholder PNG files that can be replaced later
function createPNGPlaceholder(size, filePath) {
  // Create a simple SVG that represents the icon
  const svgContent = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
  <g fill="white">
    <circle cx="${size / 2}" cy="${size * 0.3}" r="${size * 0.08}" />
    <rect x="${size * 0.35}" y="${size * 0.45}" width="${size * 0.3}" height="${size * 0.02}" />
    <rect x="${size * 0.35}" y="${size * 0.55}" width="${size * 0.3}" height="${size * 0.02}" />
    <rect x="${size * 0.35}" y="${size * 0.65}" width="${size * 0.3}" height="${size * 0.02}" />
    <text x="${size / 2}" y="${size * 0.85}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size * 0.1}" font-weight="bold">EP</text>
  </g>
</svg>`;

  // For now, save as SVG with PNG extension for demonstration
  // In production, these would be converted to actual PNG files
  fs.writeFileSync(filePath, svgContent);
}

async function createPNGIcons() {
  const publicDir = path.join(process.cwd(), "public");
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  console.log("Creating PNG icon placeholders...");

  for (const size of sizes) {
    const pngPath = path.join(publicDir, `icon-${size}x${size}.png`);
    createPNGPlaceholder(size, pngPath);
    console.log(`Created: icon-${size}x${size}.png (SVG format placeholder)`);
  }

  // Create screenshots placeholders
  const screenshotWide = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="0" y="0" width="1280" height="60" fill="#2563eb"/>
  <text x="640" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">EstimatePro - Building Services Estimation Platform</text>
  <rect x="40" y="100" width="300" height="200" fill="#e2e8f0" rx="8"/>
  <text x="190" y="210" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">Dashboard Overview</text>
  <rect x="380" y="100" width="300" height="200" fill="#e2e8f0" rx="8"/>
  <text x="530" y="210" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">Service Calculator</text>
  <rect x="720" y="100" width="300" height="200" fill="#e2e8f0" rx="8"/>
  <text x="870" y="210" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">AI Photo Analysis</text>
</svg>`;

  const screenshotNarrow = `<svg width="540" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="540" height="720" fill="#f8fafc"/>
  <rect x="0" y="0" width="540" height="60" fill="#2563eb"/>
  <text x="270" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="20" font-weight="bold">EstimatePro Mobile</text>
  <rect x="20" y="100" width="500" height="150" fill="#e2e8f0" rx="8"/>
  <text x="270" y="185" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">Quick Estimate</text>
  <rect x="20" y="270" width="240" height="120" fill="#e2e8f0" rx="8"/>
  <text x="140" y="335" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">Calculator</text>
  <rect x="280" y="270" width="240" height="120" fill="#e2e8f0" rx="8"/>
  <text x="400" y="335" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">Photos</text>
</svg>`;

  fs.writeFileSync(path.join(publicDir, "screenshot-wide.png"), screenshotWide);
  fs.writeFileSync(
    path.join(publicDir, "screenshot-narrow.png"),
    screenshotNarrow,
  );

  console.log("Created: screenshot-wide.png (SVG placeholder)");
  console.log("Created: screenshot-narrow.png (SVG placeholder)");

  console.log("✅ PWA assets created!");
  console.log("📝 Note: SVG placeholders created with PNG extensions.");
  console.log(
    "🚀 These will work for PWA installation but should be converted to actual PNG for production.",
  );
}

createPNGIcons().catch(console.error);
