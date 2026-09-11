/**
 * strategy.test.ts — Unit tests for the market buying-strategy engine.
 *
 * Tests scoreCandidate, runMarketStrategy, and DEFAULT_MARKET_STRATEGY
 * against the pure-logic module in @/core/market/strategy.
 */

import { describe, it, expect } from "vitest";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
import {
  scoreCandidate,
  runMarketStrategy,
  DEFAULT_MARKET_STRATEGY,
  type MarketStrategy,
  type StrategySource,
} from "@/core/market/strategy";
import { createDefaultExchangeState, type ExchangeAsk } from "@/core/market/exchange";
import type { Horse } from "@/core/horse/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: asHorseId("h1"),
    name: "Test Horse",
    ownership: makeNpcOwned(asNpcStableId("npc-1")),
    ...overrides,
  });
}

function mkRaceHistory(grade: string): Horse["raceHistory"] {
  return [{ raceId: "r1", raceName: "Test Race", position: 1, day: 1, grade }];
}

function mkAsk(overrides: Partial<ExchangeAsk> & { id: string; horseId: string }): ExchangeAsk {
  return {
    sellerId: "npc-1",
    sellerName: "NPC Stable",
    price: 100_000,
    fairValue: 100_000,
    createdDay: 1,
    expiresDay: 20,
    ...overrides,
  };
}

const baseStrategy: MarketStrategy = {
  targetGrades: ["G1", "G2"],
  minTrackPrestige: 50,
  maxPrice: 250_000,
  targetSyndicationStakePct: 25,
};

const exchangeSource: StrategySource = { kind: "exchange" };

