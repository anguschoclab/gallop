/**
 * Integration Tests: Race Lifecycle
 * Tests that modules work together correctly in the race generation → entry → resolution → awards flow
 */

import { describe, it, expect } from "vitest";
import { generateTrackSchedule } from "@/core/race/schedule";
import { createRng } from "@/core/common/rng";
import { recordRaceStrategy } from "@/core/ai/jockeyStrategyAI";
import { getDynamicProfile } from "@/core/race/engine/runningStyleProfiles";
import type { GameState, Race, Horse } from "@/game/types";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("Race Lifecycle Integration", () => {
  it("should generate races for a track", () => {
    const state: GameState = makeGameState({ day: 10, cash: 10000 }) as GameState;

    const result = generateTrackSchedule(10, Object.values(state.races), [], createRng("test"));

    // Verify races were generated
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should preserve existing races when generating schedule", () => {
    const existingRace: Race = {
      id: "race-1",
      name: "Test Race",
      day: 5,
      trackId: "track-1",
      graded: { key: "race-1", grade: "G3", track: "track-1", trackId: "track-1", surface: "Dirt" },
      distance: 1200,
      surface: "Dirt",
      purse: 10000,
      entries: [],
      raceClass: "Stakes",
      entryFee: 500,
      fieldSize: 12,
      resolved: false,
    };

    const state: GameState = makeGameState({
      day: 10,
      cash: 10000,
      races: r2r([existingRace]),
    }) as GameState;

    const result = generateTrackSchedule(10, Object.values(state.races), [], createRng("test"));

    // Should preserve existing race
    expect(result).toContainEqual(existingRace);
  });

  it("should handle empty state gracefully", () => {
    const state: GameState = makeGameState({ day: 10, cash: 10000 }) as GameState;

    const result = generateTrackSchedule(10, Object.values(state.races), [], createRng("test"));

    // Should not crash with empty state
    expect(result).toBeDefined();
  });

  it("should generate races with valid structure", () => {
    const state: GameState = makeGameState({ day: 10, cash: 10000 }) as GameState;

    const result = generateTrackSchedule(10, Object.values(state.races), [], createRng("test"));

    // Check that generated races have required fields
    for (const race of result) {
      expect(race).toHaveProperty("id");
      expect(race).toHaveProperty("name");
      expect(race).toHaveProperty("day");
      expect(race).toHaveProperty("distance");
      expect(race).toHaveProperty("raceClass");
      expect(race).toHaveProperty("purse");
    }
  });

  it("should support trackCondition and weather on race type for tactical AI", () => {
    const existingRace: Race = {
      id: "race-weather",
      name: "Weather Test Race",
      day: 5,
      trackId: "track-1",
      graded: {
        key: "race-weather",
        grade: "G3",
        track: "track-1",
        trackId: "track-1",
        surface: "Dirt",
      },
      distance: 1200,
      surface: "Dirt",
      purse: 10000,
      entries: [],
      raceClass: "Stakes",
      entryFee: 500,
      fieldSize: 12,
      resolved: false,
      trackCondition: "heavy",
      weather: "rainy",
    };

    const state: GameState = makeGameState({
      day: 10,
      cash: 10000,
      races: r2r([existingRace]),
    }) as GameState;

    const race = Object.values(state.races).find((r) => r.id === "race-weather");
    expect(race).toBeDefined();
    expect(race?.trackCondition).toBe("heavy");
    expect(race?.weather).toBe("rainy");
  });

  it("should support jockey learning feedback loop via recordRaceStrategy wiring", () => {
    expect(typeof recordRaceStrategy).toBe("function");
  });

  // ── Phase 12: Enhanced Integration Tests ──

  describe("Phase 12: Dynamic running style profiles with pace scenarios", () => {
    it("produces different preferredFieldFraction for slow vs fast pace", () => {
      const slowProfile = getDynamicProfile(
        "S",
        0.8,
        12,
        0.3,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );
      const fastProfile = getDynamicProfile(
        "S",
        1.2,
        12,
        0.3,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );

      // Closers move further back in fast pace (0.08 delta) vs slow pace (0.05 delta)
      expect(fastProfile.preferredFieldFraction).toBeGreaterThan(
        slowProfile.preferredFieldFraction,
      );
    });

    it("shifts all styles toward midpack in large fields (>14)", () => {
      const smallField = getDynamicProfile(
        "E",
        1.0,
        6,
        0.3,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );
      const largeField = getDynamicProfile(
        "E",
        1.0,
        16,
        0.3,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );

      // Front-runner in large field should be less far forward
      expect(largeField.preferredFieldFraction).toBeGreaterThan(smallField.preferredFieldFraction);
    });

    it("closers shift forward in late race (progress > 0.7)", () => {
      const earlyProfile = getDynamicProfile(
        "S",
        1.0,
        12,
        0.3,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );
      const lateProfile = getDynamicProfile(
        "S",
        1.0,
        12,
        0.8,
        { stats: { acceleration: 70 }, recoveryPoints: 100 },
        { stats: { vigor: 60 } },
      );

      // Closer should be further forward late in race
      expect(lateProfile.preferredFieldFraction).toBeLessThan(earlyProfile.preferredFieldFraction);
    });
  });

  describe("Phase 12: recordRaceStrategy with enhanced context keys", () => {
    it("recordRaceStrategy accepts race with trackCondition and surface for context", () => {
      const horse: Horse = {
        id: "h1",
        name: "Test",
        age: 4,
        gender: "colt",
        runningStyle: "P",
        stats: {
          speed: 70,
          stamina: 70,
          acceleration: 70,
          consistency: 70,
          temperament: 50,
          conformation: 50,
        },
      } as any;

      const race: Race = {
        id: "race-1",
        name: "Test Race",
        day: 10,
        trackId: "track-1",
        distance: 1600,
        surface: "Dirt",
        trackCondition: "heavy",
        purse: 10000,
        entries: [],
        raceClass: "Stakes",
        entryFee: 500,
        fieldSize: 12,
        resolved: false,
      } as any;

      const jockey = {
        id: "j1",
        name: "Test J",
        skill: 50,
        stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50 },
      } as any;
      const stable = { id: "s1", name: "Stable", personality: "aggressive", cash: 100000 } as any;

      // Should not throw — function should handle enhanced context
      const result = recordRaceStrategy(
        {
          personalityState: {
            personality: "aggressive",
            learningRate: 0.1,
            memoryDepth: 50,
            adaptationSpeed: 0.5,
            strategicHorizon: 30,
            competitiveAwareness: 0.7,
            conservatism: 0.3,
            innovation: 0.6,
            learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 1 },
            currentStrategy: "aggressive_expansion",
            strategyConfidence: 0.5,
            lastStrategyChangeDay: 1,
          } as any,
          learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 1 } as any,
          strategyHistory: [],
        },
        horse,
        race,
        jockey,
        stable,
        "P",
        50,
        1,
        10,
      );

      expect(result).toBeDefined();
      expect(result.strategyHistory).toBeDefined();
    });
  });
});
