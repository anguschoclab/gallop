import { describe, expect, it } from "vitest";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import {
  earningsPremium,
  horseMarketValue,
  marketValueBlend,
} from "@/domains/horse/simulation/pricing";
import {
  calculateLotValuation,
  npcBaseValuation,
} from "@/domains/auction/simulation/auctionValuation";
import { calculateMaxBid } from "@/domains/agents/simulation/auctionBidding";
import type { Horse } from "@/platform/game/types";

const STATS = { speed: 75, stamina: 75, acceleration: 75, consistency: 75, temperament: 60, conformation: 60 };

function stallion(over: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "sire",
    age: 8,
    gender: "horse",
    fame: 20,
    fanCount: 0,
    raceHistory: [],
    lifetimeEarnings: 0,
    stats: STATS,
    ...over,
  } as Partial<Horse>);
}

const AT_STUD = {
  atStud: true,
  standingFee: 20_000,
  bookSize: 40,
  seasonBookings: 0,
  lifetimeFoals: 0,
  lifetimeStakesFoals: 0,
  lifetimeG1Foals: 0,
  retiredOnDay: 1,
} as Horse["stud"];

describe("rival stables value stallions by stud fees", () => {
  it("a stallion standing at a $20,000 fee is worth more to rivals than the same horse not at stud", () => {
    const stable = createTestStable({ personality: "win-now", tier: "mid", cash: 10_000_000 });
    const plain = calculateLotValuation(stallion(), stable, "mixed", []);
    const atStud = calculateLotValuation(stallion({ stud: AT_STUD }), stable, "mixed", []);
    expect(atStud).toBeGreaterThan(plain * 3);
  });

  it("weights a stallion at stud 15% racing / 90% breeding", () => {
    expect(marketValueBlend(stallion({ stud: AT_STUD }))).toMatchObject({
      racingWeight: 0.15,
      breedingWeight: 0.9,
      phase: "at stud",
    });
  });

  it("breeder stables no longer discount a stallion that is already standing at stud", () => {
    const breeder = createTestStable({ personality: "breeder", tier: "budget" });
    const h = stallion({ stud: AT_STUD });
    expect(calculateLotValuation(h, breeder, "mixed", [])).toBeGreaterThanOrEqual(
      horseMarketValue(h, []),
    );
  });
});

describe("rival stables value racing earnings", () => {
  it("earnings premium: none at $0, +15.6% at $100,000, capped at +50%", () => {
    expect(earningsPremium({ lifetimeEarnings: 0, raceHistory: [] })).toBe(1);
    expect(earningsPremium({ lifetimeEarnings: 100_000, raceHistory: [] })).toBeCloseTo(
      1 + Math.log10(11) * 0.15,
      6,
    );
    expect(earningsPremium({ lifetimeEarnings: 1e12, raceHistory: [] })).toBe(1.5);
  });

  it("uses summed race purses when the recorded total is lower", () => {
    const history = [{ raceId: "r", raceName: "R", position: 1, day: 5, purseEarned: 100_000 }];
    expect(earningsPremium({ lifetimeEarnings: 0, raceHistory: history })).toBeCloseTo(
      1 + Math.log10(11) * 0.15,
      6,
    );
  });

  it("a $500,000 earner is valued higher by rivals than an identical horse with no earnings", () => {
    const stable = createTestStable({ personality: "win-now", tier: "mid", cash: 10_000_000 });
    const gelding = (e: number) => stallion({ gender: "gelding", gelded: true, age: 5, lifetimeEarnings: e });
    expect(calculateLotValuation(gelding(500_000), stable, "racing_age", [])).toBeGreaterThan(
      calculateLotValuation(gelding(0), stable, "racing_age", []),
    );
  });
});

describe("rival bids start from the auction-house price", () => {
  it("a budget-tier stable's base valuation equals the auction-house market value", () => {
    const h = stallion({ stud: AT_STUD, lifetimeEarnings: 250_000 });
    expect(npcBaseValuation(h, { tier: "budget" }, [])).toBe(horseMarketValue(h, []));
  });

  it("mid and elite stables pay 10% and 25% over it", () => {
    const h = stallion({ lifetimeEarnings: 250_000 });
    const market = horseMarketValue(h, []);
    expect(npcBaseValuation(h, { tier: "mid" }, [])).toBe(Math.round(market * 1.1));
    expect(npcBaseValuation(h, { tier: "elite" }, [])).toBe(Math.round(market * 1.25));
  });

  it("the AI bidder caps at the valuation it is given, not a rating-only estimate", () => {
    const h = stallion({ stud: AT_STUD });
    const stable = createTestStable({ tier: "budget" });
    const ai = {
      personalityState: { conservatism: 0.2 },
      portfolio: { budgetRemaining: 100_000_000 },
      learningState: { outcomes: [], successRates: {} },
    } as never;
    const lot = { id: "l", horseId: h.id, saleId: "s", reservePrice: 0, passed: false, withdrawn: false, bidHistory: [] } as never;
    // riskTolerance 1.2 for low conservatism.
    expect(calculateMaxBid(ai, h, lot, stable, 1, 0, 500_000)).toBe(600_000);
  });
});

describe("which sale ring a stallion is priced for", () => {
  it("a stallion at stud sells as breeding stock (mixed sale), not as a racehorse", async () => {
    const { saleKindForHorse } = await import("@/domains/market/simulation/valuationBreakdown");
    expect(saleKindForHorse(stallion({ stud: AT_STUD }))).toBe("mixed");
    expect(saleKindForHorse(stallion())).toBe("racing_age");
  });
});
