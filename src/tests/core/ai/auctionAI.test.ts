import { describe, it, expect } from "vitest";
import {
  createAuctionAIState,
  calculateBiddingValue,
  calculateMaxBid,
  shouldBidOnHorse,
  calculateBidIncrement,
  shouldConsignHorse,
  recordBiddingDecision,
  recordConsignmentDecision,
  getAuctionInsights,
} from "@/core/ai/auctionAI";
import type { Horse, Stable, AuctionLot } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
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
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    ...overrides,
  });
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockAuctionLot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return {
    id: "lot-1",
    horseId: "horse-1",
    consignorStableId: "stable-2",
    saleId: "sale-1",
    reservePrice: 50000,
    passed: false,
    withdrawn: false,
    ...overrides,
  };
}

describe("createAuctionAIState", () => {
  it("initializes portfolio with prestige → targetHorseCount=15", () => {
    const stable = createMockStable({ personality: "prestige" });
    const state = createAuctionAIState(stable);
    expect(state.portfolio.targetHorseCount).toBe(15);
  });

  it("initializes portfolio with non-prestige → targetHorseCount=10", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createAuctionAIState(stable);
    expect(state.portfolio.targetHorseCount).toBe(10);
  });

  it("initializes budgetRemaining = stable.cash", () => {
    const stable = createMockStable({ cash: 200000 });
    const state = createAuctionAIState(stable);
    expect(state.portfolio.budgetRemaining).toBe(200000);
  });

  it("initializes qualityTarget = 60", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    expect(state.portfolio.qualityTarget).toBe(60);
  });

  it("initializes empty histories", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    expect(state.biddingHistory).toEqual([]);
    expect(state.consignmentHistory).toEqual([]);
  });
});

describe("calculateBiddingValue", () => {
  it("returns a number in 0-100 range", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot();
    const value = calculateBiddingValue(state, horse, lot, stable, 1);
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("higher score for undervalued horses", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const goodHorse = createMockHorse({
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const poorHorse = createMockHorse({
      stats: {
        speed: 30,
        stamina: 30,
        acceleration: 30,
        consistency: 30,
        temperament: 50,
        conformation: 50,
      },
    });
    const cheapLot = createMockAuctionLot({ reservePrice: 1000 });
    const expensiveLot = createMockAuctionLot({ reservePrice: 200000 });
    const goodScore = calculateBiddingValue(state, goodHorse, cheapLot, stable, 1);
    const poorScore = calculateBiddingValue(state, poorHorse, expensiveLot, stable, 1);
    expect(goodScore).toBeGreaterThan(poorScore);
  });

  it("strategic bonus: +10 if portfolio needs horses", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    // currentHorseCount=0 < targetHorseCount=10 → +10
    const horse = createMockHorse();
    const lot = createMockAuctionLot();
    const value = calculateBiddingValue(state, horse, lot, stable, 1);
    expect(value).toBeGreaterThan(0);
  });

  it("strategic bonus: +5 if age count < 3", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const lot = createMockAuctionLot();
    // ageDistribution is empty, so ageCount=0 < 3 → +5
    const value = calculateBiddingValue(state, horse, lot, stable, 1);
    expect(value).toBeGreaterThan(0);
  });

  it("strategic bonus: +10 if rating >= qualityTarget", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
    });
    const lot = createMockAuctionLot();
    // rating=80 >= qualityTarget=60 → +10
    const value = calculateBiddingValue(state, horse, lot, stable, 1);
    expect(value).toBeGreaterThan(0);
  });
});

describe("calculateMaxBid", () => {
  it("base = rating * 1000, adjusted by risk tolerance", () => {
    const stable = createMockStable({ cash: 1000000, personality: "aggressive" });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse(); // rating=70
    const lot = createMockAuctionLot();
    const maxBid = calculateMaxBid(state, horse, lot, stable, 1);
    // aggressive: conservatism < 0.5 → *1.2, capped at 30% of budget
    // base=70000, *1.2=84000, budgetShare=1000000*0.3=300000 → min(84000, 300000) = 84000
    expect(maxBid).toBe(84000);
  });

  it("conservative: *0.8 risk tolerance", () => {
    const stable = createMockStable({ cash: 1000000, personality: "conservative" });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse(); // rating=70
    const lot = createMockAuctionLot();
    const maxBid = calculateMaxBid(state, horse, lot, stable, 1);
    // base=70000, *0.8=56000, budgetShare=300000 → min(56000, 300000) = 56000
    expect(maxBid).toBe(56000);
  });

  it("capped at 30% of budgetRemaining", () => {
    const stable = createMockStable({ cash: 100000, personality: "aggressive" });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const lot = createMockAuctionLot();
    const maxBid = calculateMaxBid(state, horse, lot, stable, 1);
    // base=90000, *1.2=108000, budgetShare=100000*0.3=30000 → min(108000, 30000) = 30000
    expect(maxBid).toBe(30000);
  });

  it("returns floored integer", () => {
    const stable = createMockStable({ cash: 1000000, personality: "aggressive" });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({
      stats: {
        speed: 71,
        stamina: 71,
        acceleration: 71,
        consistency: 71,
        temperament: 50,
        conformation: 50,
      },
    });
    const lot = createMockAuctionLot();
    const maxBid = calculateMaxBid(state, horse, lot, stable, 1);
    expect(Number.isInteger(maxBid)).toBe(true);
  });
});

