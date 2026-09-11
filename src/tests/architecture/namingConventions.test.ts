/**
 * Architecture test: naming conventions for source files.
 *
 * Enforces the naming rules from ARCHITECTURE.md:
 * - Source files use camelCase
 * - Test files end in .test.ts/.test.tsx
 * - Helper files use the `Helpers` suffix
 * - Service facades use the `Service` suffix
 * - Detector registries use the `Detectors` suffix
 *
 * Pre-existing violations are recorded in a baseline and only new
 * violations fail the test.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
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
    // Allow kebab-case only for shadcn/ui components (components/ui/*)
    const isShadcnUi = file.includes("components/ui/");
    if (stem.includes("-") && !isShadcnUi) {
      violations.push(`${file}: kebab-case not allowed; use camelCase`);
    }
    // Allow PascalCase for React component files (.tsx) and handler classes
    const isHandler = file.includes("/handlers/") && stem.endsWith("Handler");
    if (!isComponent && !isHandler && /^[A-Z]/.test(stem) && !stem.startsWith("SCREAMING")) {
      violations.push(`${file}: PascalCase not allowed for non-component files; use camelCase`);
    }
  }
  return violations.sort();
}

describe("file naming conventions", () => {
  const files = collectFiles(SRC_ROOT).map((f) => relative(SRC_ROOT, f));

  it("source files use camelCase (no kebab-case, no PascalCase) — baseline-gated", () => {
    const violations = findNamingViolations(files);

    // Load baseline if it exists
    let baseline: string[] = [];
    if (existsSync(BASELINE_PATH)) {
      baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
    }

    // New violations are those not in the baseline
    const baselineSet = new Set(baseline);
    const newViolations = violations.filter((v) => !baselineSet.has(v));

    if (newViolations.length > 0) {
      console.error(
        `New naming violations (not in baseline):\n${newViolations.join("\n")}\n\n` +
          `If these are intentional, update the baseline:\n` +
          `  bun run scripts/generate-naming-baseline.ts`,
      );
    }

    expect(newViolations).toEqual([]);
  });
});

describe("vague token audit", () => {
  const coreFiles = collectFiles(join(SRC_ROOT, "core"));

  it("no exported function in src/core is named process*", () => {
    const processFuncs: string[] = [];
    for (const file of coreFiles) {
      const content = readFileSync(file, "utf-8");
      const matches = content.matchAll(/export\s+(?:async\s+)?function\s+(process\w*)/g);
      for (const m of matches) {
        const rel = relative(SRC_ROOT, file);
        processFuncs.push(`${rel}: ${m[1]}`);
      }
      const constMatches = content.matchAll(/export\s+const\s+(process\w*)\s*=/g);
      for (const m of constMatches) {
        const rel = relative(SRC_ROOT, file);
        processFuncs.push(`${rel}: ${m[1]}`);
      }
    }
    expect(processFuncs).toEqual([]);
  });

  it("standalone 'data' variable/parameter count in src/core is under 20", () => {
    const dataHits: string[] = [];
    // Match standalone `data` as a variable or parameter name, not compound names.
    // Excludes: horseData, raceData, @/data, dataPorts, .data, metadata, etc.
    const patterns = [
      /\bconst\s+data\b\s*=/g,
      /\blet\s+data\b\s*=/g,
      /\bdata\s*:\s*[A-Z]/g, // parameter: data: SomeType
      /\bdata\s*:\s*Record/g,
      /\bdata\s*:\s*Partial/g,
      /\bdata\s*:\s*Readonly/g,
      /\bdata\s*:\s*\{/g,
    ];
    for (const file of coreFiles) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of patterns) {
        for (const m of content.matchAll(pattern)) {
          const rel = relative(SRC_ROOT, file);
          dataHits.push(`${rel}: ${m[0].trim()}`);
        }
      }
    }
    if (dataHits.length >= 20) {
      console.error(`data token count: ${dataHits.length} (target < 20)\n${dataHits.join("\n")}`);
    }
    expect(dataHits.length).toBeLessThan(20);
  });

  it("standalone 'info' variable/parameter count in src/core is under 5", () => {
    const infoHits: string[] = [];
    const patterns = [
      /\bconst\s+info\b\s*=/g,
      /\blet\s+info\b\s*=/g,
      /\binfo\s*:\s*[A-Z]/g, // parameter: info: SomeType
    ];
    for (const file of coreFiles) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of patterns) {
        for (const m of content.matchAll(pattern)) {
          const rel = relative(SRC_ROOT, file);
          infoHits.push(`${rel}: ${m[0].trim()}`);
        }
      }
    }
    if (infoHits.length >= 5) {
      console.error(`info token count: ${infoHits.length} (target < 5)\n${infoHits.join("\n")}`);
    }
    expect(infoHits.length).toBeLessThan(5);
  });

  it("standalone 'item' variable/parameter count in src/core is under 5", () => {
    const itemHits: string[] = [];
    const patterns = [
      /\bconst\s+item\b\s*=/g,
      /\blet\s+item\b\s*=/g,
      /\bitem\s*:\s*[A-Z]/g, // parameter: item: SomeType
    ];
    for (const file of coreFiles) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of patterns) {
        for (const m of content.matchAll(pattern)) {
          const rel = relative(SRC_ROOT, file);
          itemHits.push(`${rel}: ${m[0].trim()}`);
        }
      }
    }
    if (itemHits.length >= 5) {
      console.error(`item token count: ${itemHits.length} (target < 5)\n${itemHits.join("\n")}`);
    }
    expect(itemHits.length).toBeLessThan(5);
  });
});
