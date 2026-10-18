import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/platform/persistence/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: "gallop_game_state_fallback",
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/platform/persistence/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/platform/game/store/storage", () => ({
  createIdbStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  }),
  hydrationComplete: { value: true },
  saveExists: { value: false },
  saveCoordinator: {
    isArmed: false,
    lastWrittenRevision: -1,
    arm: vi.fn(),
    disarm: vi.fn(),
    enqueue: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  },
  createRehydrateStore: () => vi.fn().mockResolvedValue(undefined),
}));

import { useGame } from "@/platform/game/store";
import { _setEngineClientForTests } from "@/platform/game/store/engineClient";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { runPipelineForDay } from "@/tests/helpers/runPipeline";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned, makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asHorseId, asNpcStableId } from "@/shared/types/branded";
import type { Race } from "@/platform/game/types";

function makeRace(id: string, day: number): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 1000,
    fieldSize: 8,
    entries: [
      { horseId: asHorseId("h1"), ownership: makePlayerOwned() },
      { horseId: asHorseId("h2"), ownership: makeNpcOwned(asNpcStableId("s1")) },
    ],
    resolved: false,
  } as Race;
}

describe("Live race finish applies player impacts immediately", () => {
  beforeEach(() => {
    _setEngineClientForTests(null);
    const playerHorse = createTestHorse({ id: asHorseId("h1"), ownership: makePlayerOwned() });
    const npcHorse = createTestHorse({
      id: asHorseId("h2"),
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });
    useGame.setState({
      day: 5,
      cash: 500,
      horses: h2r([playerHorse, npcHorse]),
      races: r2r([makeRace("r1", 5)]),
      npcStables: [],
      jockeys: [],
      hiredStaff: [],
      transactions: [],
      pendingIntents: [],
      runEnded: false,
      engineRevision: 0,
      engineGeneration: 1,
      reputation: {
        score: 0,
        tier: "unknown",
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
      },
    });
  });

  it("updates cash and reputation the moment the race finishes", async () => {
    await useGame.getState().resolveRaceWithImpacts("r1", [
      { horseId: "h1", position: 1, time: 96 },
      { horseId: "h2", position: 2, time: 97 },
    ]);

    const s = useGame.getState();
    expect(s.cash).toBeGreaterThan(500);
    expect(s.reputation?.score).toBeGreaterThan(0);
    expect(s.reputation?.totalWins).toBe(1);
    const intent = (s.pendingIntents ?? []).find(
      (i) => i.type === "race_resolution" && (i as { raceId?: string }).raceId === "r1",
    ) as { liveImpactsApplied?: boolean } | undefined;
    expect(intent?.liveImpactsApplied).toBe(true);
    expect(s.transactions.filter((t) => t.subcategory === "prize_money").length).toBe(1);
  });

  it("day advance does not double-apply prize money or prestige", async () => {
    await useGame.getState().resolveRaceWithImpacts("r1", [
      { horseId: "h1", position: 1, time: 96 },
      { horseId: "h2", position: 2, time: 97 },
    ]);

    const afterLive = useGame.getState();
    const liveCash = afterLive.cash;
    const liveScore = afterLive.reputation?.score ?? 0;

    const { state: nextState } = runPipelineForDay(afterLive, 6);

    expect(nextState.races["r1"].resolved).toBe(true);
    const prizeTxns = (nextState.transactions ?? []).filter((t) => t.subcategory === "prize_money");
    expect(prizeTxns.length).toBe(1);
    const winEvents = (nextState.reputation?.events ?? []).filter((e) => e.source === "race_win");
    expect(winEvents.length).toBe(1);
    // Cash may move for upkeep etc., but never by another prize payout.
    expect(nextState.cash).toBeLessThan(liveCash + 600);
    expect(nextState.reputation?.score).toBeLessThan(liveScore + 1);
  });
});

describe("Live race finish updates every stable and horse", () => {
  beforeEach(() => _setEngineClientForTests(null));
  it("records race history for both runners immediately, and only once after day advance", async () => {
    const playerHorse = createTestHorse({ id: asHorseId("h1"), ownership: makePlayerOwned() });
    const npcHorse = createTestHorse({
      id: asHorseId("h2"),
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });
    useGame.setState({
      day: 5,
      cash: 500,
      horses: h2r([playerHorse, npcHorse]),
      races: r2r([makeRace("r1", 5)]),
      npcStables: [],
      jockeys: [],
      hiredStaff: [],
      transactions: [],
      pendingIntents: [],
      runEnded: false,
      engineRevision: 0,
      engineGeneration: 1,
    });
    await useGame.getState().resolveRaceWithImpacts("r1", [
      { horseId: "h1", position: 2, time: 97 },
      { horseId: "h2", position: 1, time: 96 },
    ]);
    const s = useGame.getState();
    for (const id of ["h1", "h2"]) {
      expect(s.horses[id].raceHistory.filter((r) => r.raceId === "r1").length).toBe(1);
    }
    const { state: next } = runPipelineForDay(s, 6);
    for (const id of ["h1", "h2"]) {
      expect(next.horses[id].raceHistory.filter((r) => r.raceId === "r1").length).toBe(1);
    }
  });
});

describe("Strategy Journal outcome fill", () => {
  beforeEach(() => _setEngineClientForTests(null));
  it("records result, prize money and cash the moment the race finishes", async () => {
    const playerHorse = createTestHorse({ id: asHorseId("h1"), ownership: makePlayerOwned() });
    const npcHorse = createTestHorse({
      id: asHorseId("h2"),
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });
    useGame.setState({
      day: 5,
      cash: 500,
      horses: h2r([playerHorse, npcHorse]),
      races: r2r([makeRace("r1", 5)]),
      npcStables: [],
      jockeys: [],
      hiredStaff: [],
      transactions: [],
      pendingIntents: [],
      runEnded: false,
      engineRevision: 0,
      engineGeneration: 1,
      strategyJournal: [
        {
          id: "j1",
          createdDay: 4,
          horseId: "h1",
          horseName: "H1",
          raceId: "r1",
          raceDay: 5,
          plan: "Lead",
        },
      ],
    });
    await useGame.getState().resolveRaceWithImpacts("r1", [
      { horseId: "h1", position: 1, time: 96 },
      { horseId: "h2", position: 2, time: 97 },
    ]);
    const s = useGame.getState();
    const r = s.strategyJournal?.[0].result;
    expect(r?.position).toBe(1);
    expect(r?.prizeMoney).toBeGreaterThan(0);
    expect(r?.cashAfter).toBe(Math.round(s.cash));
  });
});
