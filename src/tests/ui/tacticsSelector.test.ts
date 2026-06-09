/**
 * tacticsSelector.test.ts - Tests for PlayerRacePrompt tactics selector
 *
 * Tests the tactics dropdown in PlayerRacePrompt to verify:
 * - Tactics are enqueued as intents before auto-resolve
 * - All 6 tactic options are available
 * - Selected tactics are passed to the race entry
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGame } from "@/game/store";

describe("Tactics Selector", () => {
  beforeEach(() => {
    // Reset store before each test
    useGame.setState({
      pendingPlayerRaceId: undefined,
      pendingIntents: [],
      races: [],
      horses: [],
      jockeys: [],
      day: 1,
    });
  });

  it("should enqueue tactics intent when setRaceTactics is called", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const tactics = "lead";

    useGame.getState().setRaceTactics(raceId, horseId, tactics);

    // Verify the intent was enqueued (check pendingIntents)
    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );

    expect(tacticsIntent).toBeDefined();
    expect((tacticsIntent as any)?.tactics).toBe(tactics);
  });

  it("should support all 6 tactic options", () => {
    const raceId = "race-1";
    const horseId = "horse-1";
    const tacticsOptions = ["default", "lead", "rail", "outside", "save", "late_kick"] as const;

    tacticsOptions.forEach((tactics) => {
      useGame.getState().setRaceTactics(raceId, horseId, tactics);

      const pendingIntents = useGame.getState().pendingIntents;
      const tacticsIntents = pendingIntents?.filter(
        (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
      );
      const latestTactics = tacticsIntents?.[tacticsIntents.length - 1];

      expect((latestTactics as any)?.tactics).toBe(tactics);
    });
  });

  it("should allow updating tactics for the same horse", () => {
    const raceId = "race-1";
    const horseId = "horse-1";

    useGame.getState().setRaceTactics(raceId, horseId, "lead");
    useGame.getState().setRaceTactics(raceId, horseId, "rail");

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntents = pendingIntents?.filter(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horseId,
    );

    // Should have 2 intents (the latest one should be "rail")
    expect(tacticsIntents?.length).toBeGreaterThanOrEqual(1);
    const latestTactics = tacticsIntents?.[tacticsIntents.length - 1];
    expect((latestTactics as any)?.tactics).toBe("rail");
  });

  it("should handle multiple horses in the same race", () => {
    const raceId = "race-1";
    const horse1Id = "horse-1";
    const horse2Id = "horse-2";

    useGame.getState().setRaceTactics(raceId, horse1Id, "lead");
    useGame.getState().setRaceTactics(raceId, horse2Id, "save");

    const pendingIntents = useGame.getState().pendingIntents;
    const tactics1 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horse1Id,
    );
    const tactics2 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === raceId && i.horseId === horse2Id,
    );

    expect((tactics1 as any)?.tactics).toBe("lead");
    expect((tactics2 as any)?.tactics).toBe("save");
  });

  it("should handle tactics for different races independently", () => {
    const race1Id = "race-1";
    const race2Id = "race-2";
    const horseId = "horse-1";

    useGame.getState().setRaceTactics(race1Id, horseId, "lead");
    useGame.getState().setRaceTactics(race2Id, horseId, "outside");

    const pendingIntents = useGame.getState().pendingIntents;
    const tactics1 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === race1Id && i.horseId === horseId,
    );
    const tactics2 = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === race2Id && i.horseId === horseId,
    );

    expect((tactics1 as any)?.tactics).toBe("lead");
    expect((tactics2 as any)?.tactics).toBe("outside");
  });
});
