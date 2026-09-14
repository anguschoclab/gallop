import { describe, it, expect } from "vitest";
import {
  derivePlayerSyndicateStakes,
  calculateSyndicateReputationImpact,
  calculateSyndicateStakesSummary,
  type PlayerSyndicateStake,
} from "@/core/breeding/syndicateStakes";
import type { Syndicate } from "@/core/breeding/types";
import type { Horse } from "@/game/types";
import type { ManagerReputation } from "@/core/reputation";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import { asHorseId, asOwnerKey } from "@/core/types/branded";

function createTestSyndicate(overrides: Partial<Syndicate> = {}): Syndicate {
  return {
    id: "syn-1",
    stallionId: "stallion-1",
    stallionName: "Northern Dancer",
    totalShares: 40,
    shareHolders: {
      [asOwnerKey("player")]: 10,
      [asOwnerKey("npc-1")]: 15,
      [asOwnerKey("npc-2")]: 15,
    },
    sharePrice: 25_000,
    studFee: 50_000,
    isPublic: true,
    lifetimeEarnings: 400_000,
    shareholderSatisfaction: {
      [asOwnerKey("player")]: 80,
      [asOwnerKey("npc-1")]: 85,
      [asOwnerKey("npc-2")]: 75,
    },
    lastSatisfactionUpdate: 120,
    ...overrides,
  };
}

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: asHorseId("stallion-1"),
    name: "Northern Dancer",
    age: 7,
    gender: "stallion",
    stud: {
      atStud: true,
      standingFee: 50_000,
      previousStandingFee: 40_000,
      lifetimeStakesFoals: 4,
      lifetimeG1Foals: 2,
    },
    ...overrides,
  } as unknown as Horse;
}

function createTestReputation(overrides: Partial<ManagerReputation> = {}): ManagerReputation {
  return {
    score: 500,
    tier: "national",
    events: [
      {
        id: "rep-1",
        day: 50,
        source: "syndication_stake",
        amount: 14,
        description: "Underwrote 25% of the Northern Dancer syndicate ($250,000).",
      },
      {
        id: "rep-2",
        day: 80,
        source: "race_win",
        amount: 5,
        description: "Won a race.",
      },
    ],
    gradedWins: { G1: 2, G2: 1, G3: 0, Listed: 0 },
    totalWins: 10,
    yearsActive: 2,
    ...overrides,
  };
}

