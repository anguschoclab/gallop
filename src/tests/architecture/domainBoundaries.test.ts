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
  return [...text.matchAll(/\bimport\s+(?:type\s+)?[^;]*?\s+from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

describe("domain and platform boundaries", () => {
  it("keeps legacy UI, service, and simulation layers strictly acyclic", () => {
    const violations: string[] = [];
    for (const file of collect(join(SRC, "core"))) {
      for (const specifier of importsOf(file)) {
        if (/^@\/(components|hooks|services|game\/store)(\/|$)/.test(specifier)) {
          violations.push(`${relative(SRC, file)} -> ${specifier}`);
        }
      }
    }
    for (const file of collect(join(SRC, "components"))) {
      for (const specifier of importsOf(file)) {
        if (/^@\/core(\/|$)/.test(specifier)) {
          violations.push(`${relative(SRC, file)} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps domain model and simulation code independent of UI and store layers", () => {
    const violations: string[] = [];
    for (const file of collect(join(SRC, "domains"))) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (!/\/(model|simulation)\//.test(rel)) continue;
      for (const specifier of importsOf(file)) {
        if (/^@\/(components|hooks|services|game\/store)(\/|$)/.test(specifier)) {
          violations.push(`${rel} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("enforces one-way dependencies inside any domain folder", () => {
    const domains = join(SRC, "domains");
    const violations: string[] = [];
    for (const file of collect(domains)) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      const owner = /^domains\/([^/]+)\//.exec(rel)?.[1];
      for (const specifier of importsOf(file)) {
        const domainMatch = /^@\/domains\/([^/]+)\/([^/]+)/.exec(specifier);
        if (!domainMatch) continue;
        const [, targetDomain, targetLayer] = domainMatch;
        if (targetDomain !== owner) {
          violations.push(`${rel} crosses into ${specifier}`);
        } else if (rel.includes("/ui/") && ["model", "simulation"].includes(targetLayer)) {
          violations.push(`${rel} imports domain internals through ${specifier}`);
        } else if (rel.includes("/simulation/") && ["ui", "application"].includes(targetLayer)) {
          violations.push(`${rel} imports upward through ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
