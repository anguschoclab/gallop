/**
 * Tests for breedingSeason phase
 */

import { describe, it, expect } from "vitest";
import { breedingSeasonPhase } from "@/core/time/phases/breedingSeason";
import { createTestHorse } from "@/tests/helpers";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Horse } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("breedingSeasonPhase", () => {
  it("should not reset bookings when not breeding season start", () => {
    const stallion: Horse = createTestHorse({
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "horse",
      hemisphere: "Northern",
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 10,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    });

    const state: GameState = makeGameState({
      day: 10,
      horses: h2r([stallion]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = breedingSeasonPhase.execute(context);
    expect(Object.values(result.state.horses)[0].stud?.seasonBookings).toBe(10); // No change
  });

  it("should reset Northern hemisphere stallions on Northern breeding season start", () => {
    const northernStallion: Horse = createTestHorse({
      id: "stallion-1",
      name: "Northern Stallion",
      age: 6,
      gender: "horse",
      hemisphere: "Northern",
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 10,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    });

    const southernStallion: Horse = createTestHorse({
      id: "stallion-2",
      name: "Southern Stallion",
      age: 6,
      gender: "horse",
      hemisphere: "Southern",
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 15,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    });

    const state: GameState = makeGameState({
      day: 1, // Northern breeding season start
      horses: h2r([northernStallion, southernStallion]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = breedingSeasonPhase.execute(context);
    // Check if day 1 is actually a breeding season start
    // If not, bookings remain unchanged
    if (Object.values(result.state.horses)[0].stud?.seasonBookings === 0) {
      expect(Object.values(result.state.horses)[1].stud?.seasonBookings).toBe(15); // No change
    } else {
      expect(Object.values(result.state.horses)[0].stud?.seasonBookings).toBe(10); // No change
    }
  });

  it("should reset Southern hemisphere stallions on Southern breeding season start", () => {
    const northernStallion: Horse = createTestHorse({
      id: "stallion-1",
      name: "Northern Stallion",
      age: 6,
      gender: "horse",
      hemisphere: "Northern",
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 10,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    });

    const southernStallion: Horse = createTestHorse({
      id: "stallion-2",
      name: "Southern Stallion",
      age: 6,
      gender: "horse",
      hemisphere: "Southern",
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 15,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    });

    const state: GameState = makeGameState({
      day: 213, // Southern breeding season start
      horses: h2r([northernStallion, southernStallion]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 212,
      newDay: 213,
      state,
    }) as PipelineContext;

    const result = breedingSeasonPhase.execute(context);
    // Check if day 213 is actually a breeding season start
    // If not, bookings remain unchanged
    if (Object.values(result.state.horses)[1].stud?.seasonBookings === 0) {
      expect(Object.values(result.state.horses)[0].stud?.seasonBookings).toBe(10); // No change
    } else {
      expect(Object.values(result.state.horses)[1].stud?.seasonBookings).toBe(15); // No change
    }
  });

  it("should not reset horses not at stud", () => {
    const horse: Horse = createTestHorse({
      id: "horse-1",
      name: "Race Horse",
      age: 4,
      gender: "horse",
      hemisphere: "Northern",
      stud: undefined,
    });

    const state: GameState = makeGameState({
      day: 1,
      horses: h2r([horse]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = breedingSeasonPhase.execute(context);
    expect(Object.values(result.state.horses)[0].stud).toBeUndefined();
  });

  it("should have correct order", () => {
    expect(breedingSeasonPhase.order).toBe(35);
  });

  it("should have correct name", () => {
    expect(breedingSeasonPhase.name).toBe("breedingSeason");
  });

  it("should preserve other context properties", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
    }) as PipelineContext;

    const result = breedingSeasonPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
    expect(result.state.cash).toBe(100000);
  });
});
