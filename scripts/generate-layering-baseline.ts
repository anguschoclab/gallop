/**
 * Generates layering-violations.baseline.json — a frozen snapshot of all
 * current cross-layer import violations.  The count can only go down.
 *
 * Run: bun run scripts/generate-layering-baseline.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(process.cwd(), "src");

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

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:^|\n)\s*import\s+(?:type\s+)?[^;]*?\s+from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

function getImportLayer(specifier: string): string {
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

function scanLayer(layerDir: string, forbiddenLayers: string[]): Violation[] {
  const files = collectFiles(layerDir);
  const violations: Violation[] = [];
  for (const file of files) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    for (const spec of imports) {
      const layer = getImportLayer(spec);
      if (forbiddenLayers.includes(layer)) {
        violations.push({
          file: relative(SRC_ROOT, file).replace(/\\/g, "/"),
          specifier: spec,
          rule: `${relative(SRC_ROOT, layerDir).replace(/\\/g, "/")}→${layer}`,
        });
      }
    }
  }
  return violations;
}

const coreViolations = scanLayer(join(SRC_ROOT, "core"), [
  "game-store",
  "services",
  "components",
  "hooks",
]);
const servicesViolations = scanLayer(join(SRC_ROOT, "services"), ["components", "hooks"]);
const componentViolations = scanLayer(join(SRC_ROOT, "components"), ["core"]);

const baseline = {
  generatedAt: new Date().toISOString(),
  coreViolations,
  servicesViolations,
  componentViolations,
};

writeFileSync(
  join(process.cwd(), "layering-violations.baseline.json"),
  JSON.stringify(baseline, null, 2) + "\n",
);

console.log(`Baseline generated:`);
console.log(`  core violations:     ${coreViolations.length}`);
console.log(`  services violations: ${servicesViolations.length}`);
console.log(`  component violations: ${componentViolations.length}`);
console.log(
  `  total:               ${coreViolations.length + servicesViolations.length + componentViolations.length}`,
);
