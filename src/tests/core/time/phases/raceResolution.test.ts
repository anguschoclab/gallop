/**
 * Tests for raceResolution phase
 */

import { describe, it, expect } from "vitest";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race } from "@/game/types";

describe("raceResolutionPhase", () => {
  it("should identify overdue races (day <= current day)", () => {
    const race1: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const race2: Race = {
      id: "race-2",
      name: "Race 2",
      day: 10,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const state: GameState = makeGameState({
      day: 10,
      races: [race1, race2],
      reputation: {
        score: 50,
        tier: "local",
        events: [],
        totalWins: 0,
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        yearsActive: 1,
      },
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = raceResolutionPhase.execute(context);
    expect(result.state.races[0].resolved).toBe(true);
    expect(result.state.races[1].resolved).toBe(true);
  });

  it("should skip already resolved races", () => {
    const race1: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
    };

    const race2: Race = {
      id: "race-2",
      name: "Race 2",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const state: GameState = makeGameState({
      day: 10,
      races: [race1, race2],
      reputation: {
        score: 50,
        tier: "local",
        events: [],
        totalWins: 0,
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        yearsActive: 1,
      },
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = raceResolutionPhase.execute(context);
    expect(result.state.races[1].resolved).toBe(true);
    expect(result.state.races[0].resolved).toBe(true);
  });

  it("should skip races in the future", () => {
    const race: Race = {
      id: "race-1",
      name: "Race 1",
      day: 20,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const state: GameState = makeGameState({
      day: 10,
      races: [race],
      reputation: {
        score: 50,
        tier: "local",
        events: [],
        totalWins: 0,
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        yearsActive: 1,
      },
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = raceResolutionPhase.execute(context);
    expect(result.state.races[0].resolved).toBe(false);
  });

  it("should skip when skipRaceResolution is true", () => {
    const race: Race = {
      id: "race-1",
      name: "Race 1",
      day: 5,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const state: GameState = makeGameState({
      day: 10,
      races: [race],
      reputation: {
        score: 50,
        tier: "local",
        events: [],
        totalWins: 0,
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        yearsActive: 1,
      },
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      skipRaceResolution: true,
    }) as PipelineContext;

    const shouldSkip = raceResolutionPhase.skipIf?.(context);
    expect(shouldSkip).toBe(true);
  });

  it("should not skip when skipRaceResolution is false or undefined", () => {
    const state: GameState = makeGameState({
      day: 10,
      horses: [{ id: "h1" } as any],
      reputation: {
        score: 50,
        tier: "local",
        events: [],
        totalWins: 0,
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        yearsActive: 1,
      },
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      skipRaceResolution: false,
    }) as PipelineContext;

    const shouldSkip = raceResolutionPhase.skipIf?.(context);
    expect(shouldSkip).toBe(false);
  });

  it("should have correct order", () => {
    expect(raceResolutionPhase.order).toBe(70);
  });

  it("should have correct name", () => {
    expect(raceResolutionPhase.name).toBe("raceResolution");
  });
});
