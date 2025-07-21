#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Create simple SVG icon for EstimatePro
function createSVGIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
  <g fill="white">
    <!-- Calculator icon -->
    <rect x="${size * 0.2}" y="${size * 0.15}" width="${size * 0.6}" height="${size * 0.7}" fill="none" stroke="white" stroke-width="${size * 0.02}" rx="${size * 0.05}"/>
    
    <!-- Screen -->
    <rect x="${size * 0.25}" y="${size * 0.2}" width="${size * 0.5}" height="${size * 0.15}" fill="white" rx="${size * 0.02}"/>
    
    <!-- Buttons -->
    <circle cx="${size * 0.35}" cy="${size * 0.45}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.5}" cy="${size * 0.45}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.65}" cy="${size * 0.45}" r="${size * 0.035}" fill="white"/>
    
    <circle cx="${size * 0.35}" cy="${size * 0.55}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.5}" cy="${size * 0.55}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.65}" cy="${size * 0.55}" r="${size * 0.035}" fill="white"/>
    
    <circle cx="${size * 0.35}" cy="${size * 0.65}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.5}" cy="${size * 0.65}" r="${size * 0.035}" fill="white"/>
    <circle cx="${size * 0.65}" cy="${size * 0.65}" r="${size * 0.035}" fill="white"/>
    
    <!-- Large button -->
    <rect x="${size * 0.475}" y="${size * 0.72}" width="${size * 0.15}" height="${size * 0.08}" fill="white" rx="${size * 0.02}"/>
    
    <!-- Text -->
    <text x="${size * 0.5}" y="${size * 0.31}" text-anchor="middle" fill="#2563eb" font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold">EP</text>
  </g>
</svg>`;
}

// Create PNG placeholder (text-based representation)
function createPNGPlaceholder(size) {
  // For actual production, this would use a proper image library
  // For now, we'll create a simple data URL representation
  const canvas = `data:image/svg+xml;base64,${Buffer.from(createSVGIcon(size)).toString("base64")}`;
  return canvas;
}

// Main function to generate icons
async function generateIcons() {
  const publicDir = path.join(process.cwd(), "public");
  const iconsDir = path.join(publicDir, "icons");

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  console.log("Generating PWA icons...");

  for (const size of sizes) {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);

    // Write SVG file
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Generated: icon-${size}x${size}.svg`);

    // For the manifest, we need PNG files. Since we can't easily convert SVG to PNG
    // in a Node.js script without additional dependencies, we'll create the SVG files
    // and note that they need to be converted
  }

  // Create simple placeholder files for the required PNG icons
  // These would normally be converted from SVG using proper tools
  for (const size of sizes) {
    const pngPath = path.join(publicDir, `icon-${size}x${size}.png`);
    const svgContent = createSVGIcon(size);

    // Create a simple text file noting this needs conversion
    const note = `<!-- SVG content for ${size}x${size} icon - needs conversion to PNG -->
${svgContent}`;

    fs.writeFileSync(pngPath.replace(".png", ".svg"), note);
  }

  console.log("✅ PWA icon generation completed!");
  console.log(
    "📝 Note: SVG files created. For production, convert these to PNG format.",
  );
  console.log(
    "🔧 You can use online tools or ImageMagick to convert SVG to PNG.",
  );
  console.log("Example: convert icon-192x192.svg icon-192x192.png");
}

// Run the generator
generateIcons().catch(console.error);
