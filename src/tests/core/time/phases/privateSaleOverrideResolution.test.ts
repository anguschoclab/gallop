import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";
import type { PipelineContext } from "@/core/time/pipeline";
import { createRng } from "@/core/common/rng";
import { privateSaleResolutionPhase } from "@/core/time/phases/privateSaleResolution";
import { privateSaleExpiryPhase } from "@/core/time/phases/privateSaleExpiry";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 60,
    potential: 90,
    careerStarts: 10,
    careerWins: 7,
    lifetimeEarnings: 500_000,
    fanCount: 1000,
    ...overrides,
  });

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "stable-1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["horse-1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
    ...overrides,
  }) as Stable;

const mkOverrideOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: asHorseId("horse-1"),
  fromStableId: undefined,
  toStableId: asStableId("stable-1"),
  amount: 50000,
  status: "override_pending",
  createdDay: 5,
  expiresDay: 8,
  overrideType: "diplomatic",
  overrideAmount: 55000,
  ...overrides,
});

const createContext = (
  state: Partial<GameState>,
  newDay = 10,
  rng?: any,
): PipelineContext =>
  createMockPipelineContext({
    state: { ...makeGameState(), ...state } as GameState,
    newDay,
    dailyRng: rng ?? createRng(0),
  });

describe("privateSaleOverrideResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("premium override offer accepted immediately", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const offer = mkOverrideOffer({
      overrideType: "premium",
      overrideAmount: 75000,
    });

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [offer],
    });
    const result = privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("accepted");

    const transferImpacts = result.impacts.filter((i) => i.type === "horse_transfer");
    expect(transferImpacts).toHaveLength(1);
    expect(transferImpacts[0].price).toBe(75000);
  });

  it("diplomatic override success — horse transferred at success cost", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const successCost = 55000;
    const offer = mkOverrideOffer({
      overrideType: "diplomatic",
      overrideAmount: successCost,
    });

    // Mock RNG to always return 0.0 (guaranteed success)
    const mockRng = { next: () => 0.0 } as any;
    const ctx = createContext(
      {
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [offer],
      },
      10,
      mockRng,
    );
    const result = privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("accepted");

    const transferImpacts = result.impacts.filter((i) => i.type === "horse_transfer");
    expect(transferImpacts).toHaveLength(1);
    expect(transferImpacts[0].price).toBe(successCost);
  });

  it("diplomatic override failure — offer set to override_failed, no transfer", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const offer = mkOverrideOffer({
      overrideType: "diplomatic",
      overrideAmount: 55000,
    });

    // Mock RNG to always return 0.99 (guaranteed failure)
    const mockRng = { next: () => 0.99 } as any;
    const ctx = createContext(
      {
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [offer],
      },
      10,
      mockRng,
    );
    const result = privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("override_failed");

    const transferImpacts = result.impacts.filter((i) => i.type === "horse_transfer");
    expect(transferImpacts).toHaveLength(0);
  });

  it("diplomatic override failure — friction increased", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const offer = mkOverrideOffer({
      overrideType: "diplomatic",
      overrideAmount: 55000,
    });

    const mockRng = { next: () => 0.99 } as any;
    const initialFriction = 30;
    const ctx = createContext(
      {
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [offer],
        npcAIManager: {
          stableStates: {
            "stable-1": {
              friction: initialFriction,
              winsAgainstPlayer: 0,
              regionalPrestige: {},
              lastUpdateDay: 1,
              personalityState: {} as any,
              learningState: {} as any,
            },
          },
        } as any,
      },
      10,
      mockRng,
    );
    const result = privateSaleResolutionPhase.execute(ctx);
    const updatedFriction =
      result.state.npcAIManager?.stableStates?.["stable-1"]?.friction;
    expect(updatedFriction).toBeGreaterThan(initialFriction);
  });

  it("diplomatic override failure — friction clamped at max (100)", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const offer = mkOverrideOffer({
      overrideType: "diplomatic",
      overrideAmount: 55000,
    });

    const mockRng = { next: () => 0.99 } as any;
    const ctx = createContext(
      {
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [offer],
        npcAIManager: {
          stableStates: {
            "stable-1": {
              friction: 95,
              winsAgainstPlayer: 0,
              regionalPrestige: {},
              lastUpdateDay: 1,
              personalityState: {} as any,
              learningState: {} as any,
            },
          },
        } as any,
      },
      10,
      mockRng,
    );
    const result = privateSaleResolutionPhase.execute(ctx);
    const updatedFriction =
      result.state.npcAIManager?.stableStates?.["stable-1"]?.friction;
    expect(updatedFriction).toBeLessThanOrEqual(100);
  });

  it("override_pending offer expires correctly", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const offer = mkOverrideOffer({ expiresDay: 8 });

    const ctx = createContext(
      {
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [offer],
      },
      10, // newDay > expiresDay
    );
    const result = privateSaleExpiryPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("expired");
  });
});
