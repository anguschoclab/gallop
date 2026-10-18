import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "src/tests/fixtures/agentDomainMoveManifest.json"), "utf8"),
) as {
  moves: { oldPath: string; newPath: string }[];
};

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function collect(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

describe("agents domain move manifest", () => {
  it("moves agent simulation modules to their declared domain path", () => {
    for (const move of manifest.moves) {
      expect(existsSync(join(ROOT, move.newPath)), move.newPath).toBe(true);
      expect(existsSync(join(ROOT, move.oldPath)), move.oldPath).toBe(false);
    }
  });

  it("documents the agents domain ownership in governing architecture docs", () => {
    const architecture = readFileSync(join(ROOT, "ARCHITECTURE.md"), "utf8");
    const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
    expect(architecture).toContain("src/domains/agents/simulation");
    expect(agents).toContain("src/domains/agents/simulation");
  });

  it("leaves no production or test import on the old agent paths", () => {
    const offenders = collect(SRC)
      .filter((path) => !path.includes("agentDomainMoves.test.ts"))
      .flatMap((path) => {
        const text = readFileSync(path, "utf8");
        return manifest.moves
          .filter((move) => text.includes(move.oldPath.replace(/^src\//, "@/")))
          .map((move) => `${path}: ${move.oldPath}`);
      });
    expect(offenders).toEqual([]);
  });
});