describe("shouldBidOnHorse", () => {
  it("returns false if cash < reservePrice", () => {
    const stable = createMockStable({ cash: 1000 });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot({ reservePrice: 50000 });
    expect(shouldBidOnHorse(state, horse, lot, stable, 1)).toBe(false);
  });

  it("returns false if currentBid > cash", () => {
    const stable = createMockStable({ cash: 10000 });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot({ reservePrice: 1000, hammerPrice: 20000 });
    expect(shouldBidOnHorse(state, horse, lot, stable, 1)).toBe(false);
  });

  it("returns a boolean when conditions are met", () => {
    const stable = createMockStable({ cash: 1000000 });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot({ reservePrice: 1000 });
    const result = shouldBidOnHorse(state, horse, lot, stable, 1);
    expect(typeof result).toBe("boolean");
  });
});

describe("calculateBidIncrement", () => {
  it("base = max(100, currentBid * 0.05)", () => {
    const increment = calculateBidIncrement(10000, 50000, 0.5);
    // base = max(100, 500) = 500, * (1+0.5) = 750, remaining=40000 → min(750, 40000) = 750
    expect(increment).toBe(750);
  });

  it("minimum increment is 100 when currentBid is low", () => {
    const increment = calculateBidIncrement(100, 50000, 0);
    // base = max(100, 5) = 100, * (1+0) = 100, remaining=49900 → min(100, 49900) = 100
    expect(increment).toBe(100);
  });

  it("capped at remaining (maxBid - currentBid)", () => {
    const increment = calculateBidIncrement(49000, 50000, 1);
    // base = max(100, 2450) = 2450, * (1+1) = 4900, remaining=1000 → min(4900, 1000) = 1000
    expect(increment).toBe(1000);
  });

  it("returns 0 or negative when currentBid >= maxBid", () => {
    const increment = calculateBidIncrement(50000, 50000, 0.5);
    // remaining = 0, min(anything, 0) = 0
    expect(increment).toBe(0);
  });
});

describe("shouldConsignHorse", () => {
  it("returns false for age < 3", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 2 });
    expect(shouldConsignHorse(state, horse, stable, 1).shouldConsign).toBe(false);
  });

  it("returns underperformer for rating < 40 and age > 5", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({
      age: 6,
      stats: {
        speed: 30,
        stamina: 30,
        acceleration: 30,
        consistency: 30,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = shouldConsignHorse(state, horse, stable, 1);
    expect(result.shouldConsign).toBe(true);
    expect(result.reason).toBe("underperformer");
  });

  it("returns surplus when currentHorseCount > targetHorseCount + 2", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    // Set portfolio to have surplus
    const stateWithSurplus = {
      ...state,
      portfolio: {
        ...state.portfolio,
        currentHorseCount: 13, // target=10, 13 > 10+2=12
      },
    };
    const horse = createMockHorse({ age: 4 });
    const result = shouldConsignHorse(stateWithSurplus, horse, stable, 1);
    expect(result.shouldConsign).toBe(true);
    expect(result.reason).toBe("surplus");
  });

  it("returns rebalancing when ageCount > 4 and age > 6", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const stateWithAgeDist = {
      ...state,
      portfolio: {
        ...state.portfolio,
        ageDistribution: { 7: 5 },
      },
    };
    const horse = createMockHorse({ age: 7 });
    const result = shouldConsignHorse(stateWithAgeDist, horse, stable, 1);
    expect(result.shouldConsign).toBe(true);
    expect(result.reason).toBe("rebalancing");
  });

  it("returns retirement for age >= 10 and rating < 50", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({
      age: 10,
      stats: {
        speed: 40,
        stamina: 40,
        acceleration: 40,
        consistency: 40,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = shouldConsignHorse(state, horse, stable, 1);
    expect(result.shouldConsign).toBe(true);
    expect(result.reason).toBe("retirement");
  });

  it("returns false for a normal healthy horse", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 4 });
    expect(shouldConsignHorse(state, horse, stable, 1).shouldConsign).toBe(false);
  });
});

