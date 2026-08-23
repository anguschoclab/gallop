import { describe, it, expect, vi } from "vitest";
import { createInitialState } from "@/game/store/initialization";
import type { NewGameOptions } from "@/game/store/state";

describe("createInitialState progress callback", () => {
  it("invokes progressCallback with stage numbers 1..N", () => {
    const callback = vi.fn();
    const options: NewGameOptions = {
      profile: {
        stableName: "Test Stable",
        ownerName: "Test Owner",
        silk: { primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff", pattern: "solid" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "Wealthy Heir",
        blurb: "Test",
        horses: [{ tier: "starter", count: 2 }],
        facilityUpgrades: {},
        facilities: {},
        startingCash: 50000,
        reputationScore: 0,
        reputation: 0,
        difficulty: "easy",
      },
      worldSize: "small",
    };

    createInitialState(options, callback);

    expect(callback).toHaveBeenCalled();
    const calls = callback.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Each call should have (stage, totalStages, stageName)
    for (const call of calls) {
      expect(call[0]).toBeGreaterThan(0);
      expect(call[1]).toBeGreaterThan(0);
      expect(typeof call[2]).toBe("string");
      expect(call[0]).toBeLessThanOrEqual(call[1]);
    }

    // First call should be stage 1
    expect(calls[0][0]).toBe(1);
    // Last call should be the total
    expect(calls[calls.length - 1][0]).toBe(calls[calls.length - 1][1]);
  });

  it("progressCallback receives meaningful stage names", () => {
    const callback = vi.fn();
    const options: NewGameOptions = {
      profile: {
        stableName: "Test",
        ownerName: "Owner",
        silk: { primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff", pattern: "solid" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "Wealthy Heir",
        blurb: "Test",
        horses: [{ tier: "starter", count: 2 }],
        facilityUpgrades: {},
        facilities: {},
        startingCash: 50000,
        reputationScore: 0,
        reputation: 0,
        difficulty: "easy",
      },
      worldSize: "small",
    };

    createInitialState(options, callback);

    const stageNames = callback.mock.calls.map((c) => c[2] as string);
    expect(stageNames.length).toBeGreaterThan(0);
    // At least one stage should mention "horse" or "race" or "stable"
    const hasMeaningfulName = stageNames.some(
      (name) => name.length > 0 && /horse|race|stable|jockey|facilit|gazette|ai|npc/i.test(name),
    );
    expect(hasMeaningfulName).toBe(true);
  });

  it("works without progressCallback (backward compatible)", () => {
    const options: NewGameOptions = {
      profile: {
        stableName: "Test",
        ownerName: "Owner",
        silk: { primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff", pattern: "solid" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "Wealthy Heir",
        blurb: "Test",
        horses: [{ tier: "starter", count: 2 }],
        facilityUpgrades: {},
        facilities: {},
        startingCash: 50000,
        reputationScore: 0,
        reputation: 0,
        difficulty: "easy",
      },
      worldSize: "small",
    };

    expect(() => createInitialState(options)).not.toThrow();
  });
});
