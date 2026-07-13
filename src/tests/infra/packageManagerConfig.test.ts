import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../../..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf-8");
}

function readJson(relPath: string): Record<string, any> {
  return JSON.parse(readFile(relPath));
}

describe("package manager configuration", () => {
  it("package.json has packageManager field set to bun", () => {
    const pkg = readJson("package.json");
    expect(pkg.packageManager).toBeDefined();
    expect(pkg.packageManager).toMatch(/^bun@\d+\.\d+\.\d+/);
  });

  it("package-lock.json does not exist", () => {
    expect(fs.existsSync(path.join(repoRoot, "package-lock.json"))).toBe(false);
  });

  it("package-lock.json is in .gitignore", () => {
    const gitignore = readFile(".gitignore");
    expect(gitignore).toContain("package-lock.json");
  });

  it("bunfig.toml has no [test] section", () => {
    const bunfig = readFile("bunfig.toml");
    expect(bunfig).not.toMatch(/^\[test\]/m);
  });

  it("package.json has no test:bun-native script", () => {
    const pkg = readJson("package.json");
    expect(pkg.scripts["test:bun-native"]).toBeUndefined();
  });

  it("package.json has typecheck script", () => {
    const pkg = readJson("package.json");
    expect(pkg.scripts.typecheck).toBeDefined();
    expect(pkg.scripts.typecheck).toContain("tsc");
    expect(pkg.scripts.typecheck).toContain("--noEmit");
  });

  it("package.json has test:coverage script", () => {
    const pkg = readJson("package.json");
    expect(pkg.scripts["test:coverage"]).toBeDefined();
    expect(pkg.scripts["test:coverage"]).toContain("--coverage");
  });

  it(".claude/settings.local.json has no npm allowlist entries", () => {
    const settings = readJson(".claude/settings.local.json");
    const allow = settings.permissions?.allow ?? [];
    const npmEntries = allow.filter((e: string) => /\bnpm\b/.test(e));
    expect(npmEntries).toEqual([]);
  });

  it("scripts/svg-to-png.cjs doesn't reference npm install", () => {
    const content = readFile("scripts/svg-to-png.cjs");
    expect(content).not.toContain("npm install");
  });

  it("no npx tsx in scripts", () => {
    const scriptsDir = path.join(repoRoot, "scripts");
    const tsFiles = fs
      .readdirSync(scriptsDir)
      .filter((f) => f.endsWith(".ts"));
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.join(scriptsDir, file), "utf-8");
      expect(content).not.toContain("npx tsx");
    }
  });
});