describe("recordBiddingDecision", () => {
  it("adds to biddingHistory and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot();
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordBiddingDecision(
        currentState,
        horse,
        lot,
        stable,
        50000,
        40000,
        false,
        i + 1,
      );
    }
    expect(currentState.biddingHistory.length).toBe(memoryDepth);
  });

  it("won=true: portfolio updates count++, budgetRemaining-=finalBid, ageDist++", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const lot = createMockAuctionLot();
    const newState = recordBiddingDecision(state, horse, lot, stable, 50000, 40000, true, 100);
    expect(newState.portfolio.currentHorseCount).toBe(1);
    expect(newState.portfolio.budgetRemaining).toBe(100000 - 40000);
    expect(newState.portfolio.ageDistribution[3]).toBe(1);
  });

  it("won=false: portfolio unchanged", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 3 });
    const lot = createMockAuctionLot();
    const newState = recordBiddingDecision(state, horse, lot, stable, 50000, 40000, false, 100);
    expect(newState.portfolio.currentHorseCount).toBe(0);
    expect(newState.portfolio.budgetRemaining).toBe(100000);
  });

  it("updates learningState", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot();
    const newState = recordBiddingDecision(state, horse, lot, stable, 50000, 40000, true, 100);
    expect(newState.learningState.outcomes.length).toBeGreaterThan(0);
  });
});

describe("recordConsignmentDecision", () => {
  it("adds to consignmentHistory and trims to memoryDepth", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 8 });
    const memoryDepth = state.personalityState.memoryDepth;
    let currentState = state;
    for (let i = 0; i < memoryDepth + 3; i++) {
      currentState = recordConsignmentDecision(
        currentState,
        horse,
        "underperformer",
        10000,
        stable,
        i + 1,
      );
    }
    expect(currentState.consignmentHistory.length).toBe(memoryDepth);
  });

  it("portfolio: currentHorseCount-- (min 0), ageDistribution[age]-- (min 0)", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const stateWithHorses = {
      ...state,
      portfolio: {
        ...state.portfolio,
        currentHorseCount: 5,
        ageDistribution: { 8: 3 },
      },
    };
    const horse = createMockHorse({ age: 8 });
    const newState = recordConsignmentDecision(
      stateWithHorses,
      horse,
      "surplus",
      10000,
      stable,
      100,
    );
    expect(newState.portfolio.currentHorseCount).toBe(4);
    expect(newState.portfolio.ageDistribution[8]).toBe(2);
  });

  it("currentHorseCount does not go below 0", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const horse = createMockHorse({ age: 8 });
    const newState = recordConsignmentDecision(state, horse, "surplus", 10000, stable, 100);
    expect(newState.portfolio.currentHorseCount).toBe(0);
  });
});

describe("getAuctionInsights", () => {
  it("returns defaults for empty history", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const insights = getAuctionInsights(state, "stable-1");
    expect(insights.totalBids).toBe(0);
    expect(insights.winRate).toBe(0.5);
    expect(insights.avgValue).toBe(0);
    expect(insights.totalConsignments).toBe(0);
    expect(insights.sellRate).toBe(0.5);
  });

  it("filters bidding by stableId", () => {
    const stable = createMockStable({ id: "stable-1" });
    const state = createAuctionAIState(stable);
    const horse = createMockHorse();
    const lot = createMockAuctionLot();
    const stateWithBid = recordBiddingDecision(state, horse, lot, stable, 50000, 40000, true, 100);
    const insights = getAuctionInsights(stateWithBid, "stable-1");
    expect(insights.totalBids).toBe(1);
    expect(insights.winRate).toBe(1.0);
  });

  it("portfolioHealth = currentHorseCount / targetHorseCount", () => {
    const stable = createMockStable();
    const state = createAuctionAIState(stable);
    const stateWithHorses = {
      ...state,
      portfolio: {
        ...state.portfolio,
        currentHorseCount: 5,
      },
    };
    const insights = getAuctionInsights(stateWithHorses, "stable-1");
    expect(insights.portfolioHealth).toBe(5 / 10);
  });
});
