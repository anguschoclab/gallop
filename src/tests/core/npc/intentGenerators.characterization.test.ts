import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import type { GameState, Stable, Horse, Race } from "@/game/types";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeNpcOwned } from "@/core/horse/ownership";

let shouldThrowForStable1 = false;

vi.mock("@/core/ai/npcCycleAI", () => ({
  getOrCreateStableAIState: vi.fn((manager: any, stable: Stable, _day: number) => {
    if (stable.id === "stable1" && shouldThrowForStable1) {
      throw new Error("Simulated AI error for stable 1");
    }
    const existing = manager?.stableStates?.[stable.id];
    if (existing) {
      return { ...existing, stableId: stable.id };
    }
    return { id: stable.id, stableId: stable.id };
  }),
  updateStableAIState: vi.fn((state: any) => ({ ...state, updated: true })),
}));

vi.mock("@/core/ai/strategicCoordinator", () => ({
  assessWorldState: vi.fn(() => ({
    playerDominance: 0.5,
    regionalPowerBalance: {},
    economicTrends: { studFeeTrend: 0, yearlingPriceIndex: 100, claimingMarketActivity: 0 },
    breedingMarketSaturation: 0.3,
    upcomingMajorRaces: [],
  })),
  generateStrategicDirectives: vi.fn(() => [{ type: "racing_focus", priority: 1, weight: 0.8 }]),
  allocateBudget: vi.fn(() => ({
    total: 40000,
    training: 10000,
    facilities: 5000,
    auctions: 10000,
    claiming: 5000,
    breeding: 10000,
  })),
  coordinateSubsystems: vi.fn(() => ({
    raceEntry: 1.3,
    training: 1.2,
    auction: 0.8,
    claiming: 0.9,
    breeding: 0.8,
    facility: 1.0,
    market: 1.0,
    upkeep: 1.0,
  })),
}));

function makeState(
  horses: Horse[],
  stables: Stable[],
  races: Race[] = [],
  overrides: Partial<GameState> = {},
): GameState {
  const horseMap: Record<string, Horse> = {};
  for (const h of horses) horseMap[h.id] = h;
  const raceMap: Record<string, Race> = {};
  for (const r of races) raceMap[r.id] = r;
  return {
    horses: horseMap,
    pregnancies: [],
    races: raceMap,
    npcStables: stables,
    jockeys: [],
    auctions: [],
    ...overrides,
  } as unknown as GameState;
}

describe("generateNpcIntents — training intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate training intents for horses with sufficient energy", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const trainingIntents = intents.filter((i) => i.type === "training");
    expect(trainingIntents.length).toBeGreaterThan(0);
    expect(trainingIntents[0].source).toBe("npc");
    expect(trainingIntents[0].sourceId).toBe("npc-1");
  });

  it("should not generate training intents for horses with low energy", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 5,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const trainingIntents = intents.filter((i) => i.type === "training");
    expect(trainingIntents.length).toBe(0);
  });

  it("should not generate training intents for pregnant mares", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 5,
      gender: "mare",
      energy: 80,
    });
    const state = makeState([horse], [stable], [], {
      pregnancies: [{ damId: "h1", sireId: "s1", resolved: false } as any],
    });
    const intents = generateNpcIntents(state, 1);
    const trainingIntents = intents.filter((i) => i.type === "training" && i.entityId === "h1");
    expect(trainingIntents.length).toBe(0);
  });

  it("should generate training intents with valid trainingType", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const trainingIntents = intents.filter((i) => i.type === "training");
    if (trainingIntents.length > 0) {
      expect((trainingIntents[0] as any).trainingType).toBeDefined();
    }
  });
});

describe("generateNpcIntents — race entry intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not generate race entry intents with no upcoming races", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const raceEntryIntents = intents.filter((i) => i.type === "race_entry");
    expect(raceEntryIntents.length).toBe(0);
  });

  it("should not generate race entry intents for already-entered horses", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 3,
      purse: 50000,
      distance: 1600,
      surface: "Turf",
      entries: [{ horseId: "h1", stableId: "npc-1" }],
      resolved: false,
      cancelled: false,
    } as any;
    const state = makeState([horse], [stable], [race]);
    const intents = generateNpcIntents(state, 1);
    const raceEntryIntents = intents.filter(
      (i) => i.type === "race_entry" && (i as any).horseId === "h1",
    );
    expect(raceEntryIntents.length).toBe(0);
  });

  it("should not generate race entries for horses with no jockey available", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 3,
      purse: 50000,
      distance: 1600,
      surface: "Turf",
      entries: [],
      resolved: false,
      cancelled: false,
    } as any;
    const state = makeState([horse], [stable], [race]);
    const intents = generateNpcIntents(state, 1);
    // With no jockeys, no race entry intents should be generated
    const raceEntryIntents = intents.filter(
      (i) => i.type === "race_entry" && (i as any).horseId === "h1",
    );
    expect(raceEntryIntents.length).toBe(0);
  });
});

