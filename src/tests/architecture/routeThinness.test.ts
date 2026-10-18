import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROUTES = join(process.cwd(), "src", "routes");

function collect(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path, files);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes("routeTree.gen")) files.push(path);
  }
  return files;
}

describe("route thinness", () => {
  it("keeps route files as adapters instead of exported page components", () => {
    const violations: string[] = [];
    for (const file of collect(ROUTES)) {
      const text = readFileSync(file, "utf8");
      const exportedComponents = [
        ...text.matchAll(/^export\s+(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/gm),
      ]
        .map((match) => match[1])
        .filter((name) => name !== "Route");
      if (exportedComponents.length > 0) {
        violations.push(`${relative(ROUTES, file)} exports ${exportedComponents.join(", ")}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
