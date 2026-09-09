import { describe, it, expect } from "vitest";
import { generateNpcWithdrawalIntents } from "@/core/npc/intents/claimingIntents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("NPC Weather & Track Condition Scratching", () => {
  const stable: Stable = {
    id: "stable-1",
    name: "Bluegrass Racing",
    cash: 50000,
    reputation: 60,
    personality: "conservative",
  } as any;

  const lowMudHorse: Horse = {
    id: "horse-low-mud",
    name: "Fair Weather Runner",
    energy: 90,
    mudAptitude: 0.15,
    ownership: { type: "npc", stableId: "stable-1" },
  } as any;

  const highMudHorse: Horse = {
    id: "horse-high-mud",
    name: "Mud Slogger",
    energy: 90,
    mudAptitude: 0.85,
    ownership: { type: "npc", stableId: "stable-1" },
  } as any;

  const muddyRace: Race = {
    id: "race-muddy",
    name: "Spring Stakes",
    trackCondition: "muddy",
    surface: "dirt",
    day: 20,
    entries: [
      { horseId: "horse-low-mud", ownership: { type: "npc", stableId: "stable-1" } },
      { horseId: "horse-high-mud", ownership: { type: "npc", stableId: "stable-1" } },
    ],
  } as any;

  const fastRace: Race = {
    id: "race-fast",
    name: "Sunshine Classic",
    trackCondition: "fast",
    surface: "dirt",
    day: 20,
    entries: [
      { horseId: "horse-low-mud", ownership: { type: "npc", stableId: "stable-1" } },
    ],
  } as any;

  it("scratches low-mud-aptitude horses from muddy non-claiming races", () => {
    const state: GameState = {
      ...createDefaultGameState(),
      horses: {
        [lowMudHorse.id]: lowMudHorse,
        [highMudHorse.id]: highMudHorse,
      },
    };

    const horseMap = new Map<string, Horse>([
      [lowMudHorse.id, lowMudHorse],
      [highMudHorse.id, highMudHorse],
    ]);

    const intents = generateNpcWithdrawalIntents(
      state,
      stable,
      undefined,
      20,
      [lowMudHorse, highMudHorse],
      [muddyRace],
      horseMap,
    );

    // Low-mud horse should receive a race_withdrawal intent
    const scratchedIds = intents.map((i) => i.horseId);
    expect(scratchedIds).toContain("horse-low-mud");
    // High-mud horse should NOT be scratched
    expect(scratchedIds).not.toContain("horse-high-mud");
  });

  it("does not scratch low-mud horse on fast track", () => {
    const state: GameState = {
      ...createDefaultGameState(),
      horses: { [lowMudHorse.id]: lowMudHorse },
    };

    const horseMap = new Map<string, Horse>([[lowMudHorse.id, lowMudHorse]]);

    const intents = generateNpcWithdrawalIntents(
      state,
      stable,
      undefined,
      20,
      [lowMudHorse],
      [fastRace],
      horseMap,
    );

    expect(intents.length).toBe(0);
  });
});
