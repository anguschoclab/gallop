/**
 * Tests for the consolidated prep race selection helper.
 *
 * Verifies that selectPrepRace (the canonical implementation in campaignTargeting)
 * produces correct results for the scoring logic that was previously duplicated
 * in campaignRecording's selectPrepRaceForCoordination.
 */

import { describe, it, expect } from "vitest";
import { selectPrepRace } from "@/core/ai/campaignTargeting";
import { GRADED_RACES_BY_KEY } from "@/data/gradedRaces";
import type { GradedRace } from "@/data/gradedRaces";

const targetKey = "woodbine-mile";
const targetRace = GRADED_RACES_BY_KEY.get(targetKey)!;
const targetDay = targetRace.dayOfYear;

const upcomingRaces: GradedRace[] = [
  {
    key: "prep1",
    name: "Prep 1",
    dayOfYear: targetDay - 20,
    distance: 1600,
    surface: "Turf",
    grade: "G3",
  } as GradedRace,
  {
    key: "prep2",
    name: "Prep 2",
    dayOfYear: targetDay - 15,
    distance: 1800,
    surface: "Dirt",
    grade: "G2",
  } as GradedRace,
  {
    key: "prep3",
    name: "Prep 3",
    dayOfYear: targetDay - 50,
    distance: 1600,
    surface: "Turf",
    grade: "G3",
  } as GradedRace,
];

describe("selectPrepRace", () => {
  it("returns null when target race key is not found", () => {
    const result = selectPrepRace({} as never, "nonexistent", upcomingRaces, targetDay - 30);
    expect(result).toBeNull();
  });

  it("returns null when no upcoming races", () => {
    const result = selectPrepRace({} as never, targetKey, [], targetDay - 30);
    expect(result).toBeNull();
  });

  it("skips the target race itself", () => {
    const result = selectPrepRace({} as never, targetKey, [targetRace], targetDay - 30);
    expect(result).toBeNull();
  });

  it("selects the best-scoring prep race", () => {
    const result = selectPrepRace({} as never, targetKey, upcomingRaces, targetDay - 30);
    // prep1: dayDiff=20 (in range), same surface (+15), same distance (+20), weeksToTarget~2.85 (+15), G3 (+10) = 110
    // prep2: dayDiff=15 (in range), different surface, distance diff 200 (+10), weeksToTarget~2.14 (+15), G2 (+5) = 80
    // prep3: dayDiff=-20 (< 7, skipped)
    expect(result).toBe("prep1");
  });

  it("skips races too close (< 7 days from current day)", () => {
    const closeRace: GradedRace = {
      key: "close",
      name: "Close",
      dayOfYear: targetDay - 25, // only 5 days from currentDay (targetDay - 30)
      distance: 1600,
      surface: "Turf",
      grade: "G3",
    } as GradedRace;
    const result = selectPrepRace({} as never, targetKey, [closeRace], targetDay - 30);
    expect(result).toBeNull();
  });

  it("skips races too far (> 42 days from current day)", () => {
    const farRace: GradedRace = {
      key: "far",
      name: "Far",
      dayOfYear: targetDay + 20, // 50 days from currentDay (targetDay - 30)
      distance: 1600,
      surface: "Turf",
      grade: "G3",
    } as GradedRace;
    const result = selectPrepRace({} as never, targetKey, [farRace], targetDay - 30);
    expect(result).toBeNull();
  });
});
