import { describe, it, expect } from "vitest";
import {
  calculateShareSale,
  calculateSharePurchase,
  calculateSharePrice,
  createSyndicationAIState,
  recordSyndicationOutcome,
  shouldCreateSyndicateWithLearning,
  getSyndicationSuccessRate,
} from "@/core/ai/syndicationAI";
import type { Horse, Stable } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";

function makeStallion(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "s1",
    name: "Champ",
    gender: "horse",
    age: 8,
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [{ raceId: "r1", raceName: "G1", position: 1, day: 100, grade: "G1" }],
    stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 0 },
    owned: true,
    fame: 50,
    lifetimeEarnings: 1000000,
    careerStarts: 10,
    careerWins: 5,
    distanceAptitude: 0.5,
    surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
    climbingAptitude: 0.5,
    corneringAptitude: 0.5,
    injuryProneness: 0.5,
    height: 16,
    weight: 1000,
    heartScore: 100,
    fiberBias: "balanced",
    strideType: "balanced",
    trackPreference: "balanced",
    mudAptitude: 0.5,
    trainability: 0.5,
    peakAge: 5,
    recoveryRate: 0.5,
    fertility: 0.5,
    foalingEase: 0.5,
    markings: [],
    bleederRisk: 0.5,
    roarerRisk: 0.5,
    ...overrides,
  } as unknown as Horse;
}

function makeStable(id: string, personality: string, cash: number): Stable {
  return {
    id,
    name: `Stable ${id}`,
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 0,
    cash,
    horses: [],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: personality as any,
    staff: {} as any,
    outposts: [],
  } as unknown as Stable;
}

function makeSyndicate(
  shareHolders: Record<string, number>,
  totalShares = 40,
  sharePrice = 10000,
): Syndicate {
  return {
    id: "syn-s1",
    stallionId: "s1",
    stallionName: "Champ",
    totalShares,
    shareHolders,
    sharePrice,
    studFee: 50000,
    isPublic: true,
    lifetimeEarnings: 0,
  };
}

describe("syndicationAI - calculateShareSale", () => {
  it("conservative NPC avoids devolution when owner", () => {
    // NPC owns 22/40, is current owner. Needs cash (triggers sale).
    // Threshold = 20. maxSellable = 22 - 20 - 1 = 1
    const stallion = makeStallion({ stableId: "npc1" });
    const syndicate = makeSyndicate({ npc1: 22, player: 10 });
    // Cash < 100k triggers needsCash, but >= 50k so not cashCritical
    const stable = makeStable("npc1", "conservative", 80000);

    const result = calculateShareSale(stable, syndicate, stallion);
    // Should sell only 1 (maxSellable = 22 - 20 - 1 = 1) instead of 11
    expect(result).toBe(1);
  });

  it("conservative NPC sells freely when not owner", () => {
    const stallion = makeStallion({ stableId: undefined }); // player-owned
    const syndicate = makeSyndicate({ npc1: 10, player: 25 });
    // Cash < 100k triggers needsCash
    const stable = makeStable("npc1", "conservative", 80000);

    const result = calculateShareSale(stable, syndicate, stallion);
    // Not owner, sell freely: 50% of 10 = 5
    expect(result).toBe(5);
  });

  it("aggressive NPC sells even if devolution", () => {
    const stallion = makeStallion({ stableId: "npc1" });
    const syndicate = makeSyndicate({ npc1: 22, player: 10 });
    // Cash < 100k triggers needsCash, but >= 50k so not cashCritical
    const stable = makeStable("npc1", "aggressive", 80000);

    const result = calculateShareSale(stable, syndicate, stallion);
    // Aggressive: sell 50% of 22 = 11, even though it causes devolution
    expect(result).toBe(11);
  });

  it("conservative NPC forced to sell when cash-critical", () => {
    const stallion = makeStallion({ stableId: "npc1" });
    const syndicate = makeSyndicate({ npc1: 22, player: 10 });
    // Cash < $50k is cashCritical — sell even if it causes devolution
    const stable = makeStable("npc1", "conservative", 30000);

    const result = calculateShareSale(stable, syndicate, stallion);
    // Cash-critical: sell 50% of 22 = 11, even though it causes devolution
    expect(result).toBe(11);
  });

  it("returns 0 when no reason to sell", () => {
    const stallion = makeStallion({ stableId: "npc1" });
    const syndicate = makeSyndicate({ npc1: 22, player: 10 });
    const stable = makeStable("npc1", "conservative", 500000);

    // sharePrice 10000, fairPrice ~15250 -> not overvalued
    // age 8, not declining. cash 500k, not needsCash.
    const result = calculateShareSale(stable, syndicate, stallion);
    expect(result).toBe(0);
  });
});

