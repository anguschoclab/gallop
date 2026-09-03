import { describe, it, expect, afterEach } from "vitest";
import {
  getBaseSyndicationAppetite,
  getSyndicationAppetite,
  getSyndicateIntent,
  SYNDICATE_INTENT_META,
} from "@/core/ai/syndicationAppetite";
import {
  setSyndicationTuningOverrides,
  resetSyndicationTuningOverrides,
} from "@/core/ai/syndicationTuning";
import { evaluateSharePurchase, calculateSharePurchase } from "@/core/ai/syndicationAIDecisions";
import type { Horse, Stable, StablePersonality } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { makePlayerOwned } from "@/core/horse/ownership";

type GradedWins = number | { g1?: number; g2?: number; g3?: number };

function makeStallion(wins: GradedWins, overrides: Partial<Horse> = {}): Horse {
  const g1 = typeof wins === "number" ? wins : (wins.g1 ?? 0);
  const g2 = typeof wins === "number" ? 0 : (wins.g2 ?? 0);
  const g3 = typeof wins === "number" ? 0 : (wins.g3 ?? 0);
  const raceHistory = [
    ...Array.from({ length: g1 }, (_, i) => ({
      raceId: `g1-${i}`,
      raceName: "Big One",
      position: 1,
      day: 100 + i,
      grade: "G1",
    })),
    ...Array.from({ length: g2 }, (_, i) => ({
      raceId: `g2-${i}`,
      raceName: "G2 Stakes",
      position: 1,
      day: 200 + i,
      grade: "G2",
    })),
    ...Array.from({ length: g3 }, (_, i) => ({
      raceId: `g3-${i}`,
      raceName: "G3 Stakes",
      position: 1,
      day: 300 + i,
      grade: "G3",
    })),
  ];
  return {
    id: "stallion1",
    name: "Champ",
    gender: "horse",
    age: 8,
    potential: 85,
    fame: 60,
    lifetimeEarnings: 4_000_000,
    ownership: makePlayerOwned(),
    stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 20 },
    raceHistory,
    ...overrides,
  } as unknown as Horse;
}

function makeSyndicate(overrides: Partial<Syndicate> = {}): Syndicate {
  return {
    id: "syn1",
    stallionId: "stallion1",
    stallionName: "Champ",
    totalShares: 40,
    sharePrice: 10_000,
    studFee: 50_000,
    lifetimeEarnings: 1_000_000,
    shareHolders: { player: 40 },
    ...overrides,
  } as unknown as Syndicate;
}

function stable(personality: StablePersonality, cash: number, id = "npc1"): Stable {
  return createTestStable({ id, personality, cash });
}

afterEach(() => resetSyndicationTuningOverrides());

describe("syndicationAppetite", () => {
  it("scales stake appetite by personality tier", () => {
    const aggressive = getSyndicationAppetite("aggressive");
    const conservative = getSyndicationAppetite("conservative");

    expect(aggressive.stakeCapPct).toBeGreaterThan(conservative.stakeCapPct);
    expect(aggressive.buyFraction).toBeGreaterThan(conservative.buyFraction);
    expect(aggressive.cashFraction).toBeGreaterThan(conservative.cashFraction);
    expect(aggressive.chasesControl).toBe(true);
    expect(conservative.chasesControl).toBe(false);
  });

  it("gates quality-sensitive personalities behind G1 wins", () => {
    expect(getSyndicationAppetite("prestige").minG1Wins).toBeGreaterThan(0);
    expect(getSyndicationAppetite("specialist").minG1Wins).toBeGreaterThan(0);
    expect(getSyndicationAppetite("aggressive").minG1Wins).toBe(0);
  });

  it("exposes graded G2/G3 quality gates on quality-sensitive personalities", () => {
    const prestige = getSyndicationAppetite("prestige");
    const specialist = getSyndicationAppetite("specialist");
    expect(prestige.minG2Wins).toBeGreaterThan(0);
    expect(specialist.minG3Wins).toBeGreaterThan(0);
    // Permissive personalities have zero graded gates across all grades
    expect(getSyndicationAppetite("aggressive").minG2Wins).toBe(0);
    expect(getSyndicationAppetite("aggressive").minG3Wins).toBe(0);
  });

  it("matches base table for personalities the tuning file leaves at 1×", () => {
    expect(getSyndicationAppetite("breeder")).toEqual(getBaseSyndicationAppetite("breeder"));
  });

  it("maps personalities to a player-facing intent with metadata", () => {
    expect(getSyndicateIntent("aggressive")).toBe("aggressive");
    expect(getSyndicateIntent("trader")).toBe("trader");
    expect(getSyndicateIntent("developer")).toBe("conservative");
    expect(SYNDICATE_INTENT_META[getSyndicateIntent("prestige")].label).toBe("Prestige");
  });
});