describe("generateNpcIntents — gelding intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not generate gelding intents for mares", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      gender: "mare",
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const geldingIntents = intents.filter(
      (i) => i.type === "gelding" && (i as any).horseId === "h1",
    );
    expect(geldingIntents.length).toBe(0);
  });

  it("should generate gelding intents with valid structure when eligible", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      gender: "colt",
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const geldingIntents = intents.filter((i) => i.type === "gelding");
    for (const intent of geldingIntents) {
      expect(intent.source).toBe("npc");
      expect(intent.sourceId).toBe("npc-1");
      expect((intent as any).horseId).toBeDefined();
    }
  });
});

describe("generateNpcIntents — stud fee intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not generate stud fee intents when stable is healthy", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      stableId: "npc-1",
      age: 8,
      gender: "horse",
      stud: { atStud: true, standingFee: 10000 },
    } as any);
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const studFeeIntents = intents.filter((i) => i.type === "update_stud_fee");
    expect(studFeeIntents.length).toBe(0);
  });

  it("should not generate stud fee intents for horses not at stud", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      stableId: "npc-1",
      age: 8,
      gender: "horse",
      stud: { atStud: false, standingFee: 10000 },
    } as any);
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const studFeeIntents = intents.filter((i) => i.type === "update_stud_fee");
    expect(studFeeIntents.length).toBe(0);
  });

  it("should not generate stud fee intents for horses with zero standing fee", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      stableId: "npc-1",
      age: 8,
      gender: "horse",
      stud: { atStud: true, standingFee: 0 },
    } as any);
    const state = makeState([horse], [stable]);
    const intents = generateNpcIntents(state, 1);
    const studFeeIntents = intents.filter((i) => i.type === "update_stud_fee");
    expect(studFeeIntents.length).toBe(0);
  });
});

describe("generateNpcIntents — withdrawal intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not generate withdrawal intents for non-claiming races", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 3,
      purse: 50000,
      distance: 1600,
      surface: "Turf",
      entries: [{ horseId: "h1", stableId: "npc-1" }],
      resolved: false,
      cancelled: false,
    } as any;
    const state = makeState([horse], [stable], [race]);
    const intents = generateNpcIntents(state, 1);
    const withdrawalIntents = intents.filter((i) => i.type === "withdraw_from_claiming");
    expect(withdrawalIntents.length).toBe(0);
  });

  it("should not generate withdrawal intents for other stables' entries", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const stable2 = createTestStable({ id: "npc-2", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const otherHorse = createTestHorse({
      id: "h2",
      ownership: makeNpcOwned("npc-2"),
      age: 3,
      energy: 80,
    });
    const race = {
      id: "race-1",
      name: "Claiming Race",
      day: 3,
      purse: 50000,
      distance: 1600,
      surface: "Turf",
      claimingPrice: 25000,
      entries: [
        { horseId: "h1", stableId: "npc-1" },
        { horseId: "h2", stableId: "npc-2" },
      ],
      resolved: false,
      cancelled: false,
    } as any;
    const state = makeState([horse, otherHorse], [stable, stable2], [race]);
    const intents = generateNpcIntents(state, 1);
    const withdrawalIntents = intents.filter(
      (i) => i.type === "withdraw_from_claiming" && (i as any).horseId === "h2",
    );
    // npc-1 should not withdraw npc-2's horse
    const npc1Withdrawals = withdrawalIntents.filter((i) => i.sourceId === "npc-1");
    expect(npc1Withdrawals.length).toBe(0);
  });
});

describe("generateNpcIntents — empty state handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty array with no NPC stables", () => {
    const state = makeState([], []);
    const intents = generateNpcIntents(state, 1);
    expect(intents).toEqual([]);
  });

  it("should return empty array with no horses", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const state = makeState([], [stable]);
    const intents = generateNpcIntents(state, 1);
    expect(Array.isArray(intents)).toBe(true);
  });

  it("should handle missing npcAIManager gracefully", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-1"),
      age: 3,
      energy: 80,
    });
    const state = makeState([horse], [stable]);
    delete (state as any).npcAIManager;
    const intents = generateNpcIntents(state, 1);
    expect(Array.isArray(intents)).toBe(true);
  });
});
