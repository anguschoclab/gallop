/**
 * tacticsSelector.test.ts - Tests for PlayerRacePrompt instructions selector
 *
 * Tests the instructions dropdown in PlayerRacePrompt to verify:
 * - Instructions are enqueued as intents before auto-resolve
 * - All instruction presets are available
 * - Selected instructions are passed to the race entry
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";

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

describe("Instructions Selector", () => {
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

  it("should enqueue instructions intent when setRaceTactics is called", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const instructions = makeInstructions(raceId, horseId);

    useGame.getState().setRaceTactics(raceId, horseId, instructions);

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );

    expect(tacticsIntent).toBeDefined();
    expect((tacticsIntent as any)?.jockeyInstructions?.ridingStyle).toBe("front_runner");
  });

  it("should support all 4 riding styles", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const styleOptions = ["front_runner", "stalker", "closer", "tactical"] as const;

    styleOptions.forEach((style) => {
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

  it("should allow updating instructions for the same horse", () => {
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
        makeInstructions(raceId, horseId, { ridingStyle: "closer" }),
      );

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntents = pendingIntents?.filter(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );

    expect(tacticsIntents?.length).toBeGreaterThanOrEqual(1);
    const latest = tacticsIntents?.[tacticsIntents.length - 1];
    expect((latest as any)?.jockeyInstructions?.ridingStyle).toBe("closer");
  });

  it("should handle multiple horses in the same race", () => {
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

  it("should handle instructions for different races independently", () => {
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
});
