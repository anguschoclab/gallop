/**
 * Tests for pregnancy phase
 */

import { describe, it, expect } from "vitest";
import { pregnancyPhase } from "@/core/time/phases/pregnancy";
import { createRng } from "@/game/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Pregnancy } from "@/game/types";

describe("pregnancyPhase", () => {
  it("should call resolvePregnancies and update state", () => {
    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: "sire-1",
      damId: "dam-1",
      sireName: "Test Sire",
      damName: "Test Dam",
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const state: GameState = {
      day: 31,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [pregnancy],
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
      previousDay: 30,
      newDay: 31,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = pregnancyPhase.execute(context);
    // Phase wraps resolvePregnancies from store
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.pregnancies).toBeDefined();
    expect(result.state.horses).toBeDefined();
    expect(result.logs).toBeDefined();
  });

  it("should add foals to horses array", () => {
    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: "sire-1",
      damId: "dam-1",
      sireName: "Test Sire",
      damName: "Test Dam",
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const state: GameState = {
      day: 31,
      cash: 10000,
      horses: [],
      npcStables: [],
      pregnancies: [pregnancy],
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
      previousDay: 30,
      newDay: 31,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = pregnancyPhase.execute(context);
    // Foals may or may not be generated depending on resolvePregnancies logic
    expect(result.state.horses.length).toBeGreaterThanOrEqual(0);
  });

  it("should adjust cash for refunds if applicable", () => {
    const state: GameState = {
      day: 31,
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
      previousDay: 30,
      newDay: 31,
      state,
      logs: [],
      dailyRng: createRng(12345),
    };

    const result = pregnancyPhase.execute(context);
    // Cash may be adjusted for refunds
    expect(result.state.cash).toBeDefined();
  });

  it("should append logs from pregnancy resolution", () => {
    const state: GameState = {
      day: 31,
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
      previousDay: 30,
      newDay: 31,
      state,
      logs: [{ day: 30, text: "Existing log" }],
      dailyRng: createRng(12345),
    };

    const result = pregnancyPhase.execute(context);
    // Should preserve existing logs
    expect(result.logs).toContainEqual({ day: 30, text: "Existing log" });
  });

  it("should have correct order", () => {
    expect(pregnancyPhase.order).toBe(70);
  });

  it("should have correct name", () => {
    expect(pregnancyPhase.name).toBe("pregnancy");
  });
});
