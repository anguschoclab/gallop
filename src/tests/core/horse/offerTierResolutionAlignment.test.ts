import { describe, it, expect } from "vitest";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable, StablePersonality } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";
import { calculateLotValuation } from "@/core/auction/engine";
import {
  evaluateHorseAttachment,
  attachmentAdjustedAsk,
  suggestedOfferTiers,
} from "@/core/horse/attachment";
import { privateSaleResolutionPhase } from "@/core/time/phases/privateSaleResolution";

const ALL_PERSONALITIES: StablePersonality[] = [
  "aggressive",
  "conservative",
  "developer",
  "win-now",
  "specialist",
  "breeder",
  "trader",
  "prestige",
];

const ACCEPT_THRESHOLDS: Record<StablePersonality, number> = {
  aggressive: 0.7,
  conservative: 1.0,
  developer: 0.9,
  "win-now": 1.0,
  specialist: 1.0,
  breeder: 1.1,
  trader: 0.8,
  prestige: 1.3,
};

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 40,
    potential: 82,
    careerStarts: 10,
    careerWins: 6,
    lifetimeEarnings: 300_000,
    fanCount: 800,
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

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: asHorseId("horse-1"),
  fromStableId: undefined,
  toStableId: asStableId("stable-1"),
  amount: 50000,
  status: "pending",
  createdDay: 5,
  expiresDay: 8,
  ...overrides,
});

const createContext = (state: Partial<GameState>, newDay = 10) =>
  createMockPipelineContext({
    state: { ...makeGameState(), ...state } as GameState,
    newDay,
  });

describe("offerTierResolutionAlignment", () => {
  it("resolution valuation matches dialog valuation (calculateLotValuation)", () => {
    const horse = mkHorse();
    const allHorses = [horse];

    for (const personality of ALL_PERSONALITIES) {
      const stable = mkStable({ personality });
      const dialogValuation = calculateLotValuation(horse, stable, "racing_age", allHorses);

      // The resolution phase should use calculateLotValuation, so the valuation
      // computed from the dialog should match what the resolution phase uses.
      // We verify by checking that the offerRatio = amount / (dialogValuation * askMultiplier)
      // matches the resolution outcome.
      const ask = attachmentAdjustedAsk(horse, stable, dialogValuation);
      const tiers = suggestedOfferTiers(ask);
      const fairRatio = tiers.fair / ask;

      const ctx = createContext({
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [mkOffer({ amount: tiers.fair })],
      });
      const result = privateSaleResolutionPhase.execute(ctx);
      const offer = result.state.privateSaleOffers![0];

      // If fairRatio >= acceptThreshold, offer should be accepted
      if (fairRatio >= ACCEPT_THRESHOLDS[personality]) {
        expect(offer.status).toBe("accepted");
      } else {
        expect(offer.status).not.toBe("accepted");
      }
    }
  });

  it("fair offer accepted for personalities with acceptThreshold <= 1.0", () => {
    const horse = mkHorse();
    const allHorses = [horse];

    for (const personality of ALL_PERSONALITIES) {
      if (ACCEPT_THRESHOLDS[personality] > 1.0) continue;

      const stable = mkStable({ personality });
      const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
      const ask = attachmentAdjustedAsk(horse, stable, valuation);
      const tiers = suggestedOfferTiers(ask);

      const ctx = createContext({
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [mkOffer({ amount: tiers.fair })],
      });
      const result = privateSaleResolutionPhase.execute(ctx);
      const offer = result.state.privateSaleOffers![0];
      expect(offer.status).toBe("accepted");
    }
  });

  it("generous offer accepted for all personalities", () => {
    const horse = mkHorse();
    const allHorses = [horse];

    for (const personality of ALL_PERSONALITIES) {
      const stable = mkStable({ personality });
      const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
      const ask = attachmentAdjustedAsk(horse, stable, valuation);
      const tiers = suggestedOfferTiers(ask);

      const ctx = createContext({
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [mkOffer({ amount: tiers.generous })],
      });
      const result = privateSaleResolutionPhase.execute(ctx);
      const offer = result.state.privateSaleOffers![0];
      expect(offer.status).toBe("accepted");
    }
  });

  it("lowball offer declined or countered for personalities with acceptThreshold > 0.75", () => {
    const horse = mkHorse();
    const allHorses = [horse];

    for (const personality of ALL_PERSONALITIES) {
      // Skip aggressive (0.7) since lowball ratio ~0.75 > 0.7
      if (ACCEPT_THRESHOLDS[personality] <= 0.75) continue;

      const stable = mkStable({ personality });
      const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
      const ask = attachmentAdjustedAsk(horse, stable, valuation);
      const tiers = suggestedOfferTiers(ask);

      const ctx = createContext({
        horses: h2r([horse]),
        npcStables: [stable],
        privateSaleOffers: [mkOffer({ amount: tiers.lowball })],
      });
      const result = privateSaleResolutionPhase.execute(ctx);
      const offer = result.state.privateSaleOffers![0];
      expect(offer.status).not.toBe("accepted");
    }
  });

  it("fair offer ratio is >= 1.0 after rounding", () => {
    const testAskValues = [12500, 33750, 50000, 75000, 100000, 250000, 500000];

    for (const ask of testAskValues) {
      const tiers = suggestedOfferTiers(ask);
      const ratio = tiers.fair / ask;
      expect(ratio).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("generous offer ratio >= max accept threshold (1.3)", () => {
    const testAskValues = [12500, 33750, 50000, 75000, 100000, 250000, 500000];

    for (const ask of testAskValues) {
      const tiers = suggestedOfferTiers(ask);
      const ratio = tiers.generous / ask;
      expect(ratio).toBeGreaterThanOrEqual(1.3);
    }
  });
});
