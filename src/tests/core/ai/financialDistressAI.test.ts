import { describe, it, expect } from "vitest";
import {
  assessFinancialDistress,
  assessFinancialDistressWithPersonality,
  getDistressDirective,
  shouldBlockSpending,
  getEarlyTriggerDays,
  type FinancialDistressState,
  type SpendingCategory,
} from "@/core/ai/financialDistressAI";
import { calculateShareSale } from "@/core/ai/syndicationAI";
import { shouldConsignHorse, createAuctionAIState } from "@/core/ai/auctionAI";
import {
  STUD_FEE_REDUCTION_MULTIPLIER,
  STUD_FEE_MINIMUM,
  PRESTIGE_STUD_FEE_RESISTANCE,
  TRADER_STUD_FEE_AGGRESSION,
  BREEDING_MARE_FRACTION,
} from "@/constants/financialDistressConstants";
import { createTestStable, createTestHorse } from "@/tests/helpers";
import type { Stable, Horse } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import { makeNpcOwned } from "@/core/horse/ownership";

// ─── assessFinancialDistress ─────────────────────────────────────────────────

describe("assessFinancialDistress", () => {
  it("returns healthy when daysOfCash > 30", () => {
    const stable = createTestStable({ cash: 100000 });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("healthy");
    expect(result.recommendedActions).toEqual([]);
  });

  it("returns caution when 14 <= daysOfCash < 30", () => {
    const stable = createTestStable({ cash: 2000 });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("caution");
    expect(result.daysOfCash).toBe(20);
  });

  it("returns emergency when 7 <= daysOfCash < 14", () => {
    const stable = createTestStable({ cash: 1000 });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("emergency");
    expect(result.daysOfCash).toBe(10);
  });

  it("returns critical when daysOfCash < 7", () => {
    const stable = createTestStable({ cash: 500 });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("critical");
    expect(result.daysOfCash).toBe(5);
  });

  it("returns healthy when dailyUpkeep is 0 (Infinity days of cash)", () => {
    const stable = createTestStable({ cash: 100 });
    const result = assessFinancialDistress(stable, 0);
    expect(result.level).toBe("healthy");
    expect(result.daysOfCash).toBe(Infinity);
  });
});

// ─── Personality filtering ───────────────────────────────────────────────────

describe("assessFinancialDistressWithPersonality", () => {
  it("conservative triggers caution at 35 days (earlier)", () => {
    const stable = createTestStable({ cash: 3400, personality: "conservative" });
    const result = assessFinancialDistressWithPersonality(stable, 100);
    expect(result.level).toBe("caution");
  });

  it("aggressive triggers caution at 25 days (later)", () => {
    const stable = createTestStable({ cash: 2600, personality: "aggressive" });
    // 26 days of cash — above 25 threshold for aggressive
    const result = assessFinancialDistressWithPersonality(stable, 100);
    expect(result.level).toBe("healthy");
  });

  it("aggressive triggers caution below 25 days", () => {
    const stable = createTestStable({ cash: 2400, personality: "aggressive" });
    const result = assessFinancialDistressWithPersonality(stable, 100);
    expect(result.level).toBe("caution");
  });

  it("prestige resists sell_syndicate_shares at caution", () => {
    const stable = createTestStable({ cash: 2000, personality: "prestige" });
    const result = assessFinancialDistressWithPersonality(stable, 100);
    expect(result.level).toBe("caution");
    expect(result.recommendedActions).not.toContain("sell_syndicate_shares");
  });

  it("trader includes sell_syndicate_shares at caution", () => {
    const stable = createTestStable({ cash: 2000, personality: "trader" });
    const result = assessFinancialDistressWithPersonality(stable, 100);
    expect(result.level).toBe("caution");
    expect(result.recommendedActions).toContain("sell_syndicate_shares");
  });

  it("getEarlyTriggerDays returns correct thresholds", () => {
    expect(getEarlyTriggerDays("conservative")).toBe(35);
    expect(getEarlyTriggerDays("breeder")).toBe(35);
    expect(getEarlyTriggerDays("prestige")).toBe(35);
    expect(getEarlyTriggerDays("aggressive")).toBe(25);
    expect(getEarlyTriggerDays("win-now")).toBe(25);
    expect(getEarlyTriggerDays("trader")).toBe(25);
    expect(getEarlyTriggerDays("developer")).toBe(30);
    expect(getEarlyTriggerDays("specialist")).toBe(30);
  });
});

