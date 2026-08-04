/**
 * Post-build cleanup for static hosting.
 * Strips Replit's editor/beacon SDK script injected into dist/public/index.html.
 * Run after `pnpm --filter @workspace/nuasa run build`.
 */
import fs from "node:fs";
import path from "node:path";

const indexPath = path.resolve("artifacts/nuasa/dist/public/index.html");
let html = fs.readFileSync(indexPath, "utf8");
const before = html.length;

// Remove any inline <script type="module"> that contains Replit beacon/SDK code.
// These blocks are identifiable by the ALLOWED_PARENT_DOMAINS / replit-staging marker.
html = html.replace(
  /<script type="module">[^<]*ALLOWED_PARENT_DOMAINS[\s\S]*?<\/script>/g,
  ""
);

// Also strip any <script> with src pointing to replit CDN just in case
html = html.replace(
  /<script[^>]+src="https?:\/\/[^"]*replit[^"]*"[^>]*>[\s\S]*?<\/script>/gi,
  ""
);

// Clean up any double blank lines left behind
html = html.replace(/\n{3,}/g, "\n\n");

fs.writeFileSync(indexPath, html, "utf8");
const after = html.length;
console.log(`✓ Cleaned index.html: removed ${before - after} bytes of Replit SDK code`);
console.log(`  Output: ${indexPath}`);
