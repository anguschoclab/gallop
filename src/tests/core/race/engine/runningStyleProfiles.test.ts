import { describe, it, expect } from "vitest";
import {
  getDynamicProfile,
  RUNNING_STYLE_PROFILES,
  getRunningStyleProfile,
} from "@/core/race/engine/runningStyleProfiles";
import type { RunningStyle } from "@/core/horse/types";

describe("runningStyleProfiles", () => {
  describe("getRunningStyleProfile (static)", () => {
    it.each(["E", "EP", "P", "S"] as RunningStyle[])(
      "returns static profile for style %s",
      (style) => {
        const profile = getRunningStyleProfile(style);
        expect(profile).toBe(RUNNING_STYLE_PROFILES[style]);
      },
    );
  });

  describe("getDynamicProfile", () => {
    const baseHorse = { stats: { acceleration: 80 }, recoveryPoints: 100 } as any;
    const baseJockey = { stats: { vigor: 80 } } as any;

    it("returns base profile values when pace is normal and field is average", () => {
      const profile = getDynamicProfile("P", 1.0, 12, 0.5, baseHorse, baseJockey);
      const staticProfile = getRunningStyleProfile("P");
      expect(profile.preferredFieldFraction).toBeCloseTo(staticProfile.preferredFieldFraction, 2);
    });

    it("shifts front-runners further forward on slow pace", () => {
      const slowPace = getDynamicProfile("E", 0.8, 12, 0.3, baseHorse, baseJockey);
      const normalPace = getDynamicProfile("E", 1.0, 12, 0.3, baseHorse, baseJockey);
      expect(slowPace.preferredFieldFraction).toBeLessThan(normalPace.preferredFieldFraction);
    });

    it("shifts closers further back on fast pace", () => {
      const fastPace = getDynamicProfile("S", 1.2, 12, 0.3, baseHorse, baseJockey);
      const normalPace = getDynamicProfile("S", 1.0, 12, 0.3, baseHorse, baseJockey);
      expect(fastPace.preferredFieldFraction).toBeGreaterThan(normalPace.preferredFieldFraction);
    });

    it("shifts all styles toward midpack in large fields (>14)", () => {
      const largeField = getDynamicProfile("E", 1.0, 16, 0.3, baseHorse, baseJockey);
      const normalField = getDynamicProfile("E", 1.0, 8, 0.3, baseHorse, baseJockey);
      expect(largeField.preferredFieldFraction).toBeGreaterThan(normalField.preferredFieldFraction);
    });

    it("shifts closers forward in late race (progress > 0.7)", () => {
      const lateRace = getDynamicProfile("S", 1.0, 12, 0.8, baseHorse, baseJockey);
      const earlyRace = getDynamicProfile("S", 1.0, 12, 0.2, baseHorse, baseJockey);
      expect(lateRace.preferredFieldFraction).toBeLessThan(earlyRace.preferredFieldFraction);
    });

    it("scales spurtBuildupExtra by horse acceleration and jockey vigor", () => {
      const highAccel = getDynamicProfile(
        "P",
        1.0,
        12,
        0.5,
        { stats: { acceleration: 100 } } as any,
        { stats: { vigor: 100 } } as any,
      );
      const lowAccel = getDynamicProfile(
        "P",
        1.0,
        12,
        0.5,
        { stats: { acceleration: 20 } } as any,
        { stats: { vigor: 20 } } as any,
      );
      expect(highAccel.spurtBuildupExtra).toBeGreaterThan(lowAccel.spurtBuildupExtra);
    });

    it("reduces seekMaxBoost by 50% when recoveryPoints < 50", () => {
      const fatigued = getDynamicProfile(
        "E",
        1.0,
        12,
        0.3,
        { stats: { acceleration: 80 }, recoveryPoints: 30 } as any,
        baseJockey,
      );
      const fresh = getDynamicProfile(
        "E",
        1.0,
        12,
        0.3,
        { stats: { acceleration: 80 }, recoveryPoints: 100 } as any,
        baseJockey,
      );
      expect(fatigued.seekMaxBoost).toBeLessThan(fresh.seekMaxBoost);
      expect(fatigued.seekMaxBoost).toBeCloseTo(fresh.seekMaxBoost * 0.5, 5);
    });

    it("does not reduce seekMaxBoost when recoveryPoints >= 50", () => {
      const profile = getDynamicProfile(
        "E",
        1.0,
        12,
        0.3,
        { stats: { acceleration: 80 }, recoveryPoints: 60 } as any,
        baseJockey,
      );
      const staticProfile = getRunningStyleProfile("E");
      expect(profile.seekMaxBoost).toBe(staticProfile.seekMaxBoost);
    });

    it("handles missing horse/jockey stats gracefully", () => {
      const profile = getDynamicProfile("P", 1.0, 12, 0.5, undefined, undefined);
      const staticProfile = getRunningStyleProfile("P");
      // spurtBuildupExtra should equal base (no bonus from accel/vigor)
      expect(profile.spurtBuildupExtra).toBe(staticProfile.spurtBuildupExtra);
    });
  });
});
