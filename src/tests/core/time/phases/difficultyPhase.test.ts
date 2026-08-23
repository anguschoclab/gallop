import { describe, it, expect } from "vitest";
import { difficultyPhase } from "@/core/time/phases/difficultyPhase";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Horse, Race } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { asHorseId, asNpcStableId } from "@/core/types/branded";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import type { DifficultyState } from "@/core/ai/npcCycleAI";

function makeHorse(overrides: Omit<Partial<Horse>, "id"> & { id?: string } = {}): Horse {
  return {
    id: overrides.id ?? "h1",
    name: overrides.name ?? "Test",
    ownership: overrides.ownership ?? { type: "player" },
    gender: "colt",
    age: 4,
    hemisphere: "Northern",
    energy: 100,
    distanceAptitude: 1600,
    surfaceAptitude: "Turf",
    fame: 50,
    form: 0,
    stats: { speed: 70, stamina: 70, acceleration: 70 },
    runningStyle: "E",
    appearance: "average",
    coatColor: "bay",
    markings: "none",
    silk: "#000",
    raceHistory: [],
    consignedSaleId: null,
    activeInjury: null,
    lifecycleStatus: "active",
    ...overrides,
  } as Horse;
}

function makeRace(overrides: Omit<Partial<Race>, "id"> & { id?: string } = {}): Race {
  return {
    id: overrides.id ?? "race-1",
    name: overrides.name ?? "Test Race",
    day: overrides.day ?? 20,
    distance: 1600,
    raceClass: "Graded",
    entryFee: 1000,
    purse: 100000,
    minStat: 50,
    fieldSize: 12,
    entries: overrides.entries ?? [],
    resolved: overrides.resolved ?? true,
    result: overrides.result,
    weather: "clear",
    trackCondition: "good",
    ...overrides,
  } as Race;
}

function makeContext(
  races: Race[],
  horses: Horse[],
  npcAIManager?: { difficultyModulator?: DifficultyState },
  newDay = 30,
): PipelineContext {
  return {
    previousDay: newDay - 1,
    newDay,
    state: {
      day: newDay,
      horses: h2r(horses),
      races: r2r(races),
      inbox: [],
      pregnancies: [],
      npcAIManager: npcAIManager as any,
    } as unknown as GameState,
    logs: [],
    dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(horses.map((h) => [h.id, h])),
    raceMap: new Map(races.map((r) => [r.id, r])),
    stableMap: new Map(),
    jockeyMap: new Map(),
  };
}

