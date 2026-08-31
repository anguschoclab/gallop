import { describe, it, expect, beforeEach } from "vitest";
import { processRegionalDominance } from "@/core/npc/npcRegionalDominance";
import { createRng } from "@/core/common/rng";
import type { Horse, Race, Stable } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

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

function makeGradedRace(
  entries: {
    horseId: string;
    ownership: ReturnType<typeof makePlayerOwned> | ReturnType<typeof makeNpcOwned>;
  }[],
  result: { horseId: string; position: number; time: number }[],
  grade: "G1" | "G2" | "G3" = "G1",
): Race {
  return {
    id: "race-1",
    name: "Grand Stakes",
    day: DAY,
    distance: 2000,
    raceClass: "Stakes",
    entryFee: 500,
    purse: 50000,
    fieldSize: entries.length,
    entries: entries as any,
    resolved: true,
    result: result as any,
    graded: { grade, track: "Test Track", surface: "Turf", country: REGION },
  } as Race;
}

describe("processRegionalDominance — grudge match logic", () => {
  let rivalStable1: Stable;
  let rivalStable2: Stable;
  let playerHorse: Horse;
  let rivalHorse1: Horse;
  let rivalHorse2: Horse;

  beforeEach(() => {
    rivalStable1 = createTestStable({
      id: "rival-1",
      name: "Bitter Creek Stables",
      personality: "aggressive",
    });
    rivalStable2 = createTestStable({
      id: "rival-2",
      name: "Shadow Racing",
      personality: "aggressive",
    });

    playerHorse = createTestHorse({
      id: "player-horse",
      name: "Lightning Bolt",
      ownership: makePlayerOwned(),
    });
    rivalHorse1 = createTestHorse({
      id: "rival-horse-1",
      name: "Dark Thunder",
      ownership: makeNpcOwned(asNpcStableId("rival-1")),
    });
    rivalHorse2 = createTestHorse({
      id: "rival-horse-2",
      name: "Storm Bringer",
      ownership: makeNpcOwned(asNpcStableId("rival-2")),
    });
  });

  it("generates grudge match when player wins (friction +10, reputation +15)", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1", position: 2, time: 121 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-player-win"),
    );

    const repEvent = result.reputationEvents.find((e) => e.source === "rivalry_win");
    expect(repEvent).toBeDefined();
    expect(repEvent!.amount).toBe(15);

    const newFriction = result.aiManager.stableStates["rival-1"].friction;
    expect(newFriction).toBe(70); // 60 + 10
  });

  it("generates grudge match when rival wins (friction +15, reputation -10)", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "rival-horse-1", position: 1, time: 120 },
        { horseId: "player-horse", position: 2, time: 121 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-rival-win"),
    );

    const repEvent = result.reputationEvents.find((e) => e.source === "rivalry_loss");
    expect(repEvent).toBeDefined();
    expect(repEvent!.amount).toBe(-10);

    const newFriction = result.aiManager.stableStates["rival-1"].friction;
    expect(newFriction).toBe(75); // 60 + 15
  });

  it("processes multiple rivals in same race", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
        { horseId: "rival-horse-2", ownership: makeNpcOwned(asNpcStableId("rival-2")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1", position: 2, time: 121 },
        { horseId: "rival-horse-2", position: 3, time: 122 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 55),
      "rival-2": makeBaseAIState("rival-2", 50),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1, rivalHorse2],
      [rivalStable1, rivalStable2],
      aiManager,
      DAY,
      createRng("grudge-multi-rival"),
    );

    // Both rivals should have friction increased (player won, +10 each)
    expect(result.aiManager.stableStates["rival-1"].friction).toBe(65);
    expect(result.aiManager.stableStates["rival-2"].friction).toBe(60);

    // Two reputation events
    const winEvents = result.reputationEvents.filter((e) => e.source === "rivalry_win");
    expect(winEvents).toHaveLength(2);
  });

  it("skips rival with friction < 50", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1", position: 2, time: 121 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 49),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-low-friction"),
    );

    // No grudge match — friction unchanged by grudge logic
    // (friction may change via regional dominance, but not via grudge match)
    const repEvents = result.reputationEvents.filter(
      (e) => e.source === "rivalry_win" || e.source === "rivalry_loss",
    );
    expect(repEvents).toHaveLength(0);
  });

  it("does not generate grudge match when player has entries but none in results", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      // Player horse not in results (e.g., scratched)
      [{ horseId: "rival-horse-1", position: 1, time: 120 }],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-no-player-result"),
    );

    const repEvents = result.reputationEvents.filter(
      (e) => e.source === "rivalry_win" || e.source === "rivalry_loss",
    );
    expect(repEvents).toHaveLength(0);
  });

  it("picks best player horse when multiple entries", () => {
    const playerHorse2 = createTestHorse({
      id: "player-horse-2",
      name: "Speed Demon",
      ownership: makePlayerOwned(),
    });

    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "player-horse-2", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 4, time: 125 },
        { horseId: "player-horse-2", position: 2, time: 119 },
        { horseId: "rival-horse-1", position: 1, time: 117 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, playerHorse2, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-multi-player"),
    );

    // Player's best is position 2 (player-horse-2), rival is position 1
    // Rival wins → reputation loss
    const repEvent = result.reputationEvents.find((e) => e.source === "rivalry_loss");
    expect(repEvent).toBeDefined();
    expect(repEvent!.horseId).toBe("player-horse-2");
  });

  it("picks best rival horse when multiple entries from same stable", () => {
    const rivalHorse1b = createTestHorse({
      id: "rival-horse-1b",
      name: "Second Strike",
      ownership: makeNpcOwned(asNpcStableId("rival-1")),
    });

    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
        { horseId: "rival-horse-1b", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1b", position: 2, time: 121 },
        { horseId: "rival-horse-1", position: 3, time: 122 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1, rivalHorse1b],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-multi-rival-horses"),
    );

    // Player wins → reputation win, horse should be player-horse
    const repEvent = result.reputationEvents.find((e) => e.source === "rivalry_win");
    expect(repEvent).toBeDefined();
    expect(repEvent!.horseId).toBe("player-horse");
  });

  it("skips grudge match for non-graded race", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1", position: 2, time: 121 },
      ],
    );
    // Remove graded to make it non-graded
    (race as any).graded = undefined;

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 60),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-non-graded"),
    );

    const repEvents = result.reputationEvents.filter(
      (e) => e.source === "rivalry_win" || e.source === "rivalry_loss",
    );
    expect(repEvents).toHaveLength(0);
  });

  it("generates escalation news when friction crosses 80 in grudge match", () => {
    const race = makeGradedRace(
      [
        { horseId: "player-horse", ownership: makePlayerOwned() },
        { horseId: "rival-horse-1", ownership: makeNpcOwned(asNpcStableId("rival-1")) },
      ],
      [
        { horseId: "player-horse", position: 1, time: 120 },
        { horseId: "rival-horse-1", position: 2, time: 121 },
      ],
    );

    const aiManager = makeAIManager({
      "rival-1": makeBaseAIState("rival-1", 75),
    });

    const result = processRegionalDominance(
      [race],
      [playerHorse, rivalHorse1],
      [rivalStable1],
      aiManager,
      DAY,
      createRng("grudge-escalation"),
    );

    // Player wins → friction +10 → 85, crosses 80 threshold
    expect(result.aiManager.stableStates["rival-1"].friction).toBe(85);

    const escalationNews = result.newsItems.find(
      (n) =>
        n.importance === "high" &&
        n.category === "stable" &&
        n.headline.includes("Bitter Creek Stables"),
    );
    expect(escalationNews).toBeDefined();
  });
});
