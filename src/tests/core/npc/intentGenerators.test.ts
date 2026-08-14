import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import {
  assessWorldState,
  generateStrategicDirectives,
  allocateBudget,
  coordinateSubsystems,
} from "@/core/ai/strategicCoordinator";
import { updateStableAIState } from "@/core/ai/npcCycleAI";
import type { GameState, Stable } from "@/game/types";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

// Define a mock instance variable to control throw behavior
let shouldThrowForStable1 = false;

// Mock the AI module so we can control when it throws
vi.mock("@/core/ai/npcCycleAI", () => ({
  getOrCreateStableAIState: vi.fn((manager: any, stable: Stable, _day: number) => {
    if (stable.id === "stable1" && shouldThrowForStable1) {
      throw new Error("Simulated AI error for stable 1");
    }
    // Return the actual state from manager if it exists, otherwise default
    const existing = manager?.stableStates?.[stable.id];
    if (existing) {
      return { ...existing, stableId: stable.id };
    }
    return { id: stable.id, stableId: stable.id };
  }),
  updateStableAIState: vi.fn((state: any) => ({ ...state, updated: true })),
}));

// Mock the strategic coordinator
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

describe("generateNpcIntents error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should catch errors for a specific stable and continue processing others", () => {
    shouldThrowForStable1 = true;

    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: {
        stableStates: {},
      },
    } as unknown as GameState;

    const intents = generateNpcIntents(mockState, 1);

    expect(Array.isArray(intents)).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to generate intents for NPC",
      "stable1",
      expect.any(Error),
    );

    const warnCallArgs = (console.warn as any).mock.calls.find(
      (call: any) => call[1] === "stable1",
    );
    expect(warnCallArgs).toBeDefined();
    expect(warnCallArgs[2].message).toBe("Simulated AI error for stable 1");
  });
});

describe("generateNpcIntents coordination integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls assessWorldState once per intent generation cycle", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    expect(assessWorldState).toHaveBeenCalledTimes(1);
  });

  it("calls generateStrategicDirectives for each NPC stable", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    expect(generateStrategicDirectives).toHaveBeenCalledTimes(2);
  });

  it("calls allocateBudget for each NPC stable", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    expect(allocateBudget).toHaveBeenCalledTimes(2);
  });

  it("calls coordinateSubsystems for each NPC stable", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    expect(coordinateSubsystems).toHaveBeenCalledTimes(2);
  });

  it("stores strategicDirectives and budgetAllocation on stableAI state", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    const lastCall = vi.mocked(updateStableAIState).mock.calls[0];
    expect(lastCall).toBeDefined();
    const passedState = lastCall[0];
    expect(passedState.strategicDirectives).toBeDefined();
    expect(passedState.budgetAllocation).toBeDefined();
  });

  it("does not call coordination functions when npcAIManager is missing", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
    } as unknown as GameState;

    generateNpcIntents(mockState, 1);
    expect(assessWorldState).not.toHaveBeenCalled();
  });

  it("does not call assessWorldState when cached worldAssessment is provided", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },
    } as unknown as GameState;

    const cachedAssessment = {
      playerDominance: 0.5,
      regionalPowerBalance: {},
      economicTrends: { studFeeTrend: 0, yearlingPriceIndex: 100, claimingMarketActivity: 0 },
      breedingMarketSaturation: 0.3,
      upcomingMajorRaces: [],
    };

    generateNpcIntents(mockState, 1, cachedAssessment);
    expect(assessWorldState).not.toHaveBeenCalled();
  });
});

