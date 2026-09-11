/**
 * Architecture test: @/data files must be immutable and side-effect free.
 *
 * The layered architecture allows core to import from @/data ONLY because
 * all data files contain immutable domain data and pure lookup functions.
 * If any data file gains mutable state or runtime side effects, it must be
 * moved to a service/adapter layer and injected via a port.
 *
 * This test enforces that invariant.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DATA_ROOT = join(process.cwd(), "src", "data");

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (full.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("@/data immutability invariant", () => {
  const files = collectFiles(DATA_ROOT);

  it("all @/data .ts files are free of mutable runtime patterns", () => {
    const violations: string[] = [];
    const forbiddenPatterns = [
      /\blet\s+\w+/g, // mutable variables (let)
      /\bvar\s+\w+/g, // mutable variables (var)
      /\bMath\.random\b/g, // non-deterministic randomness
      /\bDate\.now\b/g, // runtime time access
      /\bDate\.parse\b/g, // runtime time access
      /\bnew Date\b/g, // runtime time access
      /\bfetch\s*\(/g, // network access
      /\blocalStorage\b/g, // browser storage
      /\bsessionStorage\b/g, // browser storage
      /\bconsole\.(log|warn|error|info|debug)\b/g, // side-effect logging
    ];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of forbiddenPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            violations.push(`${file.replace(DATA_ROOT, "@/data")}: "${match}"`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("all @/data .ts files export only const, type, interface, function, or class", () => {
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      // Check for mutable export patterns
      const mutableExport = /^export\s+(let|var)\s/gm;
      if (mutableExport.test(content)) {
        violations.push(`${file.replace(DATA_ROOT, "@/data")}: exports mutable variable`);
      }
    }
    expect(violations).toEqual([]);
  });
});
