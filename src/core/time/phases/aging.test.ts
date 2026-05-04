/**
 * Tests for aging phase
 */

import { describe, it, expect } from "vitest";
import { agingPhase } from "./aging";
import type { PipelineContext } from "../pipeline";
import type { GameState } from "@/game/types";

describe("agingPhase", () => {
  it("should not age horses when not a universal birthday", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 2,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(2); // No change
  });

  it("should age Northern hemisphere horses on Jan 1 (day 1)", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 2,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
        {
          id: "horse-2",
          name: "Horse 2",
          age: 3,
          gender: "filly",
          hemisphere: "Southern",
          stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75 },
          potential: 80,
          energy: 100,
          form: 0,
          silk: "red",
          owned: true,
          fame: 60,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3); // Northern horse aged
    expect(result.state.horses[1].age).toBe(3); // Southern horse not aged
  });

  it("should age Southern hemisphere horses on Aug 1 (day 213)", () => {
    const state: GameState = {
      day: 213,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 2,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
        {
          id: "horse-2",
          name: "Horse 2",
          age: 3,
          gender: "filly",
          hemisphere: "Southern",
          stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75 },
          potential: 80,
          energy: 100,
          form: 0,
          silk: "red",
          owned: true,
          fame: 60,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 212,
      newDay: 213,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(2); // Northern horse not aged
    expect(result.state.horses[1].age).toBe(4); // Southern horse aged
  });

  it("should convert colt to horse at age 3", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 2,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3);
    expect(result.state.horses[0].gender).toBe("horse");
  });

  it("should convert filly to mare at age 3", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 2,
          gender: "filly",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3);
    expect(result.state.horses[0].gender).toBe("mare");
  });

  it("should not change gender if already horse/mare", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 4,
          gender: "horse",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        },
      ],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state,
      logs: [],
    };

    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(5);
    expect(result.state.horses[0].gender).toBe("horse");
  });

  it("should preserve other context properties", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
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
    };

    const context: PipelineContext = {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
    };

    const result = agingPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
    expect(result.state.cash).toBe(10000);
  });
});
