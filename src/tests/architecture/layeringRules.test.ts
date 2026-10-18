import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Architecture layering rules tests.
 *
 * Enforces the one-way dependency rule across the domain-stratified layout:
 *
 *   shared          → shared only
 *   domains/<d>/model → shared, other model
 *   domains/<d>/simulation → shared, model, simulation, platform types
 *   domains/<d>/application → shared, model, simulation, application, platform
 *   domains/<d>/ui    → shared, model, application, platform, ui
 *   platform        → shared, model, simulation, application, platform
 *   routes          → anything
 *
 * A lower layer may never import from a higher layer. Type-only imports
 * are exempt: they erase at compile time and cannot create runtime cycles.
 *
 * These tests scan source files for forbidden import specifiers. There is
 * no baseline — the post-reorganization invariant is zero violations.
 */

const SRC_ROOT = join(process.cwd(), "src");

// ── helpers ──────────────────────────────────────────────────────────

type Layer =
  | "shared"
  | "platform"
  | "platform-game"
  | "model"
  | "simulation"
  | "application"
  | "ui"
  | "routes"
  | "tests"
  | "other";

const ALL_LAYERS: Layer[] = [
  "shared",
  "platform",
  "platform-game",
  "model",
  "simulation",
  "application",
  "ui",
  "routes",
  "tests",
  "other",
];

const ALLOWED: Record<Layer, ReadonlySet<Layer>> = {
  shared: new Set(["shared"]),
  model: new Set(["shared", "model"]),
  simulation: new Set(["shared", "model", "simulation", "platform"]),
  application: new Set([
    "shared",
    "model",
    "simulation",
    "application",
    "platform",
    "platform-game",
  ]),
  ui: new Set(["shared", "model", "platform", "platform-game", "application", "ui"]),
  platform: new Set(["shared", "model", "simulation", "application", "platform", "platform-game"]),
  "platform-game": new Set([
    "shared",
    "model",
    "simulation",
    "application",
    "platform",
    "platform-game",
  ]),
  routes: new Set(ALL_LAYERS),
  tests: new Set(ALL_LAYERS),
  other: new Set(ALL_LAYERS),
};

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

interface ImportEdge {
  specifier: string;
  typeOnly: boolean;
}

/** Extract import/export-from specifiers and whether they are type-only. */
function extractImports(content: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const re =
    /(?:^|\n)\s*(import\s+type|import|export\s+type|export)\b[^;]*?\sfrom\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    edges.push({
      specifier: m[2],
      typeOnly: m[1] === "import type" || m[1] === "export type",
    });
  }
  // side-effect imports: import "..."
  const side = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  while ((m = side.exec(content)) !== null) {
    edges.push({ specifier: m[1], typeOnly: false });
  }
  return edges;
}

/** Get the layer of a file path relative to src/. */
function layerOf(relPath: string): Layer {
  if (relPath.startsWith("shared/")) return "shared";
  if (relPath.startsWith("platform/game")) return "platform-game";
  if (relPath.startsWith("platform/")) return "platform";
  if (relPath.startsWith("routes/")) return "routes";
  if (relPath.startsWith("tests/") || relPath.startsWith("test-utils/")) return "tests";
  const m = /^domains\/[^/]+\/(model|simulation|application|ui)\//.exec(relPath);
  if (m) return m[1] as Layer;
  return "other";
}

/** Map an "@/x/..." specifier to its target layer, or null if not src-rooted. */
function specifierLayer(specifier: string): Layer | null {
  if (!specifier.startsWith("@/")) return null;
  // Strip query/resource suffixes (?raw, ?url).
  const bare = specifier.replace(/\?.*$/, "");
  return layerOf(bare.slice(2));
}

interface Violation {
  file: string;
  specifier: string;
  rule: string;
}

/** Scan every source file for imports that cross layers the wrong way. */
function scanViolations(): Violation[] {
  const files = collectFiles(SRC_ROOT);
  const violations: Violation[] = [];
  for (const file of files) {
    if (/\.(test|stories)\.tsx?$/.test(file)) continue;
    const rel = relative(SRC_ROOT, file).replace(/\\/g, "/");
    const fromLayer = layerOf(rel);
    if (fromLayer === "tests" || fromLayer === "other" || fromLayer === "routes") {
      continue;
    }
    const content = readFileSync(file, "utf-8");
    for (const edge of extractImports(content)) {
      if (edge.typeOnly) continue; // erased at compile time
      const toLayer = specifierLayer(edge.specifier);
      if (toLayer === null || toLayer === "tests" || toLayer === "other") {
        continue;
      }
      if (!ALLOWED[fromLayer].has(toLayer)) {
        violations.push({
          file: rel,
          specifier: edge.specifier,
          rule: `${fromLayer}→${toLayer}`,
        });
      }
    }
  }
  return violations;
}

// ── tests ────────────────────────────────────────────────────────────

describe("domain strata layering", () => {
  it("no value import crosses a forbidden layer boundary", () => {
    const violations = scanViolations();
    expect(violations).toEqual([]);
  });

  it("the canonical strata directories exist", () => {
    for (const dir of ["shared", "platform", "domains"]) {
      expect(statSync(join(SRC_ROOT, dir)).isDirectory()).toBe(true);
    }
  });
});