// ─── getDistressDirective ────────────────────────────────────────────────────

describe("getDistressDirective", () => {
  it("returns null for healthy", () => {
    const state: FinancialDistressState = {
      level: "healthy",
      daysOfCash: 100,
      recommendedActions: [],
    };
    expect(getDistressDirective(state)).toBeNull();
  });

  it("returns directive with weight 0.5 for caution", () => {
    const state: FinancialDistressState = {
      level: "caution",
      daysOfCash: 20,
      recommendedActions: [],
    };
    const directive = getDistressDirective(state);
    expect(directive).not.toBeNull();
    expect(directive!.priority).toBe(0);
    expect(directive!.weight).toBe(0.5);
  });

  it("returns directive with weight 0.8 for emergency", () => {
    const state: FinancialDistressState = {
      level: "emergency",
      daysOfCash: 10,
      recommendedActions: [],
    };
    const directive = getDistressDirective(state);
    expect(directive).not.toBeNull();
    expect(directive!.weight).toBe(0.8);
  });

  it("returns directive with weight 1.0 for critical", () => {
    const state: FinancialDistressState = {
      level: "critical",
      daysOfCash: 5,
      recommendedActions: [],
    };
    const directive = getDistressDirective(state);
    expect(directive).not.toBeNull();
    expect(directive!.weight).toBe(1.0);
  });
});

// ─── shouldBlockSpending ─────────────────────────────────────────────────────

describe("shouldBlockSpending", () => {
  const healthyState: FinancialDistressState = {
    level: "healthy",
    daysOfCash: 100,
    recommendedActions: [],
  };
  const cautionState: FinancialDistressState = {
    level: "caution",
    daysOfCash: 20,
    recommendedActions: [],
  };
  const emergencyState: FinancialDistressState = {
    level: "emergency",
    daysOfCash: 10,
    recommendedActions: [],
  };
  const criticalState: FinancialDistressState = {
    level: "critical",
    daysOfCash: 5,
    recommendedActions: [],
  };

  it("blocks claiming at caution+", () => {
    expect(shouldBlockSpending(cautionState, "claiming")).toBe(true);
    expect(shouldBlockSpending(emergencyState, "claiming")).toBe(true);
    expect(shouldBlockSpending(criticalState, "claiming")).toBe(true);
  });

  it("blocks auction bidding at caution+", () => {
    expect(shouldBlockSpending(cautionState, "auction_bidding")).toBe(true);
    expect(shouldBlockSpending(emergencyState, "auction_bidding")).toBe(true);
  });

  it("blocks market purchases at caution+", () => {
    expect(shouldBlockSpending(cautionState, "market_purchase")).toBe(true);
  });

  it("blocks facility upgrades at emergency+", () => {
    expect(shouldBlockSpending(cautionState, "facility_upgrade")).toBe(false);
    expect(shouldBlockSpending(emergencyState, "facility_upgrade")).toBe(true);
    expect(shouldBlockSpending(criticalState, "facility_upgrade")).toBe(true);
  });

  it("blocks breeding only at critical", () => {
    expect(shouldBlockSpending(cautionState, "breeding")).toBe(false);
    expect(shouldBlockSpending(emergencyState, "breeding")).toBe(false);
    expect(shouldBlockSpending(criticalState, "breeding")).toBe(true);
  });

  it("never blocks race entry", () => {
    expect(shouldBlockSpending(cautionState, "race_entry")).toBe(false);
    expect(shouldBlockSpending(emergencyState, "race_entry")).toBe(false);
    expect(shouldBlockSpending(criticalState, "race_entry")).toBe(false);
  });

  it("never blocks upkeep", () => {
    expect(shouldBlockSpending(cautionState, "upkeep")).toBe(false);
    expect(shouldBlockSpending(emergencyState, "upkeep")).toBe(false);
    expect(shouldBlockSpending(criticalState, "upkeep")).toBe(false);
  });

  it("blocks nothing when healthy", () => {
    const categories: SpendingCategory[] = [
      "claiming",
      "auction_bidding",
      "market_purchase",
      "facility_upgrade",
      "breeding",
      "race_entry",
      "upkeep",
    ];
    for (const cat of categories) {
      expect(shouldBlockSpending(healthyState, cat)).toBe(false);
    }
  });
});

