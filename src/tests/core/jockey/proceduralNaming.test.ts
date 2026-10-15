import { describe, it, expect, vi } from "vitest";
import { generateProceduralJockeyName } from "@/core/jockey/proceduralNaming";
import { createRng } from "@/core/common/rng";
import type { RegionalSystem } from "@/game/types";

describe("generateProceduralJockeyName", () => {
  it("generates a name from the specified regional pool", () => {
    const rng = createRng(42);
    const name = generateProceduralJockeyName("japan", rng);
    expect(typeof name).toBe("string");
    expect(name.split(" ").length).toBe(2);
  });

  it("falls back to north_america pool if region is missing/invalid", () => {
    const rng = createRng(42);
    const nameInvalid = generateProceduralJockeyName("unknown_region" as RegionalSystem, rng);

    const rng2 = createRng(42);
    const nameNA = generateProceduralJockeyName("north_america", rng2);
    expect(nameInvalid).toBe(nameNA);
  });

  it("avoids duplicates by checking usedNames set", () => {
    const rng = createRng(42);
    const firstDraw = generateProceduralJockeyName("europe", rng);

    const rngReset = createRng(42);
    const usedNames = new Set([firstDraw.toLowerCase()]);

    const secondDraw = generateProceduralJockeyName("europe", rngReset, usedNames);
    expect(secondDraw).not.toBe(firstDraw);
  });

  it("appends a middle initial if 50 attempts fail to find a unique name", () => {
    const rng = createRng(100);
    const mockUsedNames = new Set<string>();
    vi.spyOn(mockUsedNames, "has").mockReturnValue(true);

    const name = generateProceduralJockeyName("australia", rng, mockUsedNames);

    const parts = name.split(" ");
    expect(parts.length).toBe(3);
    expect(parts[1]).toMatch(/^[A-Z]\.$/);

    vi.restoreAllMocks();
  });
});
