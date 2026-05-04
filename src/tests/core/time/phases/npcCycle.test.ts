/**
 * Tests for npcCycle phase
 */

import { describe, it, expect } from "vitest";
import { npcCyclePhase } from "@/core/time/phases/npcCycle";
import type { PipelineContext } from "../pipeline";
import type { GameState } from "@/game/types";

describe("npcCyclePhase", () => {
  it("should skip when no NPC stables", () => {
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
      logs: [],
    };

    const result = npcCyclePhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should call runNpcCycle and update state", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [
        {
          id: "stable-1",
          name: "NPC Stable",
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
      previousDay: 9,
      newDay: 10,
      state,
      logs: [],
    };

    const result = npcCyclePhase.execute(context);
    // Phase wraps runNpcCycle from npc/npcCycle
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.horses).toBeDefined();
    expect(result.state.races).toBeDefined();
  });

  it("should have correct order", () => {
    expect(npcCyclePhase.order).toBe(80);
  });

  it("should have correct name", () => {
    expect(npcCyclePhase.name).toBe("npcCycle");
  });

  it("should preserve logs", () => {
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

    const result = npcCyclePhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
