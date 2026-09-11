/**
 * Registry-order test for insight detectors.
 *
 * Verifies that the INSIGHT_DETECTORS registry preserves the original
 * priority order of getHorseInsight's conditional chain. Each detector
 * must appear in the exact position it had in the original implementation.
 */

import { describe, it, expect } from "vitest";
import { INSIGHT_DETECTORS } from "@/core/horse/insightDetectors";

describe("INSIGHT_DETECTORS registry order", () => {
  it("has exactly 16 detectors", () => {
    expect(INSIGHT_DETECTORS).toHaveLength(16);
  });

  it("preserves the original priority order", () => {
    // Match detectors by their output label to verify ordering
    const labels: string[] = [];
    for (const detector of INSIGHT_DETECTORS) {
      // Create a minimal horse that triggers each detector is hard,
      // so instead we verify the detector function names match expected order
      labels.push(detector.name);
    }

    // Expected order from the original implementation
    const expectedOrder = [
      "detectWinStreak", // 1. Red Hot
      "detectBridesmaid", // 1.1 Bridesmaid
      "detectConsistency", // 1.25 Model of Consistency
      "detectBounceCandidate", // 1.55 Regression Risk
      "detectImprovingForm", // 1.5 Trending Up
      "detectStakesPerformance", // 1.6 Big Stage Performer / Stage Fright
      "detectFreshness", // 1.7 Fires Fresh / Needs Racing
      "detectPlayStyle", // 1.8 Tactical Versatility / Catch Me If You Can
      "detectClosingKick", // 1.9 Closing Kick
      "detectLateBloomer", // 1.91 Late Bloomer
      "detectFromTheClouds", // 1.92 From the Clouds
      "detectLateCharge", // 1.925 Late Charge
      "detectSurfaceVersatility", // 1.93 Surface Versatility
      "detectDistanceSpecialist", // 2. Distance Specialist
      "detectSurfaceAffinity", // 3. Surface Affinity
      "detectDistanceVersatility", // 1.94 Distance Versatility
    ];

    expect(labels).toEqual(expectedOrder);
  });

  it("every detector returns null for a horse with empty history", () => {
    const emptyHorse = { raceHistory: [] } as never;
    for (const detector of INSIGHT_DETECTORS) {
      expect(detector(emptyHorse)).toBeNull();
    }
  });

  it("every detector returns null for a horse with < 3 starts", () => {
    const youngHorse = {
      raceHistory: [
        { position: 1, day: 1, beyer: 80 },
        { position: 2, day: 10, beyer: 75 },
      ],
    } as never;
    for (const detector of INSIGHT_DETECTORS) {
      expect(detector(youngHorse)).toBeNull();
    }
  });
});
