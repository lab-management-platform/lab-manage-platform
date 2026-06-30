import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const destDir = join(__dirname, "../public");

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

const filesToCopy = [
  {
    src: join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
    dest: join(destDir, "pdf.worker.min.mjs")
  },
  {
    src: join(__dirname, "../node_modules/pdfjs-dist/build/pdf.mjs"),
    dest: join(destDir, "pdf.mjs")
  }
];

for (const file of filesToCopy) {
  if (existsSync(file.src)) {
    if (existsSync(file.dest)) {
      rmSync(file.dest, { force: true });
    }
    copyFileSync(file.src, file.dest);
    console.log(`✓ ${file.dest.split(/[/\\\\]/).pop()} copied to public/`);
  } else {
    console.warn("⚠ file not found at", file.src);
  }
}
