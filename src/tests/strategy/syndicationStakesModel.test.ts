import { describe, it, expect } from "vitest";
import {
  calculateSyndicationBreakdown,
  evaluateSyndicationEligibility,
  evaluateInvestorAppetite,
} from "@/core/breeding/strategySyndicationHelpers";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId } from "@/core/types/branded";

describe("Syndication Stakes Model & Commercial Projections", () => {
  it("calculates 40-share syndication breakdown from breeding valuation", () => {
    const stallion = createTestHorse({
      id: asHorseId("stallion-1"),
      name: "Secretariat Pride",
      gender: "colt",
      stats: {
        speed: 85,
        stamina: 85,
        acceleration: 85,
        consistency: 85,
        temperament: 70,
        conformation: 75,
      },
      raceHistory: [
        { raceId: "r1", raceName: "Breeders Classic", grade: "G1", position: 1, day: 50 },
        { raceId: "r2", raceName: "Travers Stakes", grade: "G1", position: 1, day: 120 },
      ],
    });

    const horses = { [stallion.id]: stallion };
    const breakdown = calculateSyndicationBreakdown(stallion, Object.values(horses));

    expect(breakdown.totalShares).toBe(40);
    expect(breakdown.totalValuation).toBeGreaterThan(0);
    expect(breakdown.sharePrice).toBe(Math.round(breakdown.totalValuation / 40));
    expect(breakdown.recommendedPlayerShares).toBe(20);
    expect(breakdown.playerEquityValue).toBe(20 * breakdown.sharePrice);
    expect(breakdown.liquidCapitalProceeds).toBe(20 * breakdown.sharePrice);
    expect(breakdown.estimatedAnnualDividend).toBeGreaterThan(0);
  });

  it("evaluates G1 qualification gate and eligibility for stallions", () => {
    // 1. G1 Winner Colt: eligible
    const g1Winner = createTestHorse({
      id: asHorseId("colt-g1"),
      name: "Derby King",
      gender: "colt",
      raceHistory: [
        { raceId: "r1", raceName: "Kentucky Derby", grade: "G1", position: 1, day: 100 },
      ],
    });
    const g1Eval = evaluateSyndicationEligibility(g1Winner);
    expect(g1Eval.isEligible).toBe(true);
    expect(g1Eval.g1Wins).toBe(1);
    expect(g1Eval.shortfall).toBe(0);

    // 2. Non-G1 Colt: not eligible yet, needs 1 G1
    const maidenColt = createTestHorse({
      id: asHorseId("colt-maiden"),
      name: "Hopeful Boy",
      gender: "colt",
      raceHistory: [],
    });
    const maidenEval = evaluateSyndicationEligibility(maidenColt);
    expect(maidenEval.isEligible).toBe(false);
    expect(maidenEval.g1Wins).toBe(0);
    expect(maidenEval.shortfall).toBe(1);

    // 3. Gelding: not eligible for breeding
    const gelding = createTestHorse({
      id: asHorseId("gelding-1"),
      name: "Fast Castrate",
      gender: "gelding",
      gelded: true,
      raceHistory: [
        { raceId: "r1", raceName: "Gold Cup", grade: "G1", position: 1, day: 100 },
      ],
    });
    const geldingEval = evaluateSyndicationEligibility(gelding);
    expect(geldingEval.isEligible).toBe(false);
    expect(geldingEval.reason).toContain("Gelding");

    // 4. Mare: handled as broodmare
    const mare = createTestHorse({
      id: asHorseId("mare-1"),
      name: "Queen of Turf",
      gender: "filly",
      raceHistory: [
        { raceId: "r1", raceName: "Oaks", grade: "G1", position: 1, day: 100 },
      ],
    });
    const mareEval = evaluateSyndicationEligibility(mare);
    expect(mareEval.isEligible).toBe(false);
    expect(mareEval.reason).toContain("Broodmare");
  });

  it("evaluates NPC investor appetite based on stable personalities", () => {
    const eliteStallion = createTestHorse({
      id: asHorseId("stallion-elite"),
      name: "Grand Champion",
      gender: "colt",
      raceHistory: [
        { raceId: "r1", raceName: "Derby", grade: "G1", position: 1, day: 100 },
        { raceId: "r2", raceName: "Preakness", grade: "G1", position: 1, day: 120 },
      ],
    });

    const appetite = evaluateInvestorAppetite(eliteStallion);
    expect(appetite.prestigeStable.interest).toBe("High");
    expect(appetite.breederStable.interest).toBe("High");
    expect(appetite.aggressiveStable.interest).toBe("High");
  });
});
