import { describe, it, expect } from "vitest";
import {
  generateEnergyImpact,
  generateFormImpact,
  generateFameImpact,
} from "@/core/race/impacts/energyFormFame";
import { createTestHorse } from "@/tests/helpers";

describe("energyFormFame exports characterization", () => {
  it("generateEnergyImpact produces valid EnergyImpact", () => {
    const impact = generateEnergyImpact("h1", 5);
    expect(impact.type).toBe("energy_change");
    expect(impact.horseId).toBe("h1");
    expect(impact.day).toBe(5);
    expect(impact.phase).toBe("raceResolution");
    expect(typeof impact.delta).toBe("number");
    expect(impact.id).toBeTruthy();
  });

  it("generateFormImpact produces valid FormImpact with position-based delta", () => {
    const horse = createTestHorse({ id: "h1" });
    const winImpact = generateFormImpact(horse, 1, 5, []);
    const secondImpact = generateFormImpact(horse, 2, 5, []);
    const sixthImpact = generateFormImpact(horse, 6, 5, []);
    expect(winImpact.delta).toBe(3);
    expect(secondImpact.delta).toBe(2);
    expect(sixthImpact.delta).toBe(-1);
  });

  it("generateFameImpact returns null for positions > 3", () => {
    const horse = createTestHorse({ id: "h1" });
    expect(generateFameImpact(horse, 4, 5)).toBeNull();
    expect(generateFameImpact(horse, 10, 5)).toBeNull();
  });

  it("generateFameImpact returns impact for position 1", () => {
    const horse = createTestHorse({ id: "h1" });
    const impact = generateFameImpact(horse, 1, 5);
    expect(impact).not.toBeNull();
    expect(impact!.type).toBe("fame_change");
    expect(impact!.delta).toBe(2);
  });

  // ─── Mason #315: generateFanCountImpact has been removed from the module ─────
  // The function was unused dead code. This test verifies it is no longer exported.
  it("generateFanCountImpact is no longer exported from the module", async () => {
    // Importing should not include generateFanCountImpact
    const module = await import("@/core/race/impacts/energyFormFame");
    expect((module as any).generateFanCountImpact).toBeUndefined();
  });
});
