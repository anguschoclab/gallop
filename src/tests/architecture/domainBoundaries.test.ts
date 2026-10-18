import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");

function collect(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path, files);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) files.push(path);
  }
  return files;
}

function importsOf(path: string): string[] {
  const text = readFileSync(path, "utf8");
  // Type-only imports erase at compile time — they cannot create runtime
  // cycles and are exempt from the layer matrix.
  return [...text.matchAll(/\bimport\s+(?!type\s)[^;]*?\s+from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

describe("domain and platform boundaries", () => {
  it("keeps the retired top-level layout directories gone", () => {
    for (const legacy of ["core", "components", "services", "hooks", "game", "data", "constants"]) {
      expect(existsSync(join(SRC, legacy)), `legacy src/${legacy} should no longer exist`).toBe(
        false,
      );
    }
  });

  it("keeps domain model and simulation code independent of UI and store layers", () => {
    const violations: string[] = [];
    for (const file of collect(join(SRC, "domains"))) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (!/\/(model|simulation)\//.test(rel)) continue;
      for (const specifier of importsOf(file)) {
        if (/^@\/platform\/game(\/|$)/.test(specifier)) {
          violations.push(`${rel} -> ${specifier}`);
        }
        if (/^@\/domains\/[^/]+\/(ui|application)(\/|$)/.test(specifier)) {
          violations.push(`${rel} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps every domain file inside a named stratum", () => {
    const domains = join(SRC, "domains");
    const violations: string[] = [];
    for (const file of collect(domains)) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (!/^domains\/[^/]+\/(model|simulation|application|ui)\//.test(rel)) {
        violations.push(`${rel} is not under a model|simulation|application|ui stratum`);
      }
    }
    expect(violations).toEqual([]);
  });
});
