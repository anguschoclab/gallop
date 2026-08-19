import { describe, expect, it } from "vitest";
import { generateBeyerAndRecoveryImpacts } from "@/core/race/impacts/beyerRecovery";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import type { Race } from "@/game/types";

describe("generateBeyerAndRecoveryImpacts", () => {
  const testHorse = createTestHorse({ id: "1" });
  const rng = createTestRng("test");

  const mockRace: Partial<Race> = {
    distance: 2000,
  };

  const calibratedPars = { 2000: 120 }; // Par time of 120s for 2000m

  it("should generate a Beyer impact based on finish time", () => {
    const { beyerImpact } = generateBeyerAndRecoveryImpacts(
      testHorse,
      1, // position
      120, // time
      mockRace as Race,
      0, // classBonus
      calibratedPars,
      10, // day
      rng,
    );

    expect(beyerImpact).not.toBeNull();
    expect(beyerImpact.type).toBe("beyer_update");
    expect(beyerImpact.horseId).toBe(testHorse.id);
    // Depending on factors, if base beyer is 100, we should expect a value nearby.
    // The exact value isn't super important, just that it calculates something reasonable.
    expect(beyerImpact.beyer).toBeGreaterThan(50);
  });

  it("should generate a recovery drain impact based on distance and beyer", () => {
    const { beyerImpact, recoveryImpact } = generateBeyerAndRecoveryImpacts(
      testHorse,
      1,
      120,
      mockRace as Race,
      0,
      calibratedPars,
      10,
      rng,
    );

    expect(recoveryImpact).not.toBeNull();
    expect(recoveryImpact.type).toBe("recovery_change");
    // Drain is negative delta.
    expect(recoveryImpact.delta).toBeLessThan(0);
    // Drain depends on beyer. e.g. 2000/100 + beyer/20.
    // So 20 + beyer/20.
    expect(recoveryImpact.delta).toBe(-Math.floor(2000 / 100 + beyerImpact.beyer / 20));
  });
});