describe("generateNpcIntents diplomacy-aware claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not generate claiming intents for horses owned by allied stables", () => {
    const mockState = {
      horses: {
        "horse-ally": {
          id: "horse-ally",
          name: "Ally Horse",
          stableId: "stable2",
          age: 4,
          gender: "horse",
          energy: 80,
          form: 60,
          stats: {
            speed: 70,
            stamina: 70,
            acceleration: 70,
            consistency: 70,
            temperament: 50,
            conformation: 50,
          },
          recoveryPoints: 80,
          lifetimeEarnings: 0,
          careerStarts: 5,
          careerWins: 1,
          healthStatus: "healthy",
          healthStatusDay: 1,
          isBlueHen: false,
          gelded: false,
          foalingEase: 50,
          heterozygosity: 0.5,
          distanceAptitude: 1600,
          surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
          mudAptitude: 0.5,
          corneringAptitude: 0.5,
          climbingAptitude: 0.5,
          peakAge: 5,
          strideType: "average",
          trackPreference: "balanced",
          runningStyle: "E",
          bleederRisk: 0,
          roarerRisk: 0,
          ocdRisk: 0,
          recoveryRate: 50,
          trainability: 50,
          heartScore: 50,
          bloodline: "unknown",
          fiberBias: "average",
          fame: 0,
          owned: false,
          racingViable: true,
          lifecycleStatus: "active",
          courseVisits: {},
          birthDay: 1,
          hemisphere: "Northern",
          silk: "",
          sireName: "",
          damName: "",
          pedigree: {} as any,
          genotype: {} as any,
          potential: 70,
        },
      },
      pregnancies: [],
      races: {
        "race-1": {
          id: "race-1",
          name: "Claiming Race",
          day: 5,
          distance: 1600,
          surface: "Dirt",
          raceClass: "Claiming",
          claimingPrice: 25000,
          purse: 30000,
          fieldSize: 8,
          entries: [{ horseId: "horse-ally", stableId: "stable2", owned: false }],
          resolved: false,
        },
      },
      npcStables: [
        createTestStable({
          id: "stable1",
          country: "USA",
          personality: "aggressive",
          cash: 200000,
        }),
        createTestStable({ id: "stable2", country: "USA", personality: "breeder", cash: 200000 }),
      ],
      npcAIManager: {
        stableStates: {
          stable1: {
            stableId: "stable1",
            npcRelationships: {
              stable2: {
                trust: 70,
                allianceType: "breeding_partnership",
                allianceSinceDay: 1,
                history: [],
              },
            },
          },
          stable2: {},
        },
        globalDay: 1,
        regionalKings: {},
      },
      jockeys: [],
    } as unknown as GameState;

    const intents = generateNpcIntents(mockState, 1);
    const claimingIntents = intents.filter((i) => i.type === "claiming");
    // Should not claim the ally's horse
    expect(claimingIntents.length).toBe(0);
  });
});

describe("generateNpcIntents diplomatic intent generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates diplomatic_action intents when trust is high", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: {
        stableStates: {
          stable1: {
            stableId: "stable1",
            npcRelationships: {
              stable2: {
                trust: 80,
                allianceType: null,
                history: [],
              },
            },
          },
          stable2: {
            stableId: "stable2",
            npcRelationships: {
              stable1: {
                trust: 80,
                allianceType: null,
                history: [],
              },
            },
          },
        },
        globalDay: 1,
        regionalKings: {},
      },
      jockeys: [],
    } as unknown as GameState;

    // Find a day where stable1's hash mod 7 === 0
    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const diplomaticIntents = intents.filter((i) => i.type === "diplomatic_action");
    expect(diplomaticIntents.length).toBeGreaterThan(0);
    const proposeIntents = diplomaticIntents.filter(
      (i) => (i as { action: string }).action === "propose_alliance",
    );
    expect(proposeIntents.length).toBeGreaterThan(0);
  });

  it("generates break_alliance intents when trust drops below 20", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: {
        stableStates: {
          stable1: {
            stableId: "stable1",
            npcRelationships: {
              stable2: {
                trust: 10,
                allianceType: "racing_coalition",
                history: [],
              },
            },
          },
          stable2: {
            stableId: "stable2",
            npcRelationships: {
              stable1: {
                trust: 10,
                allianceType: "racing_coalition",
                history: [],
              },
            },
          },
        },
        globalDay: 1,
        regionalKings: {},
      },
      jockeys: [],
    } as unknown as GameState;

    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const diplomaticIntents = intents.filter((i) => i.type === "diplomatic_action");
    const breakIntents = diplomaticIntents.filter(
      (i) => (i as { action: string }).action === "break_alliance",
    );
    expect(breakIntents.length).toBeGreaterThan(0);
  });

  it("generates cartel_action intents when high-trust unaffiliated partners exist", () => {
    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "trader" }),
        createTestStable({ id: "stable2", country: "USA", personality: "trader" }),
        createTestStable({ id: "stable3", country: "USA", personality: "trader" }),
      ],
      npcAIManager: {
        stableStates: {
          stable1: {
            stableId: "stable1",
            npcRelationships: {
              stable2: { trust: 65, allianceType: null, history: [] },
              stable3: { trust: 70, allianceType: null, history: [] },
            },
          },
          stable2: {
            stableId: "stable2",
            npcRelationships: {
              stable1: { trust: 65, allianceType: null, history: [] },
            },
          },
          stable3: {
            stableId: "stable3",
            npcRelationships: {
              stable1: { trust: 70, allianceType: null, history: [] },
            },
          },
        },
        globalDay: 1,
        regionalKings: {},
      },
      jockeys: [],
    } as unknown as GameState;

    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const cartelIntents = intents.filter((i) => i.type === "cartel_action");
    expect(cartelIntents.length).toBeGreaterThan(0);
  });
});

