/**
 * Architecture guard for the hybrid test layout adopted by the megaplan.
 *
 * Domain unit tests may live beside their implementation while cross-domain
 * architecture, integration, performance, and E2E tests remain centralized.
 * The unit harness must discover both locations exactly once, while E2E specs
 * stay isolated to Playwright.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readText(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("hybrid test harness", () => {
  it("Vitest discovers centralized and colocated unit tests exactly once", () => {
    const config = readText("vitest.config.ts");
    const includeMatch = config.match(/include:\s*\[([\s\S]*?)\]/);
    expect(includeMatch, "vitest.config.ts must declare an include array").toBeTruthy();

    const include =
      includeMatch![1].match(/["'`]([^"'`]+)["'`]/g)?.map((p) => p.slice(1, -1)) ?? [];
    expect(include).toEqual(["src/**/*.test.ts", "src/**/*.test.tsx"]);
    expect(new Set(include).size).toBe(include.length);
  });

  it("Playwright specs remain outside the unit-test harness", () => {
    const tsconfig = readText("tsconfig.json");
    expect(tsconfig).toContain('exclude": ["src/tests/e2e/**/*.ts"]');

    const vitestConfig = readText("vitest.config.ts");
    expect(vitestConfig).not.toContain("*.spec.ts");
    expect(vitestConfig).toContain('"src/tests/e2e/**/*"');
  });

  it("the legacy mirrored-test redirect only fires for existing source mirrors", () => {
    const config = readText("vitest.config.ts");
    expect(config).toContain("resolveMirroredSource(resolved)");
    expect(config).toContain("if (!resolved.startsWith(srcRoot) || !mirroredSource)");
  });

  it("CI uses the repository-pinned Bun version", () => {
    const packageJson = JSON.parse(readText("package.json")) as { packageManager?: string };
    const pinnedVersion = packageJson.packageManager?.split("@")[1];
    expect(pinnedVersion).toBeTruthy();

    const workflow = readText(".github/workflows/ci.yml");
    expect(workflow).toContain(`bun-version: ${pinnedVersion}`);
    expect(workflow).toContain("timeout-minutes: 30");
    expect(workflow).toContain("bun run test:e2e");
  });
});
