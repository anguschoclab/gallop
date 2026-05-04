/**
 * Tests for auctions phase
 */

import { describe, it, expect } from "vitest";
import { auctionsPhase } from "@/core/time/phases/auctions";
import type { PipelineContext } from "../pipeline";
import type { GameState } from "@/game/types";

describe("auctionsPhase", () => {
  it("should not generate sales when no trigger day matches", () => {
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

    const result = auctionsPhase.execute(context);
    expect(result.state.auctions).toEqual([]);
  });

  it("should not generate duplicate sales for same kind", () => {
    const state: GameState = {
      day: 60,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
      awards: [],
      market: [],
      auctions: [
        {
          id: "sale-1",
          name: "Spring Weanling Sale",
          day: 60,
          kind: "weanling",
          lots: [],
          resolved: false,
        },
      ],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const context: PipelineContext = {
      previousDay: 59,
      newDay: 60,
      state,
      logs: [],
    };

    const result = auctionsPhase.execute(context);
    // Should not create duplicate sale
    expect(result.state.auctions?.length).toBe(1);
  });

  it("should prune auctions older than 30 days", () => {
    const state: GameState = {
      day: 100,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
      awards: [],
      market: [],
      auctions: [
        {
          id: "sale-1",
          name: "Old Sale",
          day: 50,
          kind: "weanling",
          lots: [],
          resolved: true,
        },
        {
          id: "sale-2",
          name: "Recent Sale",
          day: 80,
          kind: "yearling",
          lots: [],
          resolved: true,
        },
      ],
      lastCalibrationDay: 0,
      calibratedPars: {},
      paceSamples: {},
      pendingAwardCeremonies: [],
      trainingUsed: {},
      log: [],
      scoutReports: [],
    };

    const context: PipelineContext = {
      previousDay: 99,
      newDay: 100,
      state,
      logs: [],
    };

    const result = auctionsPhase.execute(context);
    // Sale from day 50 should be pruned (older than 30 days from day 100)
    expect(result.state.auctions?.length).toBe(1);
    expect(result.state.auctions?.[0].id).toBe("sale-2");
  });

  it("should have correct order", () => {
    expect(auctionsPhase.order).toBe(90);
  });

  it("should have correct name", () => {
    expect(auctionsPhase.name).toBe("auctions");
  });

  it("should preserve existing logs", () => {
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

    const result = auctionsPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 9, text: "Existing log" });
  });

  it("should handle undefined auctions gracefully", () => {
    const state: GameState = {
      day: 10,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [],
      races: [],
      awards: [],
      market: [],
      auctions: undefined,
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

    const result = auctionsPhase.execute(context);
    expect(result.state.auctions).toEqual([]);
  });
});