describe("generateNpcIntents auction consignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates consignment intents when auction weight is high and suitable horses exist", () => {
    // Horse that is an underperformer: age > 5, low rating
    const horse = createTestHorse({
      id: "horse-old",
      name: "Old Underperformer",
      age: 8,
      stableId: "stable1",
      energy: 50,
      form: 30,
      stats: {
        speed: 20,
        stamina: 20,
        acceleration: 20,
        consistency: 20,
        temperament: 20,
        conformation: 20,
      },
    });

    const mockState = {
      horses: { "horse-old": horse },
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: {
        stableStates: {},
        globalDay: 1,
        regionalKings: {},
      },
      auctions: [
        {
          id: "sale-1",
          name: "Test Sale",
          kind: "mixed",
          day: 10,
          lots: [],
          resolved: false,
        },
      ],
      jockeys: [],
    } as unknown as GameState;

    // Find a day where stable1's hash mod 7 === 0 (weekly cadence)
    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const consignmentIntents = intents.filter((i) => i.type === "consignment");
    expect(consignmentIntents.length).toBeGreaterThan(0);
  });

  it("generates no consignment intents when no active auctions exist", () => {
    const horse = createTestHorse({
      id: "horse-old",
      name: "Old Underperformer",
      age: 8,
      stableId: "stable1",
      energy: 50,
      form: 30,
      stats: {
        speed: 20,
        stamina: 20,
        acceleration: 20,
        consistency: 20,
        temperament: 20,
        conformation: 20,
      },
    });

    const mockState = {
      horses: { "horse-old": horse },
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: {
        stableStates: {},
        globalDay: 1,
        regionalKings: {},
      },
      auctions: [],
      jockeys: [],
    } as unknown as GameState;

    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const consignmentIntents = intents.filter((i) => i.type === "consignment");
    expect(consignmentIntents.length).toBe(0);
  });

  it("generates no consignment intents when auction weight is 0", () => {
    const horse = createTestHorse({
      id: "horse-old",
      name: "Old Underperformer",
      age: 8,
      stableId: "stable1",
      energy: 50,
      form: 30,
      stats: {
        speed: 20,
        stamina: 20,
        acceleration: 20,
        consistency: 20,
        temperament: 20,
        conformation: 20,
      },
    });

    // Set up stableAI state with auction weight = 0
    const stableAI = {
      id: "stable1",
      stableId: "stable1",
      subsystemWeights: {
        raceEntry: 1.0,
        training: 1.0,
        auction: 0,
        claiming: 1.0,
        breeding: 1.0,
        facility: 1.0,
        market: 1.0,
        upkeep: 1.0,
      },
    };

    const mockState = {
      horses: { "horse-old": horse },
      pregnancies: [],
      races: {},
      npcStables: [createTestStable({ id: "stable1", country: "USA", personality: "aggressive" })],
      npcAIManager: {
        stableStates: { stable1: stableAI },
        globalDay: 1,
        regionalKings: {},
      },
      auctions: [
        {
          id: "sale-1",
          name: "Test Sale",
          kind: "mixed",
          day: 10,
          lots: [],
          resolved: false,
        },
      ],
      jockeys: [],
    } as unknown as GameState;

    const stableHash = "stable1"
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const day = (7 - (stableHash % 7)) % 7 || 7;

    const intents = generateNpcIntents(mockState, day);
    const consignmentIntents = intents.filter((i) => i.type === "consignment");
    expect(consignmentIntents.length).toBe(0);
  });
});
