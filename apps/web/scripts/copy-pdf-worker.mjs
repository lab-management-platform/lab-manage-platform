import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// pdfjs-dist 是 apps/web 的依赖，在 web 的 node_modules 下
const src = join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const destDir = join(__dirname, "../public");
const dest = join(destDir, "pdf.worker.min.mjs");

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

if (existsSync(src)) {
  cpSync(src, dest);
  console.log("✓ pdf.worker.min.mjs copied to public/");
} else {
  console.warn("⚠ pdf.worker.min.mjs not found at", src);
}