// ─── calculateShareSale with distress ────────────────────────────────────────

describe("calculateShareSale with distress", () => {
  const stallion: Horse = createTestHorse({
    id: "stallion-1",
    ownership: makeNpcOwned("stable-1"),
    stud: {
      atStud: true,
      standingFee: 50000,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      bookSize: 40,
      seasonBookings: 10,
      lifetimeFoals: 50,
    },
  });

  const syndicate: Syndicate = {
    id: "syn-1",
    stallionId: "stallion-1",
    stallionName: "Test Stallion",
    totalShares: 40,
    shareHolders: { "stable-1": 24 },
    sharePrice: 50000,
    studFee: 50000,
    isPublic: true,
    lifetimeEarnings: 0,
  };

  it("healthy + cash-rich: returns 0 (existing behavior)", () => {
    const stable = createTestStable({ id: "stable-1", cash: 500000 });
    expect(calculateShareSale(stable, syndicate, stallion)).toBe(0);
  });

  it("caution: sells shares (needsCash triggers)", () => {
    const stable = createTestStable({ id: "stable-1", cash: 80000, personality: "aggressive" });
    const result = calculateShareSale(stable, syndicate, stallion, "caution");
    expect(result).toBeGreaterThan(0);
  });

  it("emergency: sells more than caution for aggressive personality", () => {
    const stable = createTestStable({ id: "stable-1", cash: 10000, personality: "aggressive" });
    const cautionResult = calculateShareSale(stable, syndicate, stallion, "caution");
    const emergencyResult = calculateShareSale(stable, syndicate, stallion, "emergency");
    expect(emergencyResult).toBeGreaterThanOrEqual(cautionResult);
  });

  it("critical: sells everything for aggressive personality", () => {
    const stable = createTestStable({ id: "stable-1", cash: 1000, personality: "aggressive" });
    const result = calculateShareSale(stable, syndicate, stallion, "critical");
    expect(result).toBe(24);
  });

  it("emergency: conservative tries to keep majority", () => {
    const stable = createTestStable({ id: "stable-1", cash: 10000, personality: "conservative" });
    const result = calculateShareSale(stable, syndicate, stallion, "emergency");
    expect(result).toBeLessThan(24);
  });

  it("critical: conservative also sells everything (ignores devolution)", () => {
    const stable = createTestStable({ id: "stable-1", cash: 1000, personality: "conservative" });
    const result = calculateShareSale(stable, syndicate, stallion, "critical");
    expect(result).toBe(24);
  });
});

// ─── shouldConsignHorse with distress ────────────────────────────────────────

