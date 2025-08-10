#!/usr/bin/env node
/**
 * Copy pdfjs-dist worker to public so the app can load it from /pdf.worker.min.js
 */
const fs = require("fs");
const path = require("path");

function main() {
  try {
    // Try multiple possible worker paths (pdfjs-dist v4 uses .mjs)
    const candidates = [
      "pdfjs-dist/build/pdf.worker.min.js",
      "pdfjs-dist/build/pdf.worker.min.mjs",
      "pdfjs-dist/build/pdf.worker.js",
    ];
    let src = null;
    for (const c of candidates) {
      try {
        src = require.resolve(c);
        break;
      } catch (_) {}
    }
    if (!src) throw new Error("Could not resolve pdf.js worker file");
    const destDir = path.join(process.cwd(), "public");
    const dest = path.join(destDir, "pdf.worker.min.js");

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const srcStat = fs.statSync(src);
    let needsCopy = true;
    if (fs.existsSync(dest)) {
      try {
        const destStat = fs.statSync(dest);
        needsCopy = destStat.size !== srcStat.size;
      } catch (_) {}
    }

    if (needsCopy) {
      fs.copyFileSync(src, dest);
      console.log("Copied pdf.worker.min.js to public/");
    } else {
      console.log("pdf.worker.min.js already up to date in public/");
    }
  } catch (err) {
    console.warn(
      "Warning: Could not copy pdf.worker.min.js. PDF features may fetch from CDN if configured.",
    );
    console.warn(String(err && err.message ? err.message : err));
  }
}

if (require.main === module) main();
