import { describe, it, expect } from "vitest";
import { generateAllNpcHorses } from "@/core/npc/horseGenerator";
import { generateAllStables } from "@/core/npc/stables";
import { createRng, hashStr } from "@/core/common/rng";
import { generateFamousStallions } from "@/data/famousStallions";

describe("generateAllNpcHorses", () => {
  it("should generate horses with unique IDs", () => {
    const rng = createRng(hashStr("test_uniqueness"));
    const stables = generateAllStables(1, rng);
    const famousStallions = generateFamousStallions(stables, rng);

    const { horses } = generateAllNpcHorses(stables, rng, undefined, 1, famousStallions);

    const ids = horses.map((h) => h.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it("should not contain duplicate horse objects in the returned array", () => {
    const rng = createRng(hashStr("test_duplicates"));
    const stables = generateAllStables(1, rng);
    const famousStallions = generateFamousStallions(stables, rng);

    const { horses } = generateAllNpcHorses(stables, rng, undefined, 1, famousStallions);

    // Check for object equality (not just ID equality)
    const uniqueObjects = new Set(horses);
    expect(horses.length).toBe(uniqueObjects.size);
  });
});
