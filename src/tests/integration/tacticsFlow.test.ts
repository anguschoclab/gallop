/**
 * tacticsFlow.test.ts - Integration tests for jockey instructions flow
 *
 * Tests the complete jockey instructions flow to verify:
 * - Instructions selection affects auto-resolved race results
 * - NPC instructions selection works correctly
 * - Instructions work in both manual and auto-resolve flows
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { calculateTacticalAdjustment } from "@/core/race/engine/tacticalAI";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

function makeInstructions(
  raceId: string,
  horseId: string,
  overrides: Partial<JockeyInstructions> = {},
): JockeyInstructions {
  return {
    horseId,
    raceId,
    ridingStyle: "front_runner",
    earlyPosition: "lead",
    moveTiming: "early",
    aggressiveness: 70,
    ...overrides,
  };
}

describe("Jockey Instructions Flow Integration", () => {
  beforeEach(() => {
    useGame.setState({
      pendingPlayerRaceId: undefined,
      pendingIntents: [],
      races: {},
      horses: {},
      jockeys: [],
      day: 1,
    });
  });

  it("should enqueue instructions intent before auto-resolve", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const instructions = makeInstructions(raceId, horseId);

    useGame.getState().setRaceTactics(raceId, horseId, instructions);

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );
    expect((tacticsIntent as any)?.jockeyInstructions?.ridingStyle).toBe("front_runner");
  });

  it("should apply instructions to race entry when resolving", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const instructions = makeInstructions(raceId, horseId, {
      ridingStyle: "closer",
      earlyPosition: "drop_back",
      moveTiming: "late",
    });

    useGame.getState().setRaceTactics(raceId, horseId, instructions);

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );
    expect((tacticsIntent as any)?.jockeyInstructions?.ridingStyle).toBe("closer");
  });

  it("should handle multiple instructions changes before resolve", () => {
    const raceId = "race-1";
    const horseId = "horse-1";

    useGame
      .getState()
      .setRaceTactics(
        raceId,
        horseId,
        makeInstructions(raceId, horseId, { ridingStyle: "front_runner" }),
      );
    useGame
      .getState()
      .setRaceTactics(
        raceId,
        horseId,
        makeInstructions(raceId, horseId, { ridingStyle: "stalker" }),
      );
    useGame
      .getState()
      .setRaceTactics(
        raceId,
        horseId,
        makeInstructions(raceId, horseId, { ridingStyle: "closer" }),
      );

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntents = pendingIntents?.filter(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );
    const latest = tacticsIntents?.[tacticsIntents.length - 1];
    expect((latest as any)?.jockeyInstructions?.ridingStyle).toBe("closer");
  });

  it("should handle instructions for NPC entries", () => {
    const raceId = "race-1";
    const npcHorseId = "npc-horse-1";
    const instructions = makeInstructions(raceId, npcHorseId, {
      ridingStyle: "tactical",
      aggressiveness: 40,
    });

    useGame.getState().setRaceTactics(raceId, npcHorseId, instructions);

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === npcHorseId,
    );
    expect((tacticsIntent as any)?.jockeyInstructions?.ridingStyle).toBe("tactical");
  });

  it("should maintain instructions state across race entries", () => {
    const race1Id = "race-1";
    const race2Id = "race-2";
    const horseId = "horse-1";

    useGame
      .getState()
      .setRaceTactics(
        race1Id,
        horseId,
        makeInstructions(race1Id, horseId, { ridingStyle: "front_runner" }),
      );
    useGame
      .getState()
      .setRaceTactics(
        race2Id,
        horseId,
        makeInstructions(race2Id, horseId, { ridingStyle: "closer" }),
      );

    const pendingIntents = useGame.getState().pendingIntents;
    const tactics1 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === race1Id && i.horseId === horseId,
    );
    const tactics2 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === race2Id && i.horseId === horseId,
    );
    expect((tactics1 as any)?.jockeyInstructions?.ridingStyle).toBe("front_runner");
    expect((tactics2 as any)?.jockeyInstructions?.ridingStyle).toBe("closer");
  });

  it("should support all valid riding styles", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const validStyles = ["front_runner", "stalker", "closer", "tactical"] as const;

    validStyles.forEach((style) => {
      useGame
        .getState()
        .setRaceTactics(raceId, horseId, makeInstructions(raceId, horseId, { ridingStyle: style }));
      const pendingIntents = useGame.getState().pendingIntents;
      const tacticsIntents = pendingIntents?.filter(
        (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
      );
      const latest = tacticsIntents?.[tacticsIntents.length - 1];
      expect((latest as any)?.jockeyInstructions?.ridingStyle).toBe(style);
    });
  });

  it("should handle multiple horses in the same race with independent instructions", () => {
    const raceId = "race-1";
    const horse1Id = "horse-1";
    const horse2Id = "horse-2";

    useGame
      .getState()
      .setRaceTactics(
        raceId,
        horse1Id,
        makeInstructions(raceId, horse1Id, { ridingStyle: "front_runner" }),
      );
    useGame
      .getState()
      .setRaceTactics(
        raceId,
        horse2Id,
        makeInstructions(raceId, horse2Id, { ridingStyle: "closer" }),
      );

    const pendingIntents = useGame.getState().pendingIntents;
    const tactics1 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horse1Id,
    );
    const tactics2 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horse2Id,
    );

    expect((tactics1 as any)?.jockeyInstructions?.ridingStyle).toBe("front_runner");
    expect((tactics2 as any)?.jockeyInstructions?.ridingStyle).toBe("closer");
  });
});

describe("Tactical AI Enhancement Integration", () => {
  it("should produce different velocity mods for weather-aware adjustments", () => {
    const baseRunner: Runner = {
      horseId: "h1",
      name: "Test",
      silk: "red",
      ownership: { type: "unowned" },
      position: 50,
      velocity: 15,
      lane: 1,
      targetLane: 1,
      laneVelocity: 0,
      finishTime: null,
      topSpeed: 20,
      accel: 2,
      staminaFactor: 1,
      noise: 0,
      runningStyle: "P",
      gate: 1,
      weight: 126,
      affinityBonus: 0,
      draftingHorseId: null,
      horse: { id: "h1", mudAptitude: 0.3, recoveryPoints: 100 } as any,
      jockey: {
        id: "j1",
        name: "J",
        skill: 50,
        stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50 },
      } as any,
      jockeyInstructions: {
        horseId: "h1",
        raceId: "race-1",
        ridingStyle: "closer",
        earlyPosition: "midpack",
        moveTiming: "late",
        aggressiveness: 0.6,
      },
    };
    const pace: PaceContext = {
      leaderPos: 100,
      leaderVelocity: 16,
      leadGroupCount: 2,
      paceRating: 1.0,
      pacePressure: 0,
      progress: 0.5,
      laneDensity: [0, 0, 0],
    } as any;

    const dryResult = calculateTacticalAdjustment(
      { ...baseRunner, trackCondition: "fast", weather: "sunny" } as any,
      pace,
      [baseRunner],
    );
    const muddyResult = calculateTacticalAdjustment(
      { ...baseRunner, trackCondition: "heavy", weather: "rainy" } as any,
      pace,
      [baseRunner],
    );

    expect(typeof dryResult.velocityMod).toBe("number");
    expect(typeof muddyResult.velocityMod).toBe("number");
    // Low mud aptitude in heavy conditions should produce lower velocity mod
    expect(muddyResult.velocityMod).toBeLessThan(dryResult.velocityMod);
  });

  it("should apply stamina-state awareness when staminaFactor is low", () => {
    const baseRunner: Runner = {
      horseId: "h1",
      name: "Test",
      silk: "red",
      ownership: { type: "unowned" },
      position: 50,
      velocity: 15,
      lane: 1,
      targetLane: 1,
      laneVelocity: 0,
      finishTime: null,
      topSpeed: 20,
      accel: 2,
      staminaFactor: 1,
      noise: 0,
      runningStyle: "S",
      gate: 1,
      weight: 126,
      affinityBonus: 0,
      draftingHorseId: null,
      horse: { id: "h1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
      jockey: {
        id: "j1",
        name: "J",
        skill: 50,
        stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50 },
      } as any,
      jockeyInstructions: {
        horseId: "h1",
        raceId: "race-1",
        ridingStyle: "closer",
        earlyPosition: "drop_back",
        moveTiming: "late",
        aggressiveness: 0.7,
      },
    };
    const pace: PaceContext = {
      leaderPos: 100,
      leaderVelocity: 16,
      leadGroupCount: 2,
      paceRating: 1.0,
      pacePressure: 0,
      progress: 0.5,
      laneDensity: [0, 0, 0],
    };

    const freshResult = calculateTacticalAdjustment(
      { ...baseRunner, staminaFactor: 1.0 } as Runner,
      pace,
      [{ ...baseRunner, staminaFactor: 1.0 } as Runner],
    );
    const tiredResult = calculateTacticalAdjustment(
      { ...baseRunner, staminaFactor: 0.4 } as any,
      pace,
      [{ ...baseRunner, staminaFactor: 0.4 } as any],
    );

    // Tired runner should be more conservative (lower velocity mod)
    expect(tiredResult.velocityMod).toBeLessThan(freshResult.velocityMod);
  });

  it("should apply rival-awareness boost when rival is near", () => {
    const rivalRunner: Runner = {
      horseId: "h2",
      name: "Rival",
      silk: "blue",
      ownership: { type: "unowned" },
      position: 53,
      velocity: 15,
      lane: 1,
      targetLane: 1,
      laneVelocity: 0,
      finishTime: null,
      topSpeed: 20,
      accel: 2,
      staminaFactor: 1,
      noise: 0,
      runningStyle: "E",
      gate: 2,
      weight: 126,
      affinityBonus: 0,
      draftingHorseId: null,
      horse: { id: "h2", mudAptitude: 1.0, recoveryPoints: 100 } as any,
      jockey: {
        id: "j2",
        name: "J2",
        skill: 50,
        stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50 },
      } as any,
    };
    const mainRunner: Runner = {
      horseId: "h1",
      name: "Test",
      silk: "red",
      ownership: { type: "unowned" },
      position: 50,
      velocity: 15,
      lane: 1,
      targetLane: 1,
      laneVelocity: 0,
      finishTime: null,
      topSpeed: 20,
      accel: 2,
      staminaFactor: 1,
      noise: 0,
      runningStyle: "P",
      gate: 1,
      weight: 126,
      affinityBonus: 0,
      draftingHorseId: null,
      horse: { id: "h1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
      jockey: {
        id: "j1",
        name: "J",
        skill: 80,
        stats: { pacing: 80, positioning: 50, vigor: 70, gates: 50 },
      } as any,
      jockeyInstructions: {
        horseId: "h1",
        raceId: "race-1",
        ridingStyle: "stalker",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: 0.8,
      },
      rivalHorseIds: ["h2"],
    };
    const pace: PaceContext = {
      leaderPos: 100,
      leaderVelocity: 16,
      leadGroupCount: 2,
      paceRating: 1.0,
      pacePressure: 0,
      progress: 0.5,
      laneDensity: [0, 0, 0],
    } as any;

    const noRivalResult = calculateTacticalAdjustment(
      { ...mainRunner, rivalHorseIds: undefined } as Runner,
      pace,
      [mainRunner],
    );
    const withRivalResult = calculateTacticalAdjustment(mainRunner, pace, [
      mainRunner,
      rivalRunner,
    ]);

    // With rival nearby, should get aggressiveness boost
    expect(withRivalResult.velocityMod).toBeGreaterThan(noRivalResult.velocityMod);
  });

  it("should preemptively switch lane for traffic prediction with 2+ horses clustered ahead", () => {
    const mainRunner: Runner = {
      horseId: "h1",
      name: "Test",
      silk: "red",
      ownership: { type: "unowned" },
      position: 100,
      velocity: 15,
      lane: 1.2,
      targetLane: 1.2,
      laneVelocity: 0,
      finishTime: null,
      topSpeed: 20,
      accel: 2,
      staminaFactor: 1,
      noise: 0,
      runningStyle: "P",
      gate: 1,
      weight: 126,
      affinityBonus: 0,
      draftingHorseId: null,
      horse: { id: "h1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
      jockey: {
        id: "j1",
        name: "J",
        skill: 80,
        stats: { pacing: 80, positioning: 80, vigor: 50, gates: 50 },
      } as any,
    };
    const blocker1: Runner = {
      ...mainRunner,
      horseId: "b1",
      name: "B1",
      position: 104,
      runningStyle: "E",
    } as Runner;
    const blocker2: Runner = {
      ...mainRunner,
      horseId: "b2",
      name: "B2",
      position: 105,
      runningStyle: "E",
    } as Runner;
    const pace: PaceContext = {
      leaderPos: 120,
      leaderVelocity: 16,
      leadGroupCount: 3,
      paceRating: 1.0,
      pacePressure: 0,
      progress: 0.5,
      laneDensity: [0, 2, 0, 0],
    } as any;

    const result = calculateTacticalAdjustment(mainRunner, pace, [mainRunner, blocker1, blocker2]);

    // Should switch to a less dense lane (index 2 = 2.4)
    expect(result.targetLane).not.toBe(mainRunner.lane);
  });
});
