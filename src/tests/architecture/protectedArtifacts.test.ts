import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TRACKED_ARTIFACT_DIRS = [".claude", ".gemini", ".windsurf"];

function trackedFiles(path: string): string[] {
  return execSync(`git ls-files "${path}"`, { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

describe("protected agent artifacts", () => {
  it("keeps .jules working artifacts ignored and untracked", () => {
    const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
    expect(gitignore).toContain(".jules/");
    expect(trackedFiles(".jules").filter(f => f !== ".jules/anvil.md")).toEqual([]);
  });

  it("preserves the tracked AI/tooling artifact inventory", () => {
    for (const directory of TRACKED_ARTIFACT_DIRS) {
      if (!existsSync(join(ROOT, directory))) continue;
      expect(trackedFiles(directory).length).toBeGreaterThan(0);
    }
  });

  it("keeps the generated route tree out of version control", () => {
    const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
    expect(gitignore).toContain("routeTree.gen.ts");
    expect(trackedFiles("src/routeTree.gen.ts")).toEqual([]);
  });
});
