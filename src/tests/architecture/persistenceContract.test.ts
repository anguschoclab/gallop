import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { META_KEYS, PERSISTED_KEYS, TRANSIENT_STATE_KEYS } from "@/platform/game/store/persistedKeys";

const ROOT = process.cwd();

function gameStateKeys(): string[] {
  const program = ts.createProgram([join(ROOT, "src/platform/game/types.ts")], {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    skipLibCheck: true,
    baseUrl: ROOT,
    paths: { "@/*": ["src/*"] },
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(join(ROOT, "src/platform/game/types.ts"));
  const moduleSymbol = checker.getSymbolAtLocation(source!);
  const symbol = checker
    .getExportsOfModule(moduleSymbol!)
    .find((candidate) => candidate.name === "GameState");
  return checker
    .getDeclaredTypeOfSymbol(symbol!)
    .getProperties()
    .map((property) => property.name)
    .sort();
}

describe("persistence contract", () => {
  it("uses authoritative store keys without transitional casts", () => {
    const source = readFileSync(join(ROOT, "src/platform/game/store/persistedKeys.ts"), "utf8");
    expect(source).not.toContain("as keyof GameState");
    expect(source).not.toContain('(keyof GameState | "storeVersion")[]');
  });

  it("keeps session-transient engine fields out of persisted state", () => {
    expect(PERSISTED_KEYS).not.toContain("engineRevision");
    expect(META_KEYS).not.toContain("engineRevision");
  });

  it("classifies every GameState key as persisted or explicitly session-transient", () => {
    const persisted = new Set(PERSISTED_KEYS);
    const transient = new Set(TRANSIENT_STATE_KEYS);
    const overlap = [...persisted].filter((key) => transient.has(key as never));
    const unclassified = gameStateKeys().filter(
      (key) => !persisted.has(key as never) && !transient.has(key as never),
    );

    expect(overlap).toEqual([]);
    expect(unclassified).toEqual([]);
    expect([...transient].sort()).toEqual([
      "engineGeneration",
      "engineRevision",
      "execution",
      "pendingIntents",
    ]);
  });
});
