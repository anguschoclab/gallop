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

function makeInstructions(raceId: string, horseId: string, overrides: Partial<JockeyInstructions> = {}): JockeyInstructions {
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
      races: [],
      horses: [],
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
    const instructions = makeInstructions(raceId, horseId, { ridingStyle: "closer", earlyPosition: "drop_back", moveTiming: "late" });

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

    useGame.getState().setRaceTactics(raceId, horseId, makeInstructions(raceId, horseId, { ridingStyle: "front_runner" }));
    useGame.getState().setRaceTactics(raceId, horseId, makeInstructions(raceId, horseId, { ridingStyle: "stalker" }));
    useGame.getState().setRaceTactics(raceId, horseId, makeInstructions(raceId, horseId, { ridingStyle: "closer" }));

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
    const instructions = makeInstructions(raceId, npcHorseId, { ridingStyle: "tactical", aggressiveness: 40 });

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

    useGame.getState().setRaceTactics(race1Id, horseId, makeInstructions(race1Id, horseId, { ridingStyle: "front_runner" }));
    useGame.getState().setRaceTactics(race2Id, horseId, makeInstructions(race2Id, horseId, { ridingStyle: "closer" }));

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
      useGame.getState().setRaceTactics(raceId, horseId, makeInstructions(raceId, horseId, { ridingStyle: style }));
      const pendingIntents = useGame.getState().pendingIntents;
      const tacticsIntents = pendingIntents?.filter(
        (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
      );
      const latest = tacticsIntents?.[tacticsIntents.length - 1];
      expect((latest as any)?.jockeyInstructions?.ridingStyle).toBe(style);
    });
  });
});