describe("syndicationAI - calculateSharePurchase", () => {
  it("aggressive NPC attempts takeover when possible", () => {
    // 60 total shares, threshold = 30. Player 15, npc1 10, 35 unissued.
    // maxShares = floor(60 * 0.3) = 18. available = 18 - 10 = 8.
    // Player 15 <= 30, npc1 needs 15+1-10 = 6 shares. 6 <= 8, affordable.
    const stallion = makeStallion({ stableId: undefined }); // player-owned
    const syndicate = makeSyndicate({ player: 15, npc1: 10 }, 60, 10000);
    const stable = makeStable("npc1", "aggressive", 1000000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    // Should buy exactly 6 to trigger devolution
    expect(result).toBe(6);
  });

  it("aggressive NPC buys normally when takeover impossible", () => {
    // 60 total shares. Owner has 35, npc1 has 5. 35 > 30, no devolution possible.
    // maxShares = 18, available = 13, affordable = 100, sharesToBuy = 13
    // 25% of 13 = 3
    const stallion = makeStallion({ stableId: undefined });
    const syndicate = makeSyndicate({ player: 35, npc1: 5 }, 60, 10000);
    const stable = makeStable("npc1", "aggressive", 1000000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(13);
  });

  it("prestige NPC attempts takeover for elite stallion (3+ G1 wins)", () => {
    const eliteStallion = makeStallion({
      stableId: undefined,
      raceHistory: [
        { raceId: "r1", raceName: "G1", position: 1, day: 100, grade: "G1" },
        { raceId: "r2", raceName: "G1", position: 1, day: 110, grade: "G1" },
        { raceId: "r3", raceName: "G1", position: 1, day: 120, grade: "G1" },
      ],
    });
    // 60 shares, player 15, npc1 10. threshold = 30. needed = 6.
    const syndicate = makeSyndicate({ player: 15, npc1: 10 }, 60, 10000);
    const stable = makeStable("npc1", "prestige", 1000000);

    const result = calculateSharePurchase(stable, syndicate, eliteStallion);
    expect(result).toBe(6); // Takeover amount
  });

  it("prestige NPC does not attempt takeover for non-elite stallion", () => {
    const stallion = makeStallion({ stableId: undefined }); // 1 G1 win
    // 60 shares, player 15, npc1 10. Takeover possible but stallion not elite enough.
    const syndicate = makeSyndicate({ player: 15, npc1: 10 }, 60, 10000);
    const stable = makeStable("npc1", "prestige", 1000000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    // Not elite enough, use 25% of affordable
    // maxShares = 18, available = 8, affordable = 100, sharesToBuy = 8, 25% = 2
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(8);
  });

  it("conservative NPC uses normal purchase logic", () => {
    const stallion = makeStallion({ stableId: undefined });
    // 60 shares, player 15, npc1 10. Takeover possible but conservative won't.
    const syndicate = makeSyndicate({ player: 15, npc1: 10 }, 60, 10000);
    const stable = makeStable("npc1", "conservative", 1000000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    // No takeover ambition, 25% of affordable
    // maxShares = 18, available = 8, affordable = 100, sharesToBuy = 8, 25% = 2
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(8);
  });

  it("respects cash limits for takeover", () => {
    const stallion = makeStallion({ stableId: undefined });
    // 60 shares, player 15, npc1 10. Takeover needs 6.
    // calculateSharePrice uses stallion value, not syndicate.sharePrice.
    // For 1 G1 win, $1M earnings: value ~610k, sharePrice ~10167.
    // With cash = 20000: maxAffordable = 1. Takeover needs 6, not affordable.
    // Fall back to 25% of min(8, 1) = 0.
    const syndicate = makeSyndicate({ player: 15, npc1: 10 }, 60, 50000);
    const stable = makeStable("npc1", "aggressive", 20000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    // Can't afford takeover, fall back to 25% of 1 = 0
    expect(result).toBe(0);
  });

  it("returns 0 when already at max ownership", () => {
    const stallion = makeStallion({ stableId: undefined });
    // 40 shares, 30% cap = 12. npc1 has 12.
    const syndicate = makeSyndicate({ player: 10, npc1: 12 }, 40, 10000);
    const stable = makeStable("npc1", "aggressive", 1000000);

    const result = calculateSharePurchase(stable, syndicate, stallion);
    expect(result).toBe(0);
  });
});

describe("personality-driven syndicate creation with learning", () => {
  it("creates syndicate when base criteria met and no history", () => {
    const stable = makeStable("npc1", "aggressive", 500000);
    const stallion = makeStallion({ stableId: "npc1" });
    const aiState = createSyndicationAIState(stable);

    const result = shouldCreateSyndicateWithLearning(aiState, stable, stallion, {});
    expect(result).toBe(true);
  });

  it("blocks creation when past success rate is low and history is long", () => {
    const stable = makeStable("npc1", "conservative", 500000);
    const stallion = makeStallion({ stableId: "npc1" });
    let aiState = createSyndicationAIState(stable);

    for (let i = 0; i < 4; i++) {
      aiState = recordSyndicationOutcome(
        aiState,
        {
          stallionId: `sire-${i}`,
          stableId: "npc1",
          action: "create",
          shares: 20,
          value: 100000,
          day: 100 + i,
          success: false,
        },
        100 + i,
      );
    }

    const result = shouldCreateSyndicateWithLearning(aiState, stable, stallion, {});
    expect(result).toBe(false);
  });

  it("allows creation when success rate is high", () => {
    const stable = makeStable("npc1", "aggressive", 500000);
    const stallion = makeStallion({ stableId: "npc1" });
    let aiState = createSyndicationAIState(stable);

    for (let i = 0; i < 5; i++) {
      aiState = recordSyndicationOutcome(
        aiState,
        {
          stallionId: `sire-${i}`,
          stableId: "npc1",
          action: "create",
          shares: 20,
          value: 150000,
          day: 100 + i,
          success: true,
        },
        100 + i,
      );
    }

    const result = shouldCreateSyndicateWithLearning(aiState, stable, stallion, {});
    expect(result).toBe(true);
  });

  it("blocks creation for low-confidence stable with mediocre success", () => {
    const stable = makeStable("npc1", "conservative", 500000);
    const stallion = makeStallion({ stableId: "npc1" });
    let aiState = createSyndicationAIState(stable);

    // Record enough failures to push strategyConfidence below 0.4
    // recordOutcome reduces confidence by (1 - successRate) * adaptationSpeed
    // when total >= 5 and successRate < threshold
    for (let i = 0; i < 8; i++) {
      aiState = recordSyndicationOutcome(
        aiState,
        {
          stallionId: `sire-fail-${i}`,
          stableId: "npc1",
          action: "create",
          shares: 20,
          value: 50000,
          day: 100 + i,
          success: false,
        },
        100 + i,
      );
    }

    const result = shouldCreateSyndicateWithLearning(aiState, stable, stallion, {});
    expect(result).toBe(false);
  });
});

describe("recordSyndicationOutcome — learning feedback loop", () => {
  it("records decision to history", () => {
    const stable = makeStable("npc1", "aggressive", 500000);
    const aiState = createSyndicationAIState(stable);

    const result = recordSyndicationOutcome(
      aiState,
      {
        stallionId: "s1",
        stableId: "npc1",
        action: "create",
        shares: 20,
        value: 100000,
        day: 100,
        success: true,
      },
      100,
    );
    expect(result.syndicationHistory).toHaveLength(1);
    expect(result.syndicationHistory[0].stallionId).toBe("s1");
  });

  it("trims history to personality memory depth", () => {
    const stable = makeStable("npc1", "aggressive", 500000);
    let aiState = createSyndicationAIState(stable);
    const memoryDepth = aiState.personalityState.memoryDepth;

    for (let i = 0; i < memoryDepth + 5; i++) {
      aiState = recordSyndicationOutcome(
        aiState,
        {
          stallionId: `s-${i}`,
          stableId: "npc1",
          action: "buy",
          shares: 1,
          value: 1000,
          day: i,
          success: true,
        },
        i,
      );
    }

    expect(aiState.syndicationHistory.length).toBeLessThanOrEqual(memoryDepth);
  });

  it("updates learning state with outcome", () => {
    const stable = makeStable("npc1", "aggressive", 500000);
    const aiState = createSyndicationAIState(stable);

    const result = recordSyndicationOutcome(
      aiState,
      {
        stallionId: "s1",
        stableId: "npc1",
        action: "create",
        shares: 20,
        value: 100000,
        day: 100,
        success: true,
      },
      100,
    );

    const successRate = getSyndicationSuccessRate(result, "create");
    expect(successRate).toBeGreaterThan(0);
  });
});
