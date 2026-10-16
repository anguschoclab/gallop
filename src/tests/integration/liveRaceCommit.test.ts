/**
 * liveRaceCommit.test.ts — authoritative live-race resolution.
 *
 * One result command → one commit. When the live session supplies its field,
 * the store must NOT re-run a duplicate headless simulateRace; impacts apply
 * exactly once; duplicate resolution cannot re-commit.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: "gallop_game_state_fallback",
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/services/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/game/store/storage", () => ({
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

vi.mock("@/core/race/raceSimulationExecutor", async (importActual) => {
  const actual = await importActual<typeof import("@/core/race/raceSimulationExecutor")>();
  return { ...actual, simulateRace: vi.fn(actual.simulateRace) };
});

import { useGame } from "@/game/store";
import { simulateRace } from "@/core/race/raceSimulationExecutor";
import { _setEngineClientForTests } from "@/game/store/engineClient";
import type { RaceRunner } from "@/core/race/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asHorseId, asJockeyId, asNpcStableId } from "@/core/types/branded";
import type { Race } from "@/game/types";

const RESULT = [
  { horseId: "h1", position: 1, time: 96 },
  { horseId: "h2", position: 2, time: 97 },
];

function seed() {
  useGame.setState({
    day: 5,
    cash: 500,
    horses: h2r([
      createTestHorse({ id: asHorseId("h1"), ownership: makePlayerOwned() }),
      createTestHorse({ id: asHorseId("h2"), ownership: makeNpcOwned(asNpcStableId("s1")) }),
    ]),
    races: r2r([
      {
        id: "r1",
        name: "Race r1",
        day: 5,
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
      } as Race,
    ]),
    npcStables: [],
    jockeys: [],
    hiredStaff: [],
    transactions: [],
    pendingIntents: [],
    runEnded: false,
    engineGeneration: 1,
    engineRevision: 0,
  });
}

const FIELD: RaceRunner[] = [
  {
    horseId: asHorseId("h1"),
    name: "H1",
    silk: "#000",
    ownership: makePlayerOwned(),
    jockeyId: asJockeyId("j1"),
    jockeyName: "J1",
    gate: 1,
    lane: 1,
  },
  {
    horseId: asHorseId("h2"),
    name: "H2",
    silk: "#fff",
    ownership: makeNpcOwned(asNpcStableId("s1")),
    jockeyId: asJockeyId("j2"),
    jockeyName: "J2",
    gate: 2,
    lane: 2,
  },
];

describe("authoritative live-race commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _setEngineClientForTests(null);
    seed();
  });

  it("commits through the engine — bumps revision, applies live impacts, queues intent", async () => {
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT, FIELD, {}, []);
    const s = useGame.getState();
    // One authoritative commit: engineRevision advanced once.
    expect(s.engineRevision).toBe(1);
    expect(s.cash).toBeGreaterThan(500);
    // The resolution intent carries the session field + the live-applied
    // marker so the pipeline neither re-simulates nor double-applies.
    const intent = (s.pendingIntents ?? []).find(
      (i) => i.type === "race_resolution" && (i as { raceId?: string }).raceId === "r1",
    ) as { liveImpactsApplied?: boolean; runners?: unknown; results?: unknown } | undefined;
    expect(intent?.liveImpactsApplied).toBe(true);
    expect(intent?.runners).toEqual(FIELD);
    expect(intent?.results).toEqual(RESULT);
  });

  it("uses the live session's field — no duplicate simulateRace call", async () => {
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT, FIELD, {}, []);
    expect(vi.mocked(simulateRace)).not.toHaveBeenCalled();
  });

  it("falls back to simulateRace only when no live field is supplied", async () => {
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT);
    expect(vi.mocked(simulateRace)).toHaveBeenCalledTimes(1);
  });

  it("a second resolution applies player impacts exactly once", async () => {
    const cashBefore = useGame.getState().cash;
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT, FIELD.slice(0, 1));
    const cashAfterFirst = useGame.getState().cash;
    expect(cashAfterFirst).toBeGreaterThan(cashBefore);

    // Duplicate resolution (e.g. double-mounted component) must not re-apply
    // prize money — the engine-side transform sees the queued intent and
    // commits an unchanged state.
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT, FIELD.slice(0, 1));
    const s = useGame.getState();
    expect(s.cash).toBe(cashAfterFirst);
    expect(s.horses.h1.raceHistory.filter((r) => r.raceId === "r1").length).toBe(1);
    expect(s.transactions.filter((t) => t.subcategory === "prize_money").length).toBe(1);
    expect(
      (s.pendingIntents ?? []).filter(
        (i) => i.type === "race_resolution" && (i as { raceId?: string }).raceId === "r1",
      ).length,
    ).toBe(1);
  });

  it("attaches results, ledgers, and snapshots to the single resolution intent", async () => {
    const ledgers = { h1: { horseId: "h1", factors: [] } } as never;
    const snapshots = [{ t: 0, horses: [] }] as never;
    await useGame.getState().resolveRaceWithImpacts("r1", RESULT, undefined, ledgers, snapshots);
    const intent = (useGame.getState().pendingIntents ?? []).find(
      (i) => i.type === "race_resolution" && i.raceId === "r1",
    ) as { results?: unknown; factorLedgers?: unknown; snapshots?: unknown } | undefined;
    expect(intent).toBeDefined();
    expect(intent!.results).toEqual(RESULT);
    expect(intent!.factorLedgers).toBe(ledgers);
    expect(intent!.snapshots).toBe(snapshots);
  });
});
