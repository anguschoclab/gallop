import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Architecture layering rules tests.
 *
 * Enforces the one-way dependency rule:
 *   core  → core, constants, data (immutable — see dataImmutability.test.ts), game/types (types only)
 *   services → core, constants, data, game/types
 *   components/routes → services, hooks, game/types
 *
 * A lower layer may never import from a higher layer.
 * Core may import from @/data because all data files are verified immutable
 * and side-effect free (enforced by dataImmutability.test.ts).
 * These tests scan source files for forbidden import paths and
 * compare the violation count against a frozen baseline so the
 * count can only go down.
 */

const SRC_ROOT = join(process.cwd(), "src");

// ── helpers ──────────────────────────────────────────────────────────

/** Recursively collect all .ts/.tsx files under a directory. */
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Extract import specifiers from a file's content. */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  // Match: import ... from "..."
  const importRegex = /(?:^|\n)\s*import\s+(?:type\s+)?[^;]*?\s+from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

/** Check if an import is a type-only import (import type { ... }). */
function isTypeOnlyImport(line: string, specifier: string): boolean {
  // Find the line that contains this specifier
  const lines = line.split("\n");
  for (const l of lines) {
    if (l.includes(`"${specifier}"`) || l.includes(`'${specifier}'`)) {
      return /\bimport\s+type\b/.test(l);
    }
  }
  return false;
}

/** Get the layer of a file based on its path relative to src/. */
function getLayer(
  filePath: string,
): "core" | "services" | "components" | "routes" | "hooks" | "game" | "other" {
  const rel = relative(SRC_ROOT, filePath).replace(/\\/g, "/");
  if (rel.startsWith("core/")) return "core";
  if (rel.startsWith("services/")) return "services";
  if (rel.startsWith("components/")) return "components";
  if (rel.startsWith("routes/")) return "routes";
  if (rel.startsWith("hooks/")) return "hooks";
  if (rel.startsWith("game/")) return "game";
  return "other";
}

/** Determine the target layer of an import specifier. */
function getImportLayer(
  specifier: string,
):
  | "core"
  | "services"
  | "components"
  | "hooks"
  | "game-store"
  | "game-types"
  | "data"
  | "constants"
  | "other" {
  if (specifier.startsWith("@/core/") || specifier === "@/core") return "core";
  if (specifier.startsWith("@/services/") || specifier === "@/services") return "services";
  if (specifier.startsWith("@/components/") || specifier === "@/components") return "components";
  if (specifier.startsWith("@/hooks/") || specifier === "@/hooks") return "hooks";
  if (specifier.startsWith("@/game/store")) return "game-store";
  if (specifier.startsWith("@/game/types") || specifier === "@/game/types") return "game-types";
  if (specifier.startsWith("@/data/") || specifier === "@/data") return "data";
  if (specifier.startsWith("@/constants/") || specifier === "@/constants") return "constants";
  return "other";
}

interface Violation {
  file: string;
  specifier: string;
  rule: string;
}

/** Scan all core files for forbidden imports. */
function scanCoreViolations(): Violation[] {
  const files = collectFiles(join(SRC_ROOT, "core"));
  const violations: Violation[] = [];
  for (const file of files) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    for (const spec of imports) {
      const layer = getImportLayer(spec);
      // core may NOT import from game/store, services, components, hooks
      if (layer === "game-store") {
        violations.push({
          file: relative(SRC_ROOT, file),
          specifier: spec,
          rule: "core→game/store",
        });
      } else if (layer === "services") {
        violations.push({ file: relative(SRC_ROOT, file), specifier: spec, rule: "core→services" });
      } else if (layer === "components") {
        violations.push({
          file: relative(SRC_ROOT, file),
          specifier: spec,
          rule: "core→components",
        });
      } else if (layer === "hooks") {
        violations.push({ file: relative(SRC_ROOT, file), specifier: spec, rule: "core→hooks" });
      }
    }
  }
  return violations;
}

/** Scan all services files for forbidden imports. */
function scanServicesViolations(): Violation[] {
  const files = collectFiles(join(SRC_ROOT, "services"));
  const violations: Violation[] = [];
  for (const file of files) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    for (const spec of imports) {
      const layer = getImportLayer(spec);
      // services may NOT import from components, hooks
      if (layer === "components") {
        violations.push({
          file: relative(SRC_ROOT, file),
          specifier: spec,
          rule: "services→components",
        });
      } else if (layer === "hooks") {
        violations.push({
          file: relative(SRC_ROOT, file),
          specifier: spec,
          rule: "services→hooks",
        });
      }
    }
  }
  return violations;
}

/** Scan all component files for direct core imports. */
function scanComponentViolations(): Violation[] {
  const files = collectFiles(join(SRC_ROOT, "components"));
  const violations: Violation[] = [];
  for (const file of files) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    for (const spec of imports) {
      const layer = getImportLayer(spec);
      // components may NOT import from core directly
      if (layer === "core") {
        violations.push({
          file: relative(SRC_ROOT, file),
          specifier: spec,
          rule: "components→core",
        });
      }
    }
  }
  return violations;
}

// ── tests ────────────────────────────────────────────────────────────

describe("layering baseline file", () => {
  it("layering-violations.baseline.json exists at repo root", () => {
    const baselinePath = join(process.cwd(), "layering-violations.baseline.json");
    expect(existsSync(baselinePath)).toBe(true);
  });

  it("baseline is a valid JSON object with violation arrays", () => {
    const baselinePath = join(process.cwd(), "layering-violations.baseline.json");
    if (!existsSync(baselinePath)) return; // skip if not yet created
    const raw = readFileSync(baselinePath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty("coreViolations");
    expect(parsed).toHaveProperty("servicesViolations");
    expect(parsed).toHaveProperty("componentViolations");
    expect(Array.isArray(parsed.coreViolations)).toBe(true);
    expect(Array.isArray(parsed.servicesViolations)).toBe(true);
    expect(Array.isArray(parsed.componentViolations)).toBe(true);
  });
});

describe("layering violation count does not exceed baseline", () => {
  // Read baseline once
  const baselinePath = join(process.cwd(), "layering-violations.baseline.json");
  const baseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf-8"))
    : { coreViolations: [], servicesViolations: [], componentViolations: [] };

  it("core violations do not exceed baseline count", () => {
    const current = scanCoreViolations();
    const baselineCount = baseline.coreViolations.length;
    expect(current.length).toBeLessThanOrEqual(baselineCount);
  });

  it("services violations do not exceed baseline count", () => {
    const current = scanServicesViolations();
    const baselineCount = baseline.servicesViolations.length;
    expect(current.length).toBeLessThanOrEqual(baselineCount);
  });

  it("component violations do not exceed baseline count", () => {
    const current = scanComponentViolations();
    const baselineCount = baseline.componentViolations.length;
    expect(current.length).toBeLessThanOrEqual(baselineCount);
  });
});
