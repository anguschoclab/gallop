import { describe, it, expect } from "vitest";
import { calculateAssignedWeight } from "@/core/race/entryScoring";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race } from "@/game/types";

describe("calculateAssignedWeight", () => {
  it("applies base weight to standard horses", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const race = { restrictions: {} } as Race;
    const weight = calculateAssignedWeight(horse, race);
    expect(weight).toBe(126); // BASE_RACE_WEIGHT_LBS
  });

  it("applies sex allowance to females in mixed races", () => {
    const filly = createTestHorse({ id: "f1", age: 5, gender: "filly" });
    const race = { restrictions: {} } as Race;
    const weight = calculateAssignedWeight(filly, race);
    expect(weight).toBe(123); // 126 - 3
  });

  it("applies age allowance to 3yos", () => {
    const young = createTestHorse({ id: "y1", age: 3, gender: "horse" });
    const race = { restrictions: {} } as Race;
    const weight = calculateAssignedWeight(young, race);
    expect(weight).toBe(124); // 126 - 2
  });

  it("applies both sex and age allowance", () => {
    const youngFilly = createTestHorse({ id: "yf1", age: 3, gender: "filly" });
    const race = { restrictions: {} } as Race;
    const weight = calculateAssignedWeight(youngFilly, race);
    expect(weight).toBe(121); // 126 - 3 - 2
  });

  it("respects handicap assignments overriding base math", () => {
    const horse = createTestHorse({ id: "h1", age: 3, gender: "filly" });
    const race = {
      isHandicap: true,
      handicapWeights: [{ horseId: "h1", weight: 130 }],
    } as Race;
    const weight = calculateAssignedWeight(horse, race);
    expect(weight).toBe(130);
  });
});
