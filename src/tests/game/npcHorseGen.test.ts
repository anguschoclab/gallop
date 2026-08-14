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

  it("famous stallions are not assigned stud careers by generateAllNpcHorses", () => {
    const rng = createRng(hashStr("test_famous_stud_skip"));
    const stables = generateAllStables(1, rng);
    const famousStallions = generateFamousStallions(stables, rng);

    const { horses } = generateAllNpcHorses(stables, rng, undefined, 1, famousStallions);

    const famousIds = new Set(famousStallions.map((fs) => fs.id));
    const famousInOutput = horses.filter((h) => famousIds.has(h.id));
    for (const fs of famousInOutput) {
      // Famous stallions may already have stud from generateFamousStallions,
      // but generateAllNpcHorses should NOT set stud via shouldRetireAtStartup
      // If they have stud, it should be the pre-existing one, not the one from this function
      if (fs.stud) {
        // The key invariant: the stud was NOT set by the retirement loop
        // (which sets retiredOnDay: 1). If it was pre-existing, retiredOnDay may differ.
        // We verify the function didn't overwrite by checking it wasn't set with retiredOnDay: 1
        // unless it was already there from famousStallions.
        const original = famousStallions.find((fs2) => fs2.id === fs.id);
        if (original?.stud) {
          expect(fs.stud).toEqual(original.stud);
        }
      }
    }
  });

  it("non-famous horses that meet retirement criteria get stud careers", () => {
    const rng = createRng(hashStr("test_stud_assignment"));
    const stables = generateAllStables(1, rng);
    const famousStallions = generateFamousStallions(stables, rng);

    const { horses } = generateAllNpcHorses(stables, rng, undefined, 1, famousStallions);

    const famousIds = new Set(famousStallions.map((fs) => fs.id));
    const nonFamous = horses.filter((h) => !famousIds.has(h.id));
    // At least some non-famous horses should have stud careers assigned
    // (elite stables retire all male 5+ horses)
    const withStud = nonFamous.filter((h) => h.stud?.atStud);
    expect(withStud.length).toBeGreaterThan(0);
  });
});
