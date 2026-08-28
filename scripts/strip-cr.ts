/**
 * One-shot script: strips carriage returns from all git-tracked text files.
 * Converts CRLF → LF (and lone CR → LF) without changing any other content.
 * Binary files are excluded via .gitattributes / extension check.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".lockb",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
]);

const files = execSync("git ls-files", { encoding: "utf-8" })
  .split("\n")
  .filter((f) => f.length > 0);

let changed = 0;
let skipped = 0;

for (const file of files) {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  if (BINARY_EXT.has(ext)) {
    skipped++;
    continue;
  }

  let content: Buffer;
  try {
    content = readFileSync(file);
  } catch {
    skipped++;
    continue;
  }

  // Skip if no CR bytes at all.
  if (!content.includes(0x0d)) {
    continue;
  }

  const text = content.toString("utf-8");
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  writeFileSync(file, normalized, "utf-8");
  changed++;
}

console.log(`Normalized ${changed} file(s), skipped ${skipped} binary file(s).`);
