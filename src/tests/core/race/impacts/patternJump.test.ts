import { describe, expect, it } from "vitest";
import { generatePatternJumpImpact } from "@/core/race/impacts/patternJump";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import type { Race } from "@/game/types";

describe("generatePatternJumpImpact", () => {
  const testHorse = createTestHorse({ id: "horse1" });
  const rng = createTestRng("test");

  // A basic mock race
  const mockRace: Partial<Race> = {
    id: "race1",
    name: "Mock Stakes",
    graded: { key: "some_key", grade: "G1", track: "Track", surface: "Turf" },
    weather: "sunny",
    trackCondition: "fast",
  };

  it("should return null if race is not graded", () => {
    const ungradedRace = { ...mockRace, graded: undefined } as Race;
    // Set a very high beyer value that would normally trigger a jump
    const impact = generatePatternJumpImpact(testHorse, 120, ungradedRace, 10, rng);
    expect(impact).toBeNull();
  });

  // To test the jump logic, we need to set up the horse's history
  // since `detectPatternJump` in `src/core/race/beyer.ts` relies on it.

  it("should detect a jump if Beyer is significantly higher than history", () => {
    // We will set history so the max beyer is 60.
    // A jump to 100 should definitely trigger it.
    const jumpingHorse = {
      ...testHorse,
      raceHistory: [{ beyer: 50 }, { beyer: 60 }, { beyer: 55 }],
    } as any;

    const impact = generatePatternJumpImpact(jumpingHorse, 100, mockRace as Race, 10, rng);

    expect(impact).not.toBeNull();
    expect(impact?.type).toBe("inbox_message");
    expect(impact?.message.title).toContain("Performance Spike");
    expect(impact?.message.body).toContain("100 Beyer figure");
  });

  it("should change title if weather was adverse", () => {
    const jumpingHorse = {
      ...testHorse,
      raceHistory: [{ beyer: 50 }, { beyer: 60 }],
    } as any;

    const muddyRace = {
      ...mockRace,
      weather: "rainy",
      trackCondition: "heavy",
    } as Race;

    const impact = generatePatternJumpImpact(jumpingHorse, 100, muddyRace, 10, rng);

    expect(impact).not.toBeNull();
    expect(impact?.message.title).toContain("Storm Performance");
    expect(impact?.message.body).toContain("thrived in the adverse conditions");
  });
});
