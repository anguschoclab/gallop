import { describe, it, expect } from "vitest";
import { detectDistanceChange } from "@/domains/horse/simulation/insightDetectors";
import type { Horse, HorseRaceHistoryEntry } from "@/domains/horse/simulation/types";

describe("detectDistanceChange", () => {
  const createHorse = (history: Partial<HorseRaceHistoryEntry>[]): Horse => {
    return { raceHistory: history as HorseRaceHistoryEntry[] } as Horse;
  };

  it("returns null for empty history", () => {
    expect(detectDistanceChange(createHorse([]))).toBeNull();
  });

  it("detects Stretch-Out Specialist", () => {
    const horse = createHorse([
      { distance: 1000, position: 5 } as any,
      { distance: 1200, position: 1 } as any, // Stretch out 200m
      { distance: 1200, position: 2 } as any,
      { distance: 1600, position: 1 } as any, // Stretch out 400m
    ]);
    const insight = detectDistanceChange(horse);
    expect(insight?.label).toBe("Stretch-Out Specialist");
  });

  it("detects Cutback Specialist", () => {
    const horse = createHorse([
      { distance: 1600, position: 5 } as any,
      { distance: 1200, position: 1 } as any, // Cutback 400m
      { distance: 1200, position: 2 } as any,
      { distance: 1000, position: 1 } as any, // Cutback 200m
    ]);
    const insight = detectDistanceChange(horse);
    expect(insight?.label).toBe("Cutback Specialist");
  });
});