describe("derivePlayerSyndicateStakes", () => {
  it("returns an empty array when syndicates map is empty", () => {
    const result = derivePlayerSyndicateStakes({
      syndicates: {},
      horses: {},
    });
    expect(result).toEqual([]);
  });

  it("filters out syndicates where player owns 0 shares", () => {
    const syn = createTestSyndicate({
      id: "syn-zero",
      shareHolders: { [asOwnerKey("npc-1")]: 40 },
    });
    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: {},
    });
    expect(result).toHaveLength(0);
  });

  it("derives financial holdings, equity percentage and valuation accurately", () => {
    const syn = createTestSyndicate({
      totalShares: 40,
      shareHolders: { [asOwnerKey("player")]: 10 },
      sharePrice: 30_000,
      lifetimeEarnings: 200_000,
    });
    const horse = createTestHorse();

    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: { [horse.id]: horse },
    });

    expect(result).toHaveLength(1);
    const stake = result[0];
    expect(stake.id).toBe("syn-1");
    expect(stake.stallionName).toBe("Northern Dancer");
    expect(stake.shares).toBe(10);
    expect(stake.totalShares).toBe(40);
    expect(stake.equityPct).toBe(25);
    expect(stake.sharePrice).toBe(30_000);
    expect(stake.stakeValue).toBe(300_000); // 10 * 30,000
    expect(stake.playerEarningsShare).toBe(50_000); // 25% of 200,000
  });

  it("incorporates stud fee progression and progeny performance from stallion", () => {
    const syn = createTestSyndicate();
    const horse = createTestHorse({
      age: 9,
      stud: {
        atStud: true,
        standingFee: 60_000,
        previousStandingFee: 45_000,
        lifetimeStakesFoals: 6,
        lifetimeG1Foals: 3,
      } as any,
    });

    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: { [horse.id]: horse },
    });

    const stake = result[0];
    expect(stake.stallionAge).toBe(9);
    expect(stake.studFee).toBe(60_000);
    expect(stake.previousStudFee).toBe(45_000);
    expect(stake.feeGrowth).toBe(15_000);
    expect(stake.lifetimeStakesFoals).toBe(6);
    expect(stake.lifetimeG1Foals).toBe(3);
  });

  it("calculates average shareholder satisfaction and player satisfaction", () => {
    const syn = createTestSyndicate({
      shareholderSatisfaction: {
        [asOwnerKey("player")]: 90,
        [asOwnerKey("npc-1")]: 70,
        [asOwnerKey("npc-2")]: 80,
      },
    });

    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: {},
    });

    const stake = result[0];
    expect(stake.playerSatisfaction).toBe(90);
    expect(stake.averageSatisfaction).toBe(80); // (90 + 70 + 80) / 3
  });

  it("incorporates solicited investor sentiment when present", () => {
    const syn = createTestSyndicate();
    const investors: Record<string, InvestorRecord> = {
      "inv-1": {
        id: "inv-1",
        syndicateId: "syn-1",
        name: "Lord Sterling",
        stableId: asOwnerKey("npc-1"),
        personality: "conservative",
        shares: 5,
        investedCash: 125_000,
        joinedDay: 10,
        satisfaction: 85,
        expectations: [],
      },
      "inv-2": {
        id: "inv-2",
        syndicateId: "syn-other",
        name: "Countess Rose",
        stableId: asOwnerKey("npc-2"),
        personality: "aggressive",
        shares: 2,
        investedCash: 50_000,
        joinedDay: 15,
        satisfaction: 60,
        expectations: [],
      },
    };

    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: {},
      syndicateInvestors: investors,
    });

    const stake = result[0];
    expect(stake.investorCount).toBe(1);
    expect(stake.investorAverageSatisfaction).toBe(85);
  });

  it("matches and aggregates historical reputation events for the syndicate", () => {
    const syn = createTestSyndicate({ stallionName: "Seattle Slew" });
    const rep: ManagerReputation = {
      score: 600,
      tier: "international",
      events: [
        {
          id: "rep-1",
          day: 10,
          source: "syndication_stake",
          amount: 12,
          description: "Underwrote 20% of the Seattle Slew syndicate ($150,000).",
        },
        {
          id: "rep-2",
          day: 40,
          source: "syndication_exit",
          amount: -4,
          description: "Sold down 5% of the Seattle Slew syndicate.",
        },
        {
          id: "rep-3",
          day: 50,
          source: "syndication_stake",
          amount: 15,
          description: "Underwrote 30% of the Northern Dancer syndicate ($200,000).",
        },
      ],
      gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
      totalWins: 0,
      yearsActive: 1,
    };

    const result = derivePlayerSyndicateStakes({
      syndicates: { [syn.id]: syn },
      horses: {},
      reputation: rep,
    });

    const stake = result[0];
    expect(stake.reputationPointsTotal).toBe(8); // +12 - 4
    expect(stake.recentEvents).toHaveLength(2);
  });
});

