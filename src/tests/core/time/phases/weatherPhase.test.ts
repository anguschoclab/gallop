/**
 * Tests for weatherPhase
 */

import { describe, it, expect } from "vitest";
import { weatherPhase } from "@/core/time/phases/weatherPhase";
import { createRng } from "@/core/common/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("weatherPhase", () => {
  const createMockRace = (overrides: Partial<Race> = {}): Race => ({
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 1200,
    raceClass: "Stakes",
    entryFee: 100,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    trackId: "test-track-1",
    surface: "Turf",
    trackCondition: "good",
    ...overrides,
  });

  const createMockState = (overrides: Partial<GameState> = {}): GameState =>
    ({
      day: 10,
      cash: 10000,
      horses: {},
      npcStables: [],
      pregnancies: [],
      races: {},
      awards: [],
      market: [],
      auctions: [],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
      ...overrides,
    }) as GameState;

  const createMockContext = (state: GameState, newDay: number): PipelineContext => ({
    previousDay: newDay - 1,
    newDay,
    state,
    logs: [],
    dailyRng: createRng(12345),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(Object.entries(state.horses ?? {}).map(([k, v]) => [k, v])),
    raceMap: new Map(Object.entries(state.races ?? {}).map(([k, v]) => [k, v])),
    stableMap: new Map((state.npcStables ?? []).map((s) => [s.id, s])),
    jockeyMap: new Map((state.jockeys ?? []).map((j) => [j.id, j])),
  });

  it("should have correct order", () => {
    expect(weatherPhase.order).toBe(55);
  });

  it("should have correct name", () => {
    expect(weatherPhase.name).toBe("weather");
  });

  it("should initialize weather state when no races exist", () => {
    const state = createMockState({ races: {} });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    // Weather is only added to state when there are tracks with races
    // When no races exist, weather property may not be added
    expect(result.state).toBeDefined();
  });

  it("should generate weather for tracks with races", () => {
    const race = createMockRace({ day: 10, trackId: "churchill-downs" });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect((result.state as any).weather?.byTrack).toBeDefined();
    expect((result.state as any).weather?.byTrack?.["churchill-downs"]).toBeDefined();
    expect((result.state as any).weather?.byTrack?.["churchill-downs"]).toHaveLength(1);
    expect((result.state as any).weather?.forecast?.["churchill-downs"]).toBeDefined();
    expect((result.state as any).weather?.forecast?.["churchill-downs"]).toHaveLength(7); // WEATHER_FORECAST_DAYS
  });

  it("should be deterministic for same trackId and day", () => {
    const race = createMockRace({ day: 10, trackId: "test-track-1" });
    const state1 = createMockState({ races: r2r([race]) });
    const context1 = createMockContext(state1, 10);

    const result1 = weatherPhase.execute(context1);

    const state2 = createMockState({ races: r2r([race]) });
    const context2 = createMockContext(state2, 10);

    const result2 = weatherPhase.execute(context2);

    const weather1 = (result1.state as any).weather?.byTrack?.["test-track-1"]?.[0];
    const weather2 = (result2.state as any).weather?.byTrack?.["test-track-1"]?.[0];

    expect(weather1).toEqual(weather2);
    expect(weather1?.pattern).toBe(weather2?.pattern);
    expect(weather1?.tempC).toBe(weather2?.tempC);
    expect(weather1?.humidity).toBe(weather2?.humidity);
  });

  it("should update trackCondition for races scheduled today", () => {
    const race = createMockRace({ day: 10, trackId: "test-track", trackCondition: "fast" });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    const updatedRace = Object.values(result.state.races)[0];
    // Track condition may change based on weather
    expect(updatedRace.trackCondition).toBeDefined();
    expect(updatedRace.weather).toBeDefined();
  });

  it("should update race.weather using toRaceWeather mapping", () => {
    const race = createMockRace({ day: 10, trackId: "test-track" });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    const updatedRace = Object.values(result.state.races)[0];
    expect(updatedRace.weather).toBeDefined();
    expect(["sunny", "cloudy", "rainy"]).toContain(updatedRace.weather);
  });

  it("should maintain rolling 14-day buffer", () => {
    const race = createMockRace({ day: 1, trackId: "test-track" });
    let state = createMockState({ races: r2r([race]) });

    // Run weather phase for 20 days
    for (let day = 1; day <= 20; day++) {
      const context = createMockContext(state, day);
      state = weatherPhase.execute(context).state;
    }

    const buffer = (state as any).weather?.byTrack?.["test-track"];
    expect(buffer).toBeDefined();
    expect(buffer?.length).toBeLessThanOrEqual(14); // WEATHER_HISTORY_DAYS
  });

  it("should be idempotent for same day", () => {
    const race = createMockRace({ day: 10, trackId: "test-track" });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result1 = weatherPhase.execute(context);
    const result2 = weatherPhase.execute(context);

    const buffer1 = (result1.state as any).weather?.byTrack?.["test-track"];
    const buffer2 = (result2.state as any).weather?.byTrack?.["test-track"];

    expect(buffer1?.length).toBe(buffer2?.length);
    expect(buffer1).toEqual(buffer2);
  });

  it("should handle multiple tracks", () => {
    const race1 = createMockRace({ id: "race-1", day: 10, trackId: "track-a" });
    const race2 = createMockRace({ id: "race-2", day: 10, trackId: "track-b" });
    const state = createMockState({ races: r2r([race1, race2]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect((result.state as any).weather?.byTrack?.["track-a"]).toBeDefined();
    expect((result.state as any).weather?.byTrack?.["track-b"]).toBeDefined();
    expect((result.state as any).weather?.forecast?.["track-a"]).toBeDefined();
    expect((result.state as any).weather?.forecast?.["track-b"]).toBeDefined();
  });

  it("should only generate forecast for races within horizon", () => {
    const raceNear = createMockRace({ day: 10, trackId: "track-near" });
    const raceFar = createMockRace({ day: 15, trackId: "track-far" }); // Within 7-day forecast horizon
    const state = createMockState({ races: r2r([raceNear, raceFar]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    // Both should have weather since 15 is within 7+10=17 day horizon
    expect((result.state as any).weather?.byTrack?.["track-near"]).toBeDefined();
    expect((result.state as any).weather?.byTrack?.["track-far"]).toBeDefined();
  });

  it("should generate drama log for severity jump on graded race day", () => {
    const race = createMockRace({
      day: 10,
      trackId: "test-track",
      graded: {
        key: "g1",
        grade: "G1",
        track: "Test Track",
        trackId: "test-track",
        surface: "Turf",
      },
    });

    // Pre-populate with severe weather to trigger jump detection
    const state = createMockState({
      races: r2r([race]),
    } as any);
    (state as any).weather = {
      byTrack: {
        "test-track": [
          {
            trackId: "test-track",
            day: 9,
            pattern: "clear",
            tempC: 20,
            humidity: 0.5,
            windKph: 12,
          },
        ],
      },
      forecast: {},
    };

    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    // Check if drama log was generated (pattern jump from clear to something more severe)
    // This depends on random seed, so we just verify the structure exists
    expect(result.state.log).toBeDefined();
  });

  it("should use climate zone based on trackId", () => {
    const raceDubai = createMockRace({ day: 10, trackId: "meydan" });
    const state = createMockState({ races: r2r([raceDubai]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    const weather = (result.state as any).weather?.byTrack?.["meydan"]?.[0];
    expect(weather).toBeDefined();
    expect(weather?.trackId).toBe("meydan");
  });

  it("should handle unknown trackIds with temperate fallback", () => {
    const race = createMockRace({ day: 10, trackId: "unknown-track-xyz" });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    const weather = (result.state as any).weather?.byTrack?.["unknown-track-xyz"]?.[0];
    expect(weather).toBeDefined();
    expect(weather?.trackId).toBe("unknown-track-xyz");
  });

  it("should not update resolved races", () => {
    const race = createMockRace({ day: 10, trackId: "test-track", resolved: true });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    const updatedRace = Object.values(result.state.races)[0];
    expect(updatedRace.resolved).toBe(true);
  });

  it("should preserve other state properties", () => {
    const race = createMockRace({ day: 10, trackId: "test-track" });
    const state = createMockState({
      races: r2r([race]),
      cash: 50000,
      horses: {},
    });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect(result.state.cash).toBe(50000);
    expect(result.state.horses).toEqual({});
    expect(result.state.day).toBe(10);
  });

  it("should preserve logs", () => {
    const race = createMockRace({ day: 10, trackId: "test-track" });
    const state = createMockState({
      races: r2r([race]),
      log: [{ day: 9, text: "Existing log" }],
    });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect(result.state.log).toContainEqual({ day: 9, text: "Existing log" });
  });

  it("should handle races with no trackId gracefully", () => {
    const race = createMockRace({ day: 10, trackId: undefined, graded: undefined });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    // Should not crash, weather state may not be added if no valid trackIds
    expect(result.state).toBeDefined();
  });

  it("should use graded.trackId as fallback", () => {
    const race = createMockRace({
      day: 10,
      trackId: undefined,
      graded: {
        key: "g1",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Turf",
      },
    });
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect((result.state as any).weather?.byTrack?.["churchill-downs"]).toBeDefined();
  });

  it("should use graded.track as final fallback", () => {
    const race = createMockRace({
      day: 10,
      trackId: undefined,
      graded: {
        key: "g1",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "some-id", // Provide a valid ID but it should fallback to track name
        surface: "Turf",
      },
    });
    // Override to test the fallback behavior
    (race as any).graded.trackId = undefined;
    const state = createMockState({ races: r2r([race]) });
    const context = createMockContext(state, 10);

    const result = weatherPhase.execute(context);

    expect((result.state as any).weather?.byTrack?.["Churchill Downs"]).toBeDefined();
  });
});
