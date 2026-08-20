import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, sep } from "node:path";

const SRC_ROOT = join(process.cwd(), "src");

// Files/directories where Math.random() is allowed (cosmetic-only or test infra)
const ALLOWED: string[] = [
  "components/awards/AwardCeremony.tsx",
  "components/ui/sidebar.tsx",
  "components/ui/sidebarMenu.tsx",
  "tests/",
  "core/common/rng.ts", // Math.random() fallback when crypto unavailable
];

function isAllowed(filePath: string): boolean {
  return ALLOWED.some((allowed) => filePath.includes(allowed));
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(fullPath, acc);
    } else {
      const ext = extname(entry.name);
      if (
        (ext === ".ts" || ext === ".tsx") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test.tsx")
      ) {
        acc.push(fullPath);
      }
    }
  }
  return acc;
}

describe("Math.random elimination from core modules", () => {
  it("no Math.random() calls in production source files (excluding allowed)", () => {
    const files = collectTsFiles(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      // Normalise to forward slashes so isAllowed works on Windows and Unix.
      const relative = file
        .replace(SRC_ROOT + sep, "")
        .split(sep)
        .join("/");
      if (isAllowed(relative)) continue;

      const content = readFileSync(file, "utf-8");
      // Check for Math.random() calls (not just comments mentioning it)
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*"))
          continue;
        if (trimmed.startsWith("*")) continue;
        // Check for Math.random() usage
        if (/\bMath\.random\s*\(/.test(line)) {
          violations.push(`${relative}:${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      console.error("Math.random() found in production code:\n" + violations.join("\n"));
    }
    expect(violations).toHaveLength(0);
  });
});