describe("calculateSyndicateReputationImpact", () => {
  it("assigns positive 'Prestige Boost' for high satisfaction or G1 progeny", () => {
    const impact = calculateSyndicateReputationImpact({
      averageSatisfaction: 85,
      lifetimeG1Foals: 2,
      lifetimeStakesFoals: 5,
      feeGrowth: 10_000,
      equityPct: 25,
      stallionName: "Storm Cat",
    });

    expect(impact.status).toBe("positive");
    expect(impact.label).toBe("Prestige Boost");
    expect(impact.description).toContain("Storm Cat");
  });

  it("assigns negative 'Reputation Drag' for low partner satisfaction", () => {
    const impact = calculateSyndicateReputationImpact({
      averageSatisfaction: 35,
      lifetimeG1Foals: 0,
      lifetimeStakesFoals: 0,
      feeGrowth: -5_000,
      equityPct: 15,
      stallionName: "Cold Frost",
    });

    expect(impact.status).toBe("negative");
    expect(impact.label).toBe("Reputation Drag");
    expect(impact.description).toContain("dissatisfaction");
  });

  it("assigns neutral 'Stable Standing' for normal satisfaction", () => {
    const impact = calculateSyndicateReputationImpact({
      averageSatisfaction: 55,
      lifetimeG1Foals: 0,
      lifetimeStakesFoals: 1,
      feeGrowth: 0,
      equityPct: 10,
      stallionName: "Quiet Echo",
    });

    expect(impact.status).toBe("neutral");
    expect(impact.label).toBe("Stable Standing");
  });
});

describe("calculateSyndicateStakesSummary", () => {
  it("returns zeroed summary when stakes array is empty", () => {
    const summary = calculateSyndicateStakesSummary([]);
    expect(summary.totalStakesCount).toBe(0);
    expect(summary.totalSharesOwned).toBe(0);
    expect(summary.totalStakeValue).toBe(0);
    expect(summary.totalDividendsEarned).toBe(0);
    expect(summary.averagePartnerSatisfaction).toBe(0);
    expect(summary.netReputationPoints).toBe(0);
    expect(summary.positiveCount).toBe(0);
    expect(summary.dragCount).toBe(0);
  });

  it("aggregates totals correctly across multiple stakes", () => {
    const stakes: PlayerSyndicateStake[] = [
      {
        id: "syn-1",
        stallionId: "st-1",
        stallionName: "Stallion Alpha",
        stallionAge: 8,
        shares: 10,
        totalShares: 40,
        equityPct: 25,
        sharePrice: 20_000,
        stakeValue: 200_000,
        studFee: 40_000,
        previousStudFee: 35_000,
        feeGrowth: 5_000,
        lifetimeEarnings: 100_000,
        playerEarningsShare: 25_000,
        lifetimeStakesFoals: 3,
        lifetimeG1Foals: 1,
        averageSatisfaction: 80,
        playerSatisfaction: 85,
        investorCount: 1,
        investorAverageSatisfaction: 80,
        reputationPointsTotal: 12,
        reputationImpactStatus: "positive",
        reputationImpactLabel: "Prestige Boost",
        reputationImpactDescription: "Progeny success",
        recentEvents: [],
      },
      {
        id: "syn-2",
        stallionId: "st-2",
        stallionName: "Stallion Beta",
        stallionAge: 6,
        shares: 4,
        totalShares: 40,
        equityPct: 10,
        sharePrice: 15_000,
        stakeValue: 60_000,
        studFee: 20_000,
        previousStudFee: 25_000,
        feeGrowth: -5_000,
        lifetimeEarnings: 40_000,
        playerEarningsShare: 4_000,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        averageSatisfaction: 38,
        playerSatisfaction: 40,
        investorCount: 0,
        investorAverageSatisfaction: null,
        reputationPointsTotal: -2,
        reputationImpactStatus: "negative",
        reputationImpactLabel: "Reputation Drag",
        reputationImpactDescription: "Fee decline",
        recentEvents: [],
      },
    ];

    const summary = calculateSyndicateStakesSummary(stakes);
    expect(summary.totalStakesCount).toBe(2);
    expect(summary.totalSharesOwned).toBe(14);
    expect(summary.totalStakeValue).toBe(260_000);
    expect(summary.totalDividendsEarned).toBe(29_000);
    expect(summary.averagePartnerSatisfaction).toBe(59); // (80 + 38) / 2
    expect(summary.netReputationPoints).toBe(10); // 12 - 2
    expect(summary.positiveCount).toBe(1);
    expect(summary.dragCount).toBe(1);
    expect(summary.neutralCount).toBe(0);
  });
});
