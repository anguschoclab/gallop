/**
 * Tests for upkeep phase
 */

import { describe, it, expect } from "vitest";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { createRng } from "@/game/rng";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Stable } from "@/game/types";

describe("upkeepPhase", () => {
  it("should deduct $50 per player horse", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: true,
          fame: 50,
          raceHistory: [],
        }),
        createTestHorse({
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75, temperament: 50, conformation: 50 },
          potential: 80,
          energy: 100,
          form: 0,
          silk: "red",
          owned: true,
          fame: 60,
          raceHistory: [],
        }),
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
      dailyRng: createRng("test"),
    };

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(9900); // 10000 - (2 * 50)
  });

  it("should not deduct for horses with stableId (NPC horses)", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: false,
          fame: 50,
          stableId: "npc-stable-1",
          raceHistory: [],
        },
      ],
      npcStables: [
        {
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
          horses: [],
          isMajor: false,
          colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        },
      ],
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
      dailyRng: createRng("test"),
    };

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction for NPC horse
  });

  it("should deduct $50 per horse from each NPC stable", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [
        {
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 },
          potential: 75,
          energy: 100,
          form: 0,
          silk: "blue",
          owned: false,
          fame: 50,
          stableId: "npc-stable-1",
          raceHistory: [],
        },
        {
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75, temperament: 50, conformation: 50 },
          potential: 80,
          energy: 100,
          form: 0,
          silk: "red",
          owned: false,
          fame: 60,
          stableId: "npc-stable-2",
          raceHistory: [],
        },
      ],
      npcStables: [
        {
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
          horses: [],
          isMajor: false,
          colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        },
        {
          id: "npc-stable-2",
          name: "NPC Stable 2",
          cash: 3000,
          personality: "trader",
          reputation: 60,
          tier: "mid",
          owner: "Owner 2",
          founded: 1,
          horses: [],
          isMajor: false,
          colors: { primary: "#0000FF", secondary: "#FFFFFF" },
        },
      ],
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
      dailyRng: createRng("test"),
    };

    const result = upkeepPhase.execute(context);
    const updatedStable1 = result.state.npcStables.find((s) => s.id === "npc-stable-1");
    const updatedStable2 = result.state.npcStables.find((s) => s.id === "npc-stable-2");

    expect(updatedStable1?.cash).toBe(4950); // 5000 - 50
    expect(updatedStable2?.cash).toBe(2950); // 3000 - 50
  });

  it("should handle zero horses correctly", () => {
    const state: GameState = {
      day: 1,
      cash: 10000,
      horses: [],
      npcStables: [
        {
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
          horses: [],
          isMajor: false,
          colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        },
      ],
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
      dailyRng: createRng("test"),
    };

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction
    expect(result.state.npcStables[0].cash).toBe(5000); // No deduction
  });

  it("should preserve other context properties", () => {
    const state: GameState = {
      day: 1,
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
      previousDay: 0,
      newDay: 1,
      state,
      logs: [{ day: 1, text: "Existing log" }],
    };

    const result = upkeepPhase.execute(context);
    expect(result.logs).toEqual([{ day: 1, text: "Existing log" }]);
    expect(result.state.day).toBe(1);
  });
});