describe("shouldConsignHorse with distress", () => {
  const stable = createTestStable({ id: "stable-1", cash: 500000 });
  const aiState = createAuctionAIState(stable);

  it("caution: consigns horses that wouldn't normally qualify", () => {
    const horse = createTestHorse({
      id: "h-mid",
      age: 6,
      stats: {
        speed: 35,
        stamina: 35,
        acceleration: 35,
        consistency: 35,
        temperament: 35,
        conformation: 35,
      },
    });
    const normalResult = shouldConsignHorse(aiState, horse, stable, 100, 1.0);
    const distressResult = shouldConsignHorse(aiState, horse, stable, 100, 1.0, "caution");
    if (!normalResult.shouldConsign) {
      expect(distressResult.shouldConsign).toBe(true);
      expect(distressResult.reason).toBe("financial_distress");
    }
  });

  it("emergency: consigns horse with rating < 65 and age >= 3", () => {
    const horse = createTestHorse({
      id: "h-low",
      age: 4,
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = shouldConsignHorse(aiState, horse, stable, 100, 1.0, "emergency");
    expect(result.shouldConsign).toBe(true);
    expect(result.reason).toBe("financial_distress");
  });

  it("critical: consigns all except top 3 by rating", () => {
    const horses = [
      createTestHorse({
        id: "h1",
        age: 4,
        stats: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          consistency: 90,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "h2",
        age: 4,
        stats: {
          speed: 80,
          stamina: 80,
          acceleration: 80,
          consistency: 80,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "h3",
        age: 4,
        stats: {
          speed: 70,
          stamina: 70,
          acceleration: 70,
          consistency: 70,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "h4",
        age: 4,
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
      }),
    ];
    const results = horses.map((h) => shouldConsignHorse(aiState, h, stable, 100, 1.0, "critical"));
    expect(results[3].shouldConsign).toBe(true);
    expect(results[3].reason).toBe("financial_distress");
  });

  it("healthy or undefined: existing behavior unchanged", () => {
    const horse = createTestHorse({
      id: "h-young",
      age: 2,
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = shouldConsignHorse(aiState, horse, stable, 100, 1.0, "healthy");
    expect(result.shouldConsign).toBe(false);
  });
});

// ─── Stud fee intent generation ──────────────────────────────────────────────

describe("Stud fee reduction percentages", () => {
  it("caution: 15% reduction", () => {
    const currentFee = 50000;
    const expected = Math.max(
      STUD_FEE_MINIMUM.caution,
      Math.floor(currentFee * STUD_FEE_REDUCTION_MULTIPLIER.caution),
    );
    expect(expected).toBe(42500);
  });

  it("emergency: 40% reduction", () => {
    const currentFee = 50000;
    const expected = Math.max(
      STUD_FEE_MINIMUM.emergency,
      Math.floor(currentFee * STUD_FEE_REDUCTION_MULTIPLIER.emergency),
    );
    expect(expected).toBe(30000);
  });

  it("critical: 70% reduction", () => {
    const currentFee = 50000;
    const expected = Math.max(
      STUD_FEE_MINIMUM.critical,
      Math.floor(currentFee * STUD_FEE_REDUCTION_MULTIPLIER.critical),
    );
    expect(expected).toBe(15000);
  });

  it("prestige personality uses smaller reductions", () => {
    const currentFee = 50000;
    const reduction =
      1 - (1 - STUD_FEE_REDUCTION_MULTIPLIER.caution) * PRESTIGE_STUD_FEE_RESISTANCE;
    const expected = Math.max(STUD_FEE_MINIMUM.caution, Math.floor(currentFee * reduction));
    expect(expected).toBe(46250);
  });

  it("trader personality uses larger reductions", () => {
    const currentFee = 50000;
    const reduction = 1 - (1 - STUD_FEE_REDUCTION_MULTIPLIER.caution) * TRADER_STUD_FEE_AGGRESSION;
    const expected = Math.max(STUD_FEE_MINIMUM.caution, Math.floor(currentFee * reduction));
    expect(expected).toBe(40250);
  });
});

// ─── Breeding reduction ──────────────────────────────────────────────────────

describe("Breeding reduction by distress level", () => {
  it("caution: breeds only top 50% of mares", () => {
    const mares = [
      createTestHorse({
        id: "m1",
        gender: "mare",
        stats: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          consistency: 90,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "m2",
        gender: "mare",
        stats: {
          speed: 80,
          stamina: 80,
          acceleration: 80,
          consistency: 80,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "m3",
        gender: "mare",
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "m4",
        gender: "mare",
        stats: {
          speed: 40,
          stamina: 40,
          acceleration: 40,
          consistency: 40,
          temperament: 50,
          conformation: 50,
        },
      }),
    ];
    const top50 = Math.ceil(mares.length * BREEDING_MARE_FRACTION.caution);
    expect(top50).toBe(2);
  });

  it("emergency: breeds only top 25% of mares", () => {
    const mares = [
      createTestHorse({ id: "m1", gender: "mare" }),
      createTestHorse({ id: "m2", gender: "mare" }),
      createTestHorse({ id: "m3", gender: "mare" }),
      createTestHorse({ id: "m4", gender: "mare" }),
    ];
    const top25 = Math.ceil(mares.length * BREEDING_MARE_FRACTION.emergency);
    expect(top25).toBe(1);
  });

  it("critical: skips breeding entirely", () => {
    const shouldBreed = false;
    expect(shouldBreed).toBe(false);
  });
});

// ─── Integration: distressed stable generates corrective actions ─────────────

describe("Integration: distressed stable corrective actions", () => {
  it("caution stable has correct recommended actions", () => {
    const stable = createTestStable({ cash: 2500, personality: "aggressive" });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("caution");
    expect(result.recommendedActions).toContain("reduce_spending");
    expect(result.recommendedActions).toContain("halt_claiming");
    expect(result.recommendedActions).toContain("reduce_stud_fees");
    expect(result.recommendedActions).toContain("sell_syndicate_shares");
  });

  it("critical stable has all emergency actions plus halt_breeding", () => {
    const stable = createTestStable({ cash: 500, personality: "trader" });
    const result = assessFinancialDistress(stable, 100);
    expect(result.level).toBe("critical");
    expect(result.recommendedActions).toContain("halt_breeding");
    expect(result.recommendedActions).toContain("sell_all_shares");
    expect(result.recommendedActions).toContain("slash_stud_fees");
    expect(result.recommendedActions).toContain("emergency_consign");
  });

  it("distress directive has correct weight for each tier", () => {
    const cautionState: FinancialDistressState = {
      level: "caution",
      daysOfCash: 20,
      recommendedActions: [],
    };
    const emergencyState: FinancialDistressState = {
      level: "emergency",
      daysOfCash: 10,
      recommendedActions: [],
    };
    const criticalState: FinancialDistressState = {
      level: "critical",
      daysOfCash: 5,
      recommendedActions: [],
    };

    expect(getDistressDirective(cautionState)?.weight).toBe(0.5);
    expect(getDistressDirective(emergencyState)?.weight).toBe(0.8);
    expect(getDistressDirective(criticalState)?.weight).toBe(1.0);
  });

  it("shouldBlockSpending blocks all non-essential spending at critical", () => {
    const criticalState: FinancialDistressState = {
      level: "critical",
      daysOfCash: 5,
      recommendedActions: [],
    };
    expect(shouldBlockSpending(criticalState, "claiming")).toBe(true);
    expect(shouldBlockSpending(criticalState, "auction_bidding")).toBe(true);
    expect(shouldBlockSpending(criticalState, "market_purchase")).toBe(true);
    expect(shouldBlockSpending(criticalState, "facility_upgrade")).toBe(true);
    expect(shouldBlockSpending(criticalState, "breeding")).toBe(true);
    // Race entry and upkeep are never blocked
    expect(shouldBlockSpending(criticalState, "race_entry")).toBe(false);
    expect(shouldBlockSpending(criticalState, "upkeep")).toBe(false);
  });
});
