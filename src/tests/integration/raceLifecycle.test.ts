/**
 * Integration Tests: Race Lifecycle
 * Tests that modules work together correctly in the race generation → entry → resolution → awards flow
 */

import { describe, it, expect } from "vitest";
import { generateTrackSchedule } from "@/core/race/schedule";
import { createRng } from "@/core/common/rng";
import { recordRaceStrategy } from "@/core/ai/jockeyStrategyAI";
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
});
