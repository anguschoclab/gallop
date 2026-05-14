import { describe, it, expect } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
import { createRng } from "@/game/rng";
import type { Horse, Race, Stable, Jockey } from "@/game/types";

describe("Simulation Determinism", () => {
  it("should produce identical outputs given the same seed for runNpcCycle", () => {
    const seed = "test-seed-123";
    const currentDay = 100;

    const mockStables: Stable[] = [
      {
        id: "stable-1",
        name: "Rival Stable",
        region: "Kentucky",
        reputation: 600,
        cash: 100000,
        personality: "aggressive",
      } as Stable,
    ];

    const mockHorses: Horse[] = [
      { id: "horse-1", name: "Star Runner", fame: 50, stableId: "stable-1" } as Horse,
    ];

    const mockRaces: Race[] = [
      {
        id: "race-1",
        name: "Bluegrass Stakes",
        day: currentDay,
        resolved: true,
        result: [{ horseId: "horse-1", position: 1, time: 120 }],
        entries: [{ horseId: "horse-1", stableId: "stable-1", owned: false }],
        purse: 500000,
        graded: { grade: "G1" },
      } as Race,
    ];

    const runSim = () => {
      const rng = createRng(seed);
      return runNpcCycle(
        mockStables,
        [...mockHorses],
        [],
        [...mockRaces],
        currentDay,
        rng,
      );
    };

    const result1 = runSim();
    const result2 = runSim();

    // Check reputation events
    expect(result1.reputationEvents).toHaveLength(result2.reputationEvents!.length);
    if (result1.reputationEvents && result1.reputationEvents.length > 0) {
      expect(result1.reputationEvents[0].id).toBe(result2.reputationEvents![0].id);
      expect(result1.reputationEvents[0].description).toBe(result2.reputationEvents![0].description);
    }

    // Check news items
    expect(result1.newsItems).toHaveLength(result2.newsItems!.length);
    if (result1.newsItems && result1.newsItems.length > 0) {
      expect(result1.newsItems[0].headline).toBe(result2.newsItems![0].headline);
      expect(result1.newsItems[0].id).toBe(result2.newsItems![0].id);
    }

    // Deep equality of the entire output
    expect(result1).toEqual(result2);
  });
});