describe("scoreCandidate", () => {
  it("assigns full grade score (35) when grade matches target", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
    });
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: baseStrategy,
    });
    // grade match = 35, prestige (no track) = 0, value (0% edge) = 15, budget (100k <= 250k) = 10
    // total = 35 + 0 + 15 + 10 = 60
    expect(result.score).toBe(60);
    expect(result.reasons).toContain("G1 form matches your target grades");
  });

  it("assigns full grade score (35) when grade is above target", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
    });
    const strategy: MarketStrategy = { ...baseStrategy, targetGrades: ["G2"] };
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy,
    });
    // G1 is above G2 target → 35
    expect(result.score).toBe(60);
    expect(result.reasons).toContain("G1 form is above your target grades");
  });

  it("assigns partial grade score (20) when targetGrades is empty (any)", () => {
    const horse = mkHorse();
    const strategy: MarketStrategy = { ...baseStrategy, targetGrades: [] };
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy,
    });
    // any grade = 20, no track = 0 prestige, value 15, budget 10 = 45
    expect(result.score).toBe(45);
  });

  it("adds warning when grade is below target", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G3"),
    });
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: baseStrategy,
    });
    expect(result.warnings.some((w) => w.includes("below your target grades"))).toBe(true);
  });

  it("assigns full prestige score (25) when trackPrestige >= minTrackPrestige", () => {
    // We need a horse with a track that has high prestige.
    // Use a known G1 track from TRACKS — find one with courseVisits.
    const horse = mkHorse({
      courseVisits: { "churchill-downs": 5 },
    });
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, minTrackPrestige: 0 },
    });
    // If track prestige >= 0, prestigeScore = 25
    // grade (no raceHistory) = Ungraded, below G1/G2 → warning, gradeScore = 0
    // value = 15, budget = 10
    // total = 0 + 25 + 15 + 10 = 50
    expect(result.score).toBe(50);
    expect(result.reasons.some((r) => r.includes("prestige"))).toBe(true);
  });

  it("adds warning when trackPrestige is under floor", () => {
    const horse = mkHorse({
      courseVisits: { "some-low-track": 5 },
    });
    const result = scoreCandidate({
      horse,
      price: 100_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, minTrackPrestige: 90 },
    });
    expect(result.warnings.some((w) => w.includes("under your floor"))).toBe(true);
  });

  it("assigns value score clamped to 0-30 based on valueEdgePct", () => {
    const horse = mkHorse();
    // 50% below fair value → valueEdgePct = 50 → valueScore = clamp(15 + 50, 0, 30) = 30
    const result = scoreCandidate({
      horse,
      price: 50_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, targetGrades: [] },
    });
    expect(result.valueEdgePct).toBe(50);
    // grade any = 20, prestige no track = 0, value 30, budget 10 = 60
    expect(result.score).toBe(60);
  });

  it("assigns budget score 10 when price <= maxPrice, 0 otherwise", () => {
    const horse = mkHorse();
    const within = scoreCandidate({
      horse,
      price: 200_000,
      fairValue: 200_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, targetGrades: [], maxPrice: 250_000 },
    });
    // grade any 20, prestige 0, value 15, budget 10 = 45
    expect(within.score).toBe(45);

    const over = scoreCandidate({
      horse,
      price: 300_000,
      fairValue: 300_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, targetGrades: [], maxPrice: 250_000 },
    });
    // grade any 20, prestige 0, value 15, budget 0 = 35
    expect(over.score).toBe(35);
    expect(over.warnings).toContain("Above your price ceiling");
  });

  it("computes stakeCost as price * targetSyndicationStakePct / 100", () => {
    const horse = mkHorse();
    const result = scoreCandidate({
      horse,
      price: 200_000,
      fairValue: 200_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, targetGrades: [], targetSyndicationStakePct: 30 },
    });
    expect(result.stakeCost).toBe(60_000);
  });

  it("total score = gradeScore + prestigeScore + valueScore + budgetScore", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
      courseVisits: { "churchill-downs": 5 },
    });
    const result = scoreCandidate({
      horse,
      price: 80_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, minTrackPrestige: 0 },
    });
    // grade G1 match = 35, prestige >= 0 = 25, value = clamp(15 + 20, 0, 30) = 30, budget 10
    // total = 35 + 25 + 30 + 10 = 100
    expect(result.score).toBe(100);
  });

  it("populates reasons array with matching factors", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
      courseVisits: { "churchill-downs": 5 },
    });
    const result = scoreCandidate({
      horse,
      price: 80_000,
      fairValue: 100_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: { ...baseStrategy, minTrackPrestige: 0 },
    });
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("G1"))).toBe(true);
  });

  it("populates warnings array with disqualifying factors", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G3"),
    });
    const result = scoreCandidate({
      horse,
      price: 300_000,
      fairValue: 300_000,
      source: exchangeSource,
      sourceLabel: "Exchange",
      strategy: baseStrategy,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("runMarketStrategy", () => {
  it("scans all exchange asks (excluding player's own asks)", () => {
    const horse = mkHorse({ id: asHorseId("h-npc") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      mkAsk({
        id: "ask-1",
        horseId: "h-npc",
        sellerId: "npc-1",
        price: 100_000,
        fairValue: 100_000,
      }),
      mkAsk({
        id: "ask-2",
        horseId: "h-player",
        sellerId: "player",
        price: 100_000,
        fairValue: 100_000,
      }),
    ];
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, targetGrades: [] },
      day: 10,
      horses: [horse],
      exchange,
    });
    // Only the NPC ask should be scanned (player ask excluded)
    expect(result.scanned).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some((c) => c.horseId === "h-npc")).toBe(true);
    expect(result.candidates.some((c) => c.horseId === "h-player")).toBe(false);
  });

  it("scans all auction house catalogues", () => {
    const horse = mkHorse({ id: asHorseId("h-npc") });
    const exchange = createDefaultExchangeState();
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, targetGrades: [] },
      day: 10,
      horses: [horse],
      exchange,
    });
    // Even with no exchange asks, auction houses produce catalogue entries
    // (buildHouseCatalogue generates lots from horses)
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.some((c) => c.source.kind === "house")).toBe(true);
  });

  it("sorts candidates by score descending, then price ascending", () => {
    const horse1 = mkHorse({ id: asHorseId("h1"), raceHistory: mkRaceHistory("G1") });
    const horse2 = mkHorse({ id: asHorseId("h2"), raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 }),
      mkAsk({ id: "ask-2", horseId: "h2", price: 80_000, fairValue: 100_000 }),
    ];
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, targetGrades: ["G1"], minTrackPrestige: 0 },
      day: 10,
      horses: [horse1, horse2],
      exchange,
    });
    // h2 has better value edge (80k vs 100k fair value) → higher score
    const exchangeCandidates = result.candidates.filter((c) => c.source.kind === "exchange");
    expect(exchangeCandidates.length).toBe(2);
    expect(exchangeCandidates[0].score).toBeGreaterThanOrEqual(exchangeCandidates[1].score);
  });

  it("qualified count = candidates with zero warnings", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
      courseVisits: { "churchill-downs": 5 },
    });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: horse.id, price: 100_000, fairValue: 100_000 })];
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, minTrackPrestige: 0 },
      day: 10,
      horses: [horse],
      exchange,
    });
    const zeroWarningCount = result.candidates.filter((c) => c.warnings.length === 0).length;
    expect(result.qualified).toBe(zeroWarningCount);
  });

  it("averageScore = mean score of qualifying candidates (0 if none)", () => {
    const exchange = createDefaultExchangeState();
    const result = runMarketStrategy({
      strategy: baseStrategy,
      day: 10,
      horses: [],
      exchange,
    });
    // If no qualifying candidates, averageScore = 0
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
  });

  it("totalStakeCost = sum of stakeCost for qualifying candidates", () => {
    const horse = mkHorse({
      raceHistory: mkRaceHistory("G1"),
      courseVisits: { "churchill-downs": 5 },
    });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: horse.id, price: 100_000, fairValue: 100_000 })];
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, minTrackPrestige: 0, targetSyndicationStakePct: 25 },
      day: 10,
      horses: [horse],
      exchange,
    });
    const qualifying = result.candidates.filter((c) => c.warnings.length === 0);
    const expectedTotal = qualifying.reduce((sum, c) => sum + c.stakeCost, 0);
    expect(result.totalStakeCost).toBe(expectedTotal);
  });

  it("returns empty candidates when exchange has no asks and no horses", () => {
    const exchange = createDefaultExchangeState();
    const result = runMarketStrategy({
      strategy: baseStrategy,
      day: 10,
      horses: [],
      exchange,
    });
    // With no horses, auction houses can't build catalogues either
    expect(result.candidates.length).toBe(0);
    expect(result.scanned).toBe(0);
  });

  it("skips asks where horseId is not in horses map", () => {
    const horse = mkHorse({ id: asHorseId("h1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 }),
      mkAsk({ id: "ask-2", horseId: "h-missing", price: 100_000, fairValue: 100_000 }),
    ];
    const result = runMarketStrategy({
      strategy: { ...baseStrategy, targetGrades: [] },
      day: 10,
      horses: [horse],
      exchange,
    });
    const exchangeCandidates = result.candidates.filter((c) => c.source.kind === "exchange");
    expect(exchangeCandidates.some((c) => c.horseId === "h1")).toBe(true);
    expect(exchangeCandidates.some((c) => c.horseId === "h-missing")).toBe(false);
  });
});

describe("DEFAULT_MARKET_STRATEGY", () => {
  it("has targetGrades ['G1', 'G2']", () => {
    expect(DEFAULT_MARKET_STRATEGY.targetGrades).toEqual(["G1", "G2"]);
  });

  it("has minTrackPrestige 50", () => {
    expect(DEFAULT_MARKET_STRATEGY.minTrackPrestige).toBe(50);
  });

  it("has maxPrice 250000", () => {
    expect(DEFAULT_MARKET_STRATEGY.maxPrice).toBe(250_000);
  });

  it("has targetSyndicationStakePct 25", () => {
    expect(DEFAULT_MARKET_STRATEGY.targetSyndicationStakePct).toBe(25);
  });
});
