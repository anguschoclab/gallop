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

function makeStallion(g1Wins: number, overrides: Partial<Horse> = {}): Horse {
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
    raceHistory: Array.from({ length: g1Wins }, (_, i) => ({
      raceId: `r${i}`,
      raceName: "Big One",
      position: 1,
      day: 100 + i,
      grade: "G1",
    })),
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

  it("matches base table when no tuning overrides are set", () => {
    expect(getSyndicationAppetite("trader")).toEqual(getBaseSyndicationAppetite("trader"));
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
    const base = getBaseSyndicationAppetite("conservative");
    setSyndicationTuningOverrides({
      personalities: { conservative: { stakeCapMultiplier: 2, buyFractionMultiplier: 2 } },
    });
    const tuned = getSyndicationAppetite("conservative");
    expect(tuned.stakeCapPct).toBeCloseTo(base.stakeCapPct * 2, 5);
    expect(tuned.buyFraction).toBeCloseTo(base.buyFraction * 2, 5);
  });

  it("applies global multipliers on top of personality ones", () => {
    const base = getBaseSyndicationAppetite("developer");
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
    expect(trace.maxShares).toBe(Math.floor(40 * trace.appetite.stakeCapPct));
    expect(trace.maxAffordable).toBe(Math.floor(trace.budget / trace.sharePrice));
    expect(trace.shares).toBeGreaterThan(0);
  });
});