describe("syndication tuning layer", () => {
  it("applies personality multipliers", () => {
    const base = getSyndicationAppetite("conservative");
    setSyndicationTuningOverrides({
      personalities: { conservative: { stakeCapMultiplier: 2, buyFractionMultiplier: 2 } },
    });
    const tuned = getSyndicationAppetite("conservative");
    expect(tuned.stakeCapPct).toBeCloseTo(base.stakeCapPct * 2, 5);
    expect(tuned.buyFraction).toBeCloseTo(base.buyFraction * 2, 5);
  });

  it("applies global multipliers on top of personality ones", () => {
    const base = getSyndicationAppetite("developer");
    setSyndicationTuningOverrides({
      global: { cashFractionMultiplier: 0.5 },
      personalities: { developer: { cashFractionMultiplier: 0.5 } },
    });
    expect(getSyndicationAppetite("developer").cashFraction).toBeCloseTo(
      base.cashFraction * 0.25,
      5,
    );
  });

  it("clamps fractions into 0..1 and never goes negative on the G1 gate", () => {
    setSyndicationTuningOverrides({
      global: { stakeCapMultiplier: 100, g1WinsOffset: -10 },
    });
    const tuned = getSyndicationAppetite("prestige");
    expect(tuned.stakeCapPct).toBe(1);
    expect(tuned.minG1Wins).toBe(0);
  });

  it("can raise the quality gate and toggle control chasing without code changes", () => {
    setSyndicationTuningOverrides({
      personalities: { aggressive: { g1WinsOffset: 3, chasesControl: false } },
    });
    const tuned = getSyndicationAppetite("aggressive");
    expect(tuned.minG1Wins).toBe(3);
    expect(tuned.chasesControl).toBe(false);
  });

  it("shifts G2/G3 gates via g2WinsOffset/g3WinsOffset", () => {
    const base = getBaseSyndicationAppetite("prestige");
    setSyndicationTuningOverrides({
      personalities: { prestige: { g2WinsOffset: 5, g3WinsOffset: 2 } },
    });
    const tuned = getSyndicationAppetite("prestige");
    expect(tuned.minG2Wins).toBe(base.minG2Wins + 5);
    expect(tuned.minG3Wins).toBe(base.minG3Wins + 2);
  });

  it("resets back to the file baseline", () => {
    setSyndicationTuningOverrides({ global: { stakeCapMultiplier: 0 } });
    expect(getSyndicationAppetite("trader").stakeCapPct).toBe(0);
    resetSyndicationTuningOverrides();
    expect(getSyndicationAppetite("trader").stakeCapPct).toBeGreaterThan(0);
  });
});

