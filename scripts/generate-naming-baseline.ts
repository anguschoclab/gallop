/**
 * Generate the naming violations baseline.
 *
 * Run this after intentionally adding files that don't follow the naming
 * conventions (e.g., during integration of third-party components).
 *
 * Usage: bun run scripts/generate-naming-baseline.ts
 */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(process.cwd(), "src");
const BASELINE_PATH = join(process.cwd(), "naming-violations.baseline.json");

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function findNamingViolations(files: string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const basename = file.split("/").pop()!;
    const stem = basename.replace(/\.(test\.)?(ts|tsx)$/, "");
    const isComponent = basename.endsWith(".tsx");
    const isShadcnUi = file.includes("components/ui/");
    if (stem.includes("-") && !isShadcnUi) {
      violations.push(`${file}: kebab-case not allowed; use camelCase`);
    }
    const isHandler = file.includes("/handlers/") && stem.endsWith("Handler");
    if (!isComponent && !isHandler && /^[A-Z]/.test(stem) && !stem.startsWith("SCREAMING")) {
      violations.push(`${file}: PascalCase not allowed for non-component files; use camelCase`);
    }
  }
  return violations.sort();
}

const files = collectFiles(SRC_ROOT).map((f) => relative(SRC_ROOT, f));
const violations = findNamingViolations(files);

writeFileSync(BASELINE_PATH, JSON.stringify(violations, null, 2) + "\n");

console.log("Naming violations baseline generated:");
console.log(`  total violations: ${violations.length}`);
console.log(`  baseline file:    ${relative(process.cwd(), BASELINE_PATH)}`);
