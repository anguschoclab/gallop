/**
 * Integration tests for rivalry escalation news generation in npcCycle.
 *
 * Verifies that generateRivalryEscalationNews is triggered when friction
 * crosses the 80 threshold during grudge matches and regional dominance.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
import { createRng } from "@/core/common/rng";
import type { Horse, Race, Stable, Jockey } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestHorse, createTestStable } from "@/tests/helpers";

const DAY = 100;
const REGION = "North America (East)";

function makeBaseAIState(stableId: string, friction: number): StableAIState {
  return {
    stableId,
    personalityState: { archetype: "aggressive", aggression: 0.8 } as any,
    learningState: { outcomes: [], successRates: {} } as any,
    lastUpdateDay: DAY,
    friction,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
  };
}

function makeAIManager(
  stableStates: Record<string, StableAIState>,
  regionalKings: Record<string, string> = {},
): NpcAIManager {
  return {
    stableStates,
    globalDay: DAY,
    regionalKings,
  };
}

describe("npcCycle — rivalry escalation news (grudge match path)", () => {
  let npcStable: Stable;
  let playerHorse: Horse;
  let rivalHorse: Horse;
  let race: Race;

  beforeEach(() => {
    npcStable = createTestStable({
      id: "rival-stable",
      name: "Bitter Creek Stables",
      personality: "aggressive",
    });

    playerHorse = createTestHorse({
      id: "player-horse",
      name: "Lightning Bolt",
      ownership: { type: "player" },
    });

    rivalHorse = createTestHorse({
      id: "rival-horse",
      name: "Dark Thunder",
      ownership: { type: "npc", stableId: asNpcStableId("rival-stable") },
    });

    race = {
      id: "race-1",
      name: "Grand Stakes",
      day: DAY,
      distance: 2000,
      raceClass: "Stakes",
      entryFee: 500,
      purse: 50000,
      fieldSize: 8,
      entries: [
        { horseId: "player-horse", ownership: { type: "player" } } as any,
        { horseId: "rival-horse", ownership: { type: "npc", stableId: asNpcStableId("rival-stable") } } as any,
      ],
      resolved: true,
      result: [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse", position: 2, time: 121 },
      ],
      graded: { grade: "G1" },
    } as Race;
  });

  it("generates escalation news when friction crosses 80 in grudge match (player win)", () => {
    const aiManager = makeAIManager({
      "rival-stable": makeBaseAIState("rival-stable", 75),
    });

    const rng = createRng("esc-grudge-win");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse, rivalHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const escalationNews = result.newsItems?.find(
      (n) =>
        n.category === "stable" &&
        n.importance === "high" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    expect(escalationNews).toBeDefined();
    expect(escalationNews!.entityLinks).toEqual([
      { type: "stable", id: "rival-stable", name: "Bitter Creek Stables" },
    ]);
  });

  it("generates escalation news when friction crosses 80 in grudge match (player loss)", () => {
    race.result = [
      { horseId: "rival-horse", position: 1, time: 120 },
      { horseId: "player-horse", position: 2, time: 121 },
    ];

    const aiManager = makeAIManager({
      "rival-stable": makeBaseAIState("rival-stable", 70),
    });

    const rng = createRng("esc-grudge-loss");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse, rivalHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const escalationNews = result.newsItems?.find(
      (n) =>
        n.category === "stable" &&
        n.importance === "high" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    expect(escalationNews).toBeDefined();
  });

  it("does not generate escalation news when friction was already >= 80", () => {
    const aiManager = makeAIManager({
      "rival-stable": makeBaseAIState("rival-stable", 85),
    });

    const rng = createRng("esc-already-high");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse, rivalHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const escalationNews = result.newsItems?.filter(
      (n) =>
        n.importance === "high" &&
        n.category === "stable" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    // May have grudge match news but should NOT have escalation news
    // Escalation news headlines contain "Escalates" or "Heated" or "Boiling" etc.
    const hasEscalation = escalationNews?.some((n) =>
      /escalat|heated|boiling|hostilit|war of words|no love lost/i.test(n.headline),
    );
    expect(hasEscalation).toBe(false);
  });

  it("does not generate escalation news when friction stays below 80", () => {
    const aiManager = makeAIManager({
      "rival-stable": makeBaseAIState("rival-stable", 65),
    });

    const rng = createRng("esc-stays-low");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse, rivalHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const escalationNews = result.newsItems?.filter(
      (n) =>
        n.importance === "high" &&
        n.category === "stable" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    const hasEscalation = escalationNews?.some((n) =>
      /escalat|heated|boiling|hostilit|war of words|no love lost/i.test(n.headline),
    );
    expect(hasEscalation).toBe(false);
  });
});

describe("npcCycle — rivalry escalation news (regional dominance path)", () => {
  let npcStable: Stable;
  let playerHorse: Horse;
  let race: Race;

  beforeEach(() => {
    npcStable = createTestStable({
      id: "rival-stable",
      name: "Bitter Creek Stables",
      personality: "aggressive",
    });

    playerHorse = createTestHorse({
      id: "player-horse",
      name: "Lightning Bolt",
      ownership: { type: "player" },
    });

    race = {
      id: "race-1",
      name: "Grand Stakes",
      day: DAY,
      distance: 2000,
      raceClass: "Stakes",
      entryFee: 500,
      purse: 50000,
      fieldSize: 8,
      entries: [{ horseId: "player-horse", ownership: { type: "player" } } as any],
      resolved: true,
      result: [{ horseId: "player-horse", position: 1, time: 120 }],
      graded: { grade: "G1", country: REGION },
    } as Race;
  });

  it("generates escalation news when friction crosses 80 after player beats NPC king", () => {
    const aiManager = makeAIManager(
      { "rival-stable": makeBaseAIState("rival-stable", 75) },
      { [REGION]: "rival-stable" },
    );

    const rng = createRng("esc-regional");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const escalationNews = result.newsItems?.find(
      (n) =>
        n.category === "stable" &&
        n.importance === "high" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    expect(escalationNews).toBeDefined();
    expect(escalationNews!.entityLinks).toEqual([
      { type: "stable", id: "rival-stable", name: "Bitter Creek Stables" },
    ]);
  });

  it("does not generate escalation news when NPC king friction was already >= 80", () => {
    const aiManager = makeAIManager(
      { "rival-stable": makeBaseAIState("rival-stable", 85) },
      { [REGION]: "rival-stable" },
    );

    const rng = createRng("esc-regional-already");
    const result = runNpcCycle(
      [npcStable],
      [playerHorse],
      [] as Jockey[],
      [race],
      DAY,
      rng,
      3,
      new Set(),
      aiManager,
    );

    const hasEscalation = result.newsItems?.some((n) =>
      /escalat|heated|boiling|hostilit|war of words|no love lost/i.test(n.headline),
    );
    expect(hasEscalation).toBe(false);
  });
});