describe("share purchase decision", () => {
  it("buys a larger stake for aggressive than conservative with identical cash", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20, other: 12 } });
    const stallion = makeStallion(2);
    const aggressive = calculateSharePurchase(stable("aggressive", 5_000_000), syndicate, stallion);
    const conservative = calculateSharePurchase(
      stable("conservative", 5_000_000),
      syndicate,
      stallion,
    );
    expect(aggressive).toBeGreaterThan(conservative);
  });

  it("blocks purchases below the personality G1 gate", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 30 } });
    const unproven = makeStallion(0);
    const trace = evaluateSharePurchase(stable("specialist", 5_000_000), syndicate, unproven);
    expect(trace.outcome).toBe("skip_quality_gate");
    expect(trace.shares).toBe(0);

    const proven = evaluateSharePurchase(
      stable("specialist", 5_000_000),
      syndicate,
      makeStallion(2),
    );
    expect(proven.shares).toBeGreaterThan(0);
  });

  it("passes the quality gate via G2 OR-fallback when G1 wins are insufficient", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 30 } });
    // specialist: minG1Wins=1, minG2Wins=3, minG3Wins=3
    // 0 G1 but 3 G2 → passes via OR-fallback
    const g2Proven = makeStallion({ g1: 0, g2: 3, g3: 0 });
    const trace = evaluateSharePurchase(stable("specialist", 5_000_000), syndicate, g2Proven);
    expect(trace.outcome).not.toBe("skip_quality_gate");
    expect(trace.shares).toBeGreaterThan(0);
  });

  it("passes the quality gate via G3 OR-fallback when G1 and G2 wins are insufficient", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 30 } });
    // specialist: minG3Wins=3; 0 G1, 0 G2, 3 G3 → passes
    const g3Proven = makeStallion({ g1: 0, g2: 0, g3: 3 });
    const trace = evaluateSharePurchase(stable("specialist", 5_000_000), syndicate, g3Proven);
    expect(trace.outcome).not.toBe("skip_quality_gate");
    expect(trace.shares).toBeGreaterThan(0);
  });

  it("scales maxShares by the graded quality tier", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    // 2 G1 wins → score 6 (weights g1=3) → tier minScore:6 → scale 1.3
    const trace = evaluateSharePurchase(
      stable("aggressive", 50_000_000),
      syndicate,
      makeStallion(2),
    );
    expect(trace.qualityStakeScale).toBe(1.3);
    expect(trace.maxShares).toBe(
      Math.floor(40 * trace.appetite.stakeCapPct * trace.qualityStakeScale),
    );
  });

  it("clamps the scaled stake cap so maxShares never exceeds totalShares", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    // 5 G1 + 5 G2 + 5 G3 → score 30 → max tier scale 1.5
    const trace = evaluateSharePurchase(
      stable("aggressive", 50_000_000),
      syndicate,
      makeStallion({ g1: 5, g2: 5, g3: 5 }),
    );
    expect(trace.qualityStakeScale).toBe(1.5);
    expect(trace.maxShares).toBeLessThanOrEqual(syndicate.totalShares);
  });

  it("exposes graded wins, gates, and quality tier in the trace", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const trace = evaluateSharePurchase(
      stable("prestige", 5_000_000),
      syndicate,
      makeStallion({ g1: 2, g2: 3, g3: 1 }),
    );
    expect(trace.g2Wins).toBe(3);
    expect(trace.g3Wins).toBe(1);
    expect(trace.minG2Wins).toBe(getSyndicationAppetite("prestige").minG2Wins);
    expect(trace.minG3Wins).toBe(getSyndicationAppetite("prestige").minG3Wins);
    expect(trace.qualityScore).toBeGreaterThan(0);
    expect(typeof trace.qualityTier).toBe("string");
    expect(trace.qualityStakeScale).toBeGreaterThan(0);
  });

  it("stops buying once the stake cap is reached", () => {
    const syndicate = makeSyndicate({ shareHolders: { npc1: 40 } });
    const trace = evaluateSharePurchase(
      stable("aggressive", 5_000_000),
      syndicate,
      makeStallion(2),
    );
    expect(trace.outcome).toBe("skip_stake_cap");
    expect(trace.shares).toBe(0);
  });

  it("skips when cash cannot cover a single share", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const trace = evaluateSharePurchase(stable("conservative", 100), syndicate, makeStallion(1));
    expect(trace.outcome).toBe("skip_unaffordable");
    expect(trace.shares).toBe(0);
  });

  it("chases a controlling stake for aggressive personalities", () => {
    const syndicate = makeSyndicate({ shareHolders: { rival: 6, npc1: 4 } });
    const trace = evaluateSharePurchase(
      stable("aggressive", 50_000_000),
      syndicate,
      makeStallion(3),
    );
    expect(trace.outcome).toBe("buy_control");
    expect(trace.shares).toBe(3);
  });

  it("respects tuning when sizing the stake", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20, other: 12 } });
    const stallion = makeStallion(2);
    const before = evaluateSharePurchase(stable("aggressive", 50_000_000), syndicate, stallion);
    setSyndicationTuningOverrides({
      personalities: {
        aggressive: {
          buyFractionMultiplier: 0.2,
          cashFractionMultiplier: 0.2,
          stakeCapMultiplier: 0.5,
        },
      },
    });
    const after = evaluateSharePurchase(stable("aggressive", 50_000_000), syndicate, stallion);
    expect(after.maxAffordable).toBeLessThan(before.maxAffordable);
    expect(after.maxShares).toBeLessThan(before.maxShares);
    expect(after.shares).toBeLessThan(before.shares);
  });

  it("exposes a trace explaining personality, quality and cash inputs", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const trace = evaluateSharePurchase(stable("trader", 2_000_000), syndicate, makeStallion(2));
    expect(trace.personality).toBe("trader");
    expect(trace.g1Wins).toBe(2);
    expect(trace.budget).toBeCloseTo(2_000_000 * trace.appetite.cashFraction, 5);
    expect(trace.maxShares).toBe(
      Math.floor(40 * trace.appetite.stakeCapPct * trace.qualityStakeScale),
    );
    expect(trace.maxAffordable).toBe(Math.floor(trace.budget / trace.sharePrice));
    expect(trace.shares).toBeGreaterThan(0);
  });
});

describe("tuned balance targets", () => {
  it("lets aggressive stables chase control without draining cash", () => {
    const agg = getSyndicationAppetite("aggressive");
    const base = getBaseSyndicationAppetite("aggressive");
    expect(agg.chasesControl).toBe(true);
    expect(agg.stakeCapPct).toBeGreaterThan(base.stakeCapPct);
    expect(agg.buyFraction).toBeGreaterThan(base.buyFraction);
    // Bigger target stake, but a smaller slice of cash per purchase.
    expect(agg.cashFraction).toBeLessThan(base.cashFraction);
  });

  it("gates conservative stables to proven G1 horses only", () => {
    const con = getSyndicationAppetite("conservative");
    expect(con.minG1Wins).toBeGreaterThanOrEqual(1);
    // G2/G3 OR-fallbacks are pushed out of reach so a G1 win is required.
    expect(con.minG2Wins).toBeGreaterThan(5);
    expect(con.minG3Wins).toBeGreaterThan(5);
    expect(con.chasesControl).toBe(false);
    expect(con.cashFraction).toBeLessThan(getSyndicationAppetite("aggressive").cashFraction);
  });
});
