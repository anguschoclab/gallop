import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { META_KEYS, PERSISTED_KEYS } from "@/game/store/persistedKeys";

const ROOT = process.cwd();

describe("persistence contract", () => {
  it("uses authoritative store keys without transitional casts", () => {
    const source = readFileSync(join(ROOT, "src/game/store/persistedKeys.ts"), "utf8");
    expect(source).not.toContain("as keyof GameState");
    expect(source).not.toContain('(keyof GameState | "storeVersion")[]');
  });

  it("keeps session-transient engine fields out of persisted state", () => {
    expect(PERSISTED_KEYS).not.toContain("engineRevision");
    expect(META_KEYS).not.toContain("engineRevision");
  });
});