describe("difficultyPhase", () => {
  it("has order 74", () => {
    expect(difficultyPhase.order).toBe(74);
  });

  it("initializes difficultyModulator if missing", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const race = makeRace({
      id: "r1",
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 1, time: 90 }],
    });

    const ctx = makeContext([race], [playerHorse], undefined);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    expect(dm).toBeDefined();
    expect(dm.playerWinRate).toBe(0);
    expect(dm.npcCompetenceMultiplier).toBe(1.0);
    expect(dm.lastAdjustmentDay).toBe(30);
    expect(dm.playerWins).toBe(0);
    expect(dm.playerEntries).toBe(0);
  });

  it("accumulates player wins and entries from resolved races", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const playerHorse2 = makeHorse({ id: "h2", ownership: { type: "player" } });
    const npcHorse = makeHorse({
      id: "h3",
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });

    const race1 = makeRace({
      id: "r1",
      day: 30,
      resolved: true,
      entries: [
        { horseId: asHorseId("h1"), ownership: makePlayerOwned() },
        { horseId: asHorseId("h3"), ownership: makeNpcOwned(asNpcStableId("s1")) },
      ],
      result: [
        { horseId: asHorseId("h1"), position: 1, time: 90 },
        { horseId: asHorseId("h3"), position: 2, time: 92 },
      ],
    });
    const race2 = makeRace({
      id: "r2",
      day: 30,
      resolved: true,
      entries: [
        { horseId: asHorseId("h2"), ownership: makePlayerOwned() },
        { horseId: asHorseId("h3"), ownership: makeNpcOwned(asNpcStableId("s1")) },
      ],
      result: [
        { horseId: asHorseId("h3"), position: 1, time: 88 },
        { horseId: asHorseId("h2"), position: 2, time: 91 },
      ],
    });

    const existing: DifficultyState = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 1.0,
      lastAdjustmentDay: 29,
      playerWins: 0,
      playerEntries: 0,
    } as DifficultyState;

    const ctx = makeContext([race1, race2], [playerHorse, playerHorse2, npcHorse], {
      difficultyModulator: existing,
    });
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    // 2 player entries, 1 player win
    expect(dm.playerWins).toBe(1);
    expect(dm.playerEntries).toBe(2);
  });

  it("adjusts npcCompetenceMultiplier when player wins too much (after 30 days)", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });

    const race = makeRace({
      id: "r1",
      day: 31,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 1, time: 90 }],
    });

    const existing = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 1.0,
      lastAdjustmentDay: 0,
      playerWins: 8,
      playerEntries: 10,
    } as DifficultyState;

    // Day 31 — 31 days since last adjustment at day 0
    const ctx = makeContext([race], [playerHorse], { difficultyModulator: existing }, 31);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    // Player win rate 80% — NPC competence should increase (clamp at 1.3)
    expect(dm.npcCompetenceMultiplier).toBeGreaterThan(1.0);
    expect(dm.npcCompetenceMultiplier).toBeLessThanOrEqual(1.3);
    expect(dm.lastAdjustmentDay).toBe(31);
    // Accumulators reset after adjustment
    expect(dm.playerWins).toBe(0);
    expect(dm.playerEntries).toBe(0);
  });

  it("adjusts npcCompetenceMultiplier downward when player loses too much", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });

    const race = makeRace({
      id: "r1",
      day: 31,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 5, time: 95 }],
    });

    const existing = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 1.0,
      lastAdjustmentDay: 0,
      playerWins: 1,
      playerEntries: 10,
    } as DifficultyState;

    const ctx = makeContext([race], [playerHorse], { difficultyModulator: existing }, 31);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    // Player win rate 10% — NPC competence should decrease (clamp at 0.7)
    expect(dm.npcCompetenceMultiplier).toBeLessThan(1.0);
    expect(dm.npcCompetenceMultiplier).toBeGreaterThanOrEqual(0.7);
  });

  it("clamps npcCompetenceMultiplier at 1.3 max", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const race = makeRace({
      id: "r1",
      day: 31,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 1, time: 90 }],
    });

    const existing = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 1.3,
      lastAdjustmentDay: 0,
      playerWins: 10,
      playerEntries: 10,
    } as DifficultyState;

    const ctx = makeContext([race], [playerHorse], { difficultyModulator: existing }, 31);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    expect(dm.npcCompetenceMultiplier).toBe(1.3);
  });

  it("clamps npcCompetenceMultiplier at 0.7 min", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const race = makeRace({
      id: "r1",
      day: 31,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 5, time: 95 }],
    });

    const existing = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 0.7,
      lastAdjustmentDay: 0,
      playerWins: 0,
      playerEntries: 10,
    } as DifficultyState;

    const ctx = makeContext([race], [playerHorse], { difficultyModulator: existing }, 31);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    expect(dm.npcCompetenceMultiplier).toBe(0.7);
  });

  it("does not adjust before 30 days have passed", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const race = makeRace({
      id: "r1",
      day: 25,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 1, time: 90 }],
    });

    const existing = {
      playerWinRate: 0,
      npcCompetenceMultiplier: 1.0,
      lastAdjustmentDay: 20,
      playerWins: 5,
      playerEntries: 5,
    } as DifficultyState;

    // Day 25 — only 5 days since last adjustment at day 20
    const ctx = makeContext([race], [playerHorse], { difficultyModulator: existing }, 25);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    // No adjustment yet
    expect(dm.npcCompetenceMultiplier).toBe(1.0);
    expect(dm.lastAdjustmentDay).toBe(20);
    // But accumulators still update
    expect(dm.playerWins).toBe(6);
    expect(dm.playerEntries).toBe(6);
  });

  it("ignores NPC-owned horses in win/entry counting", () => {
    const npcHorse = makeHorse({
      id: "h1",
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });
    const race = makeRace({
      id: "r1",
      day: 30,
      resolved: true,
      entries: [{ horseId: asHorseId("h1"), ownership: makePlayerOwned() }],
      result: [{ horseId: asHorseId("h1"), position: 1, time: 90 }],
    });

    const ctx = makeContext([race], [npcHorse], undefined);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    expect(dm.playerWins).toBe(0);
    expect(dm.playerEntries).toBe(0);
  });

  it("skips unresolved races", () => {
    const playerHorse = makeHorse({ id: "h1", ownership: { type: "player" } });
    const race = makeRace({
      id: "r1",
      day: 30,
      resolved: false,
      entries: [{ horseId: "h1" as any, ownership: { type: "player" } }],
      result: undefined,
    });

    const ctx = makeContext([race], [playerHorse], undefined);
    const result = difficultyPhase.execute(ctx);
    const dm = (result.state as any).npcAIManager?.difficultyModulator;
    expect(dm.playerWins).toBe(0);
    expect(dm.playerEntries).toBe(0);
  });
});
