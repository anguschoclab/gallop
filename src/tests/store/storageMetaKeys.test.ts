/**
 * storageMetaKeys.test.ts — Verifies that market-related state keys are
 * persisted to and restored from the IDB meta bucket.
 *
 * These tests exist because META_KEYS in storage.ts was missing
 * exchange, priceAlerts, notifiedTradeKeys, autoSyndicateEnabled,
 * playerBiddingHistory, scoutingAssignments, and marketStrategy —
 * causing those fields to be silently dropped on every save.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makePlayerOwned, makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

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

const mockSaveBuckets = vi.fn().mockResolvedValue(undefined);
const mockLoadBuckets = vi.fn().mockResolvedValue(null);
const mockClearDatabase = vi.fn().mockResolvedValue(undefined);
let mockIdbAvailable = true;

vi.mock("@/services/storage/indexedDbService", () => ({
  saveBuckets: (...args: any[]) => mockSaveBuckets(...args),
  loadBuckets: (...args: any[]) => mockLoadBuckets(...args),
  clearDatabase: (...args: any[]) => mockClearDatabase(...args),
  isIndexedDbAvailable: () => mockIdbAvailable,
}));

vi.mock("@/services/storage/schemas", () => ({
  safeParseJson: vi.fn((raw: string, _schema: any) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }),
  bucketPayloadSchema: {},
}));

import {
  saveGameStateToIDB,
  loadGameStateFromIDB,
  _resetSaveExists,
  _resetPersistenceEnabled,
} from "@/game/store/storage";
import { PERSISTED_KEYS, DEDICATED_BUCKET_KEYS } from "@/game/store/persistedKeys";

function makeMockHorse(id: string, owned: boolean, stableId?: string): any {
  return {
    id,
    name: `Horse ${id}`,
    sireName: "Sire",
    damName: "Dam",
    pedigree: { name: `Horse ${id}`, generation: 0 },
    birthDay: 0,
    age: 3,
    gender: "colt",
    hemisphere: "northern",
    silk: "red",
    ownership: owned
      ? makePlayerOwned()
      : stableId
        ? makeNpcOwned(asNpcStableId(stableId))
        : makeUnowned(),
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      distanceAptitude: 50,
      surfaceAptitude: 50,
      mudAptitude: 50,
      corneringAptitude: 50,
      climbingAptitude: 50,
      recoveryRate: 50,
      trainability: 50,
      heartScore: 50,
      peakAge: 4,
      strideType: "average",
      trackPreference: "balanced",
      runningStyle: "front",
      bleederRisk: 0,
      roarerRisk: 0,
      ocdRisk: 0,
    } as any,
    genotype: {} as any,
    energy: 100,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    form: 50,
    potential: 50,
    recoveryPoints: 100,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    healthStatusDay: 0,
    isBlueHen: false,
    gelded: false,
    foalingEase: 50,
    heterozygosity: 50,
    fame: 0,
    distanceAptitude: 50,
    surfaceAptitude: { Turf: 50, Dirt: 50, Synthetic: 50 },
    mudAptitude: 50,
    corneringAptitude: 50,
    climbingAptitude: 50,
    peakAge: 4,
    strideType: "average",
    trackPreference: "balanced",
    runningStyle: "front" as any,
    bleederRisk: 0,
    roarerRisk: 0,
    ocdRisk: 0,
    recoveryRate: 50,
    trainability: 50,
    heartScore: 50,
    bloodline: "Unknown",
    fiberBias: "Unknown",
    healthStatus: "healthy" as any,
    racingViable: true,
    lifecycleStatus: "active",
    courseVisits: {},
  };
}

function makeMockGameState(overrides: Record<string, any> = {}): any {
  return {
    day: 10,
    cash: 50000,
    horses: {},
    races: {},
    npcStables: [],
    log: [],
    news: [],
    inbox: [],
    seasonRecords: [],
    hallOfFame: [],
    archive: { horses: [], races: [], pregnancies: [], news: [] },
    transactions: [],
    expenses: [],
    market: [],
    scoutReports: [],
    privateSaleOffers: [],
    claims: [],
    pregnancies: [],
    activeBreedingProgram: null,
    syndicates: {},
    syndicateInvestors: {},
    trainingUsed: {},
    playerNominations: [],
    breedingPrograms: [],
    awards: [],
    usedHorseNames: [],
    usedJockeyNames: [],
    reservedHorseNames: [],
    stewardsInquiries: [],
    staffPool: [],
    hiredStaff: [],
    storeVersion: 8,
    ...overrides,
  };
}

describe("storage META_KEYS — parity with PERSISTED_KEYS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdbAvailable = true;
    mockSaveBuckets.mockResolvedValue(undefined);
    mockLoadBuckets.mockResolvedValue(null);
    mockClearDatabase.mockResolvedValue(undefined);
    _resetSaveExists();
    _resetPersistenceEnabled();
  });

  afterEach(() => {
    _resetSaveExists();
    _resetPersistenceEnabled();
    vi.restoreAllMocks();
  });

  it("saves every non-dedicated PERSISTED_KEY to the meta bucket", async () => {
    // Sentinel value per key so a wrong-key mapping is caught, not just an
    // absent one. Dedicated-bucket keys keep valid mock shapes and are
    // asserted in the dedicated-bucket test below.
    const sentinels: Record<string, unknown> = {};
    const expectedMetaKeys: string[] = [];
    for (const key of PERSISTED_KEYS as string[]) {
      if (DEDICATED_BUCKET_KEYS.has(key)) continue;
      sentinels[key] = { __sentinel: key };
      expectedMetaKeys.push(key);
    }
    const state = makeMockGameState(sentinels);
    await saveGameStateToIDB(state);
    const meta = mockSaveBuckets.mock.calls[0][0].meta as Record<string, unknown>;
    const missing = expectedMetaKeys.filter((k) => !(k in meta));
    expect(missing).toEqual([]);
    for (const k of expectedMetaKeys) {
      expect(meta[k]).toEqual({ __sentinel: k });
    }
  });

  it("writes dedicated-bucket fields to their own buckets, plus storeVersion to meta", async () => {
    const npcStable = {
      id: "stable-1",
      name: "NPC Stable",
      owner: "NPC",
      tier: "mid",
      reputation: 50,
      founded: 1,
      cash: 100000,
      horses: [],
      isMajor: true,
      colors: { primary: "#fff", secondary: "#000" },
      personality: "conservative",
      staff: { trainer: null, veterinarian: null, farrier: null, nutritionist: null, groom: null },
      outposts: [],
    };
    const npcHorse = makeMockHorse("npc-h1", false, "stable-1");
    const playerHorse = makeMockHorse("p-h1", true);
    const state = makeMockGameState({
      storeVersion: 8,
      npcStables: [npcStable],
      horses: { "npc-h1": npcHorse, "p-h1": playerHorse },
      races: { r1: { id: "r1" } },
    });
    await saveGameStateToIDB(state);
    const buckets = mockSaveBuckets.mock.calls[0][0];
    expect(buckets.meta.storeVersion).toBe(8);
    expect(Object.keys(buckets.npcStables)).toEqual(["stable-1"]);
    expect(Object.keys(buckets.horses.playerHorses)).toEqual(["p-h1"]);
    expect(buckets.horses.npcSummaries).toHaveLength(1);
    expect(Object.keys(buckets.races)).toEqual(["r1"]);
  });

  it("saves strategyJournal to the meta bucket", async () => {
    const strategyJournal = [
      { id: "j1", createdDay: 1, horseId: "h1", plan: "Press the lead", rationale: "test" },
    ];
    const state = makeMockGameState({ strategyJournal });
    await saveGameStateToIDB(state);
    const buckets = mockSaveBuckets.mock.calls[0][0];
    expect(buckets.meta.strategyJournal).toEqual(strategyJournal);
  });

  it("saves stableGoals to the meta bucket", async () => {
    const stableGoals = { startDay: 1, targetEarnings: 500000, targetWins: 10 };
    const state = makeMockGameState({ stableGoals });
    await saveGameStateToIDB(state);
    const buckets = mockSaveBuckets.mock.calls[0][0];
    expect(buckets.meta.stableGoals).toEqual(stableGoals);
  });

  it("saves horseDailyProgress to the meta bucket", async () => {
    const horseDailyProgress = { "p-h1": [{ day: 1, ovr: 60, energy: 90 }] };
    const state = makeMockGameState({ horseDailyProgress });
    await saveGameStateToIDB(state);
    const buckets = mockSaveBuckets.mock.calls[0][0];
    expect(buckets.meta.horseDailyProgress).toEqual(horseDailyProgress);
  });
});

describe("storage META_KEYS — market fields persisted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdbAvailable = true;
    mockSaveBuckets.mockResolvedValue(undefined);
    mockLoadBuckets.mockResolvedValue(null);
    mockClearDatabase.mockResolvedValue(undefined);
    _resetSaveExists();
    _resetPersistenceEnabled();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    _resetSaveExists();
    _resetPersistenceEnabled();
    vi.restoreAllMocks();
  });

  // ─── Save: market fields appear in the meta bucket ─────────────────────

  describe("saveGameStateToIDB persists market fields to meta", () => {
    it("saves exchange to the meta bucket", async () => {
      const exchange = { asks: [], bids: [], trades: [] };
      const state = makeMockGameState({ exchange });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.exchange).toEqual(exchange);
    });

    it("saves priceAlerts to the meta bucket", async () => {
      const priceAlerts = [
        {
          id: "a1",
          scope: { kind: "market" },
          direction: "either",
          thresholdPct: 5,
          windowDays: 7,
          createdDay: 1,
          enabled: true,
        },
      ];
      const state = makeMockGameState({ priceAlerts });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.priceAlerts).toEqual(priceAlerts);
    });

    it("saves notifiedTradeKeys to the meta bucket", async () => {
      const notifiedTradeKeys = ["trade-1", "trade-2"];
      const state = makeMockGameState({ notifiedTradeKeys });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.notifiedTradeKeys).toEqual(notifiedTradeKeys);
    });

    it("saves autoSyndicateEnabled to the meta bucket", async () => {
      const state = makeMockGameState({ autoSyndicateEnabled: true });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.autoSyndicateEnabled).toBe(true);
    });

    it("saves playerBiddingHistory to the meta bucket", async () => {
      const playerBiddingHistory = [{ lotId: "lot-1", bids: [] }];
      const state = makeMockGameState({ playerBiddingHistory });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.playerBiddingHistory).toEqual(playerBiddingHistory);
    });

    it("saves scoutingAssignments to the meta bucket", async () => {
      const scoutingAssignments = [{ id: "sa-1", stableId: "npc-1" }];
      const state = makeMockGameState({ scoutingAssignments });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.scoutingAssignments).toEqual(scoutingAssignments);
    });

    it("saves marketStrategy to the meta bucket", async () => {
      const marketStrategy = {
        targetGrades: ["G1"],
        minTrackPrestige: 60,
        maxPrice: 300000,
        targetSyndicationStakePct: 30,
      };
      const state = makeMockGameState({ marketStrategy });
      await saveGameStateToIDB(state);
      const buckets = mockSaveBuckets.mock.calls[0][0];
      expect(buckets.meta.marketStrategy).toEqual(marketStrategy);
    });
  });

  // ─── Load: market fields restored from the meta bucket ──────────────────

  describe("loadGameStateFromIDB restores market fields from meta", () => {
    it("restores exchange from meta", async () => {
      const exchange = { asks: [{ id: "a1" }], bids: [], trades: [] };
      mockLoadBuckets.mockResolvedValue({
        meta: { day: 10, cash: 500, exchange, storeVersion: 8 },
        horses: { playerHorses: {}, npcSummaries: [] },
        races: {},
        npcStables: {},
      });
      const state = await loadGameStateFromIDB();
      expect(state).not.toBeNull();
      expect(state!.exchange).toEqual(exchange);
    });

    it("restores priceAlerts from meta", async () => {
      const priceAlerts = [
        {
          id: "a1",
          scope: { kind: "market" },
          direction: "either",
          thresholdPct: 5,
          windowDays: 7,
          createdDay: 1,
          enabled: true,
        },
      ];
      mockLoadBuckets.mockResolvedValue({
        meta: { day: 10, cash: 500, priceAlerts, storeVersion: 8 },
        horses: { playerHorses: {}, npcSummaries: [] },
        races: {},
        npcStables: {},
      });
      const state = await loadGameStateFromIDB();
      expect(state).not.toBeNull();
      expect(state!.priceAlerts).toEqual(priceAlerts);
    });

    it("restores marketStrategy from meta", async () => {
      const marketStrategy = {
        targetGrades: ["G1"],
        minTrackPrestige: 60,
        maxPrice: 300000,
        targetSyndicationStakePct: 30,
      };
      mockLoadBuckets.mockResolvedValue({
        meta: { day: 10, cash: 500, marketStrategy, storeVersion: 8 },
        horses: { playerHorses: {}, npcSummaries: [] },
        races: {},
        npcStables: {},
      });
      const state = await loadGameStateFromIDB();
      expect(state).not.toBeNull();
      expect(state!.marketStrategy).toEqual(marketStrategy);
    });

    it("restores notifiedTradeKeys from meta", async () => {
      const notifiedTradeKeys = ["t1", "t2"];
      mockLoadBuckets.mockResolvedValue({
        meta: { day: 10, cash: 500, notifiedTradeKeys, storeVersion: 8 },
        horses: { playerHorses: {}, npcSummaries: [] },
        races: {},
        npcStables: {},
      });
      const state = await loadGameStateFromIDB();
      expect(state).not.toBeNull();
      expect(state!.notifiedTradeKeys).toEqual(notifiedTradeKeys);
    });
  });
});
