import { describe, it, expect } from "vitest";
import { evaluateCounteroffer } from "@/core/ai/syndicationAIDecisions";
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

describe("evaluateCounteroffer", () => {
  it("accepts an offer within the NPC's range", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    // aggressive, plenty of cash → maxAcceptable = min(availableShares, maxAffordable)
    const guidance = evaluateCounteroffer(
      stable("aggressive", 50_000_000),
      syndicate,
      stallion,
      3,
    );
    expect(guidance.acceptable).toBe(true);
    expect(guidance.minAcceptable).toBe(1);
    expect(guidance.maxAcceptable).toBeGreaterThan(0);
    expect(guidance.expectedStakeAfter).toBe(guidance.currentShares + 3);
    expect(guidance.expectedStakePctAfter).toBeCloseTo(
      (guidance.currentShares + 3) / syndicate.totalShares,
      5,
    );
  });

  it("rejects an offer exceeding the NPC's budget", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    // conservative with enough cash for a few shares but not 100
    const guidance = evaluateCounteroffer(
      stable("conservative", 1_000_000),
      syndicate,
      stallion,
      100,
    );
    expect(guidance.acceptable).toBe(false);
    expect(guidance.maxAcceptable).toBeLessThan(100);
    expect(guidance.note).toContain("budget");
  });

  it("rejects when the NPC is at its stake cap", () => {
    const syndicate = makeSyndicate({ shareHolders: { npc1: 40 } });
    const stallion = makeStallion(2);
    const guidance = evaluateCounteroffer(
      stable("aggressive", 50_000_000),
      syndicate,
      stallion,
      5,
    );
    expect(guidance.acceptable).toBe(false);
    expect(guidance.maxAcceptable).toBe(0);
    expect(guidance.note).toContain("cap");
  });

  it("rejects when the NPC is quality-gated", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const unproven = makeStallion(0);
    const guidance = evaluateCounteroffer(
      stable("specialist", 5_000_000),
      syndicate,
      unproven,
      3,
    );
    expect(guidance.acceptable).toBe(false);
    expect(guidance.note).toContain("Holding off");
  });

  it("rejects a zero-share offer", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    const guidance = evaluateCounteroffer(
      stable("aggressive", 50_000_000),
      syndicate,
      stallion,
      0,
    );
    expect(guidance.acceptable).toBe(false);
    expect(guidance.minAcceptable).toBe(1);
  });

  it("caps expected stake at maxShares (does not exceed scaled cap)", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20, npc1: 5 } });
    const stallion = makeStallion(2);
    // Offer more than availableShares → expectedStakeAfter should be capped
    const guidance = evaluateCounteroffer(
      stable("aggressive", 50_000_000),
      syndicate,
      stallion,
      1000,
    );
    expect(guidance.expectedStakeAfter).toBeLessThanOrEqual(guidance.maxShares);
    expect(guidance.expectedStakeAfter).toBeLessThanOrEqual(syndicate.totalShares);
  });
});
