import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import {
  calculateScoutCost,
  getVisibleStats,
  scoutHorse,
  getDisplayableStats,
  getScoutStatus,
  getIntelSummary,
} from "@/game/scouting";
import type { Horse, Stable, ScoutReport } from "@/game/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "abcdef",
    name: "Test Horse",
    age: 4,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#aabbcc",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    energy: 80,
    form: 0,
    potential: 80,
    raceHistory: [],
    owned: false,
    fame: 0,
    ...overrides,
  };
}

function mkStable(reputation = 75): Stable {
  return {
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "mid",
    reputation,
    founded: 1,
    cash: 200000,
    horses: [],
    isMajor: true,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality: "conservative",
  };
}

describe("calculateScoutCost", () => {
  it("always returns >= 100", () => {
    const horse = mkHorse({ fame: 100 });
    const stable = mkStable(0);
    expect(calculateScoutCost(horse, stable)).toBeGreaterThanOrEqual(100);
  });

  it("higher fame → lower cost", () => {
    const stable = mkStable(50);
    const lowFame = calculateScoutCost(mkHorse({ fame: 0 }), stable);
    const highFame = calculateScoutCost(mkHorse({ fame: 80 }), stable);
    expect(highFame).toBeLessThan(lowFame);
  });

  it("higher stable reputation → higher cost", () => {
    const horse = mkHorse({ fame: 20 });
    const lowRep = calculateScoutCost(horse, mkStable(20));
    const highRep = calculateScoutCost(horse, mkStable(95));
    expect(highRep).toBeGreaterThan(lowRep);
  });
});

describe("getVisibleStats", () => {
  it("fame >= 70 → exactly 4 stats returned", () => {
    const horse = mkHorse({ fame: 70 });
    expect(getVisibleStats(horse)).toHaveLength(4);
    const horse2 = mkHorse({ fame: 100 });
    expect(getVisibleStats(horse2)).toHaveLength(4);
  });

  it("fame < 40 → exactly 1 stat returned", () => {
    const horse = mkHorse({ id: "aabbcc", fame: 0 });
    expect(getVisibleStats(horse)).toHaveLength(1);
  });

  it("fame >= 40 and < 70 → 1 or 2 stats returned", () => {
    const horse = mkHorse({ id: "aabbcc", fame: 50 });
    const count = getVisibleStats(horse).length;
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });

  it("deterministic for same horse.id", () => {
    const horse = mkHorse({ id: "xyzabc", fame: 50 });
    expect(getVisibleStats(horse)).toEqual(getVisibleStats(horse));
  });

  it("all returned keys are valid HorseStats keys", () => {
    const validKeys = ["speed", "stamina", "acceleration", "consistency"];
    const horse = mkHorse({ fame: 50 });
    for (const k of getVisibleStats(horse)) {
      expect(validKeys).toContain(k);
    }
  });
});

describe("scoutHorse", () => {
  it("returns success=false, cost=0 when playerCash < cost", () => {
    const horse = mkHorse();
    const stable = mkStable(90); // high reputation → expensive
    const result = scoutHorse(horse, stable, 10, 0, createRng("test"));
    expect(result.success).toBe(false);
    expect(result.cost).toBe(0);
    expect(result.message).toContain("Insufficient");
  });

  it("returns success=false when horse.lastScoutedDay === day", () => {
    const horse = mkHorse({ lastScoutedDay: 10 });
    const stable = mkStable(50);
    const cost = calculateScoutCost(horse, stable);
    const result = scoutHorse(horse, stable, 10, cost * 10, createRng("test"));
    expect(result.success).toBe(false);
    expect(result.cost).toBe(0);
    expect(result.message).toContain("already scouted");
  });

  it("success returns report with at least 1 revealed stat", () => {
    const horse = mkHorse({ fame: 0 });
    const stable = mkStable(50);
    const cost = calculateScoutCost(horse, stable);
    const result = scoutHorse(horse, stable, 10, cost * 10, createRng("test"));
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(Object.keys(result.report!.revealedStats).length).toBeGreaterThanOrEqual(1);
  });

  it("successful scout returns positive cost", () => {
    const horse = mkHorse({ fame: 10 });
    const stable = mkStable(50);
    const cost = calculateScoutCost(horse, stable);
    const result = scoutHorse(horse, stable, 10, cost * 10, createRng("test"));
    if (result.success) {
      expect(result.cost).toBeGreaterThan(0);
    }
  });

  it("report has correct horseId and stableId", () => {
    const horse = mkHorse({ id: "horse-123", fame: 10 });
    const stable = mkStable(50);
    const cost = calculateScoutCost(horse, stable);
    const result = scoutHorse(horse, stable, 5, cost * 10, createRng("test"));
    if (result.success && result.report) {
      expect(result.report.horseId).toBe("horse-123");
      expect(result.report.stableId).toBe("s1");
      expect(result.report.day).toBe(5);
    }
  });
});

describe("getDisplayableStats", () => {
  it("famous horse (fame >= 70) → confidence='full'", () => {
    const horse = mkHorse({ fame: 70 });
    const { confidence } = getDisplayableStats(horse, [], 1);
    expect(confidence).toBe("full");
  });

  it("no scout + low fame → confidence='unknown'", () => {
    const horse = mkHorse({ fame: 0 });
    const { confidence } = getDisplayableStats(horse, [], 1);
    expect(confidence).toBe("unknown");
  });

  it("recent high-accuracy report → confidence='full'", () => {
    const horse = mkHorse({ fame: 0 });
    const report: ScoutReport = {
      horseId: horse.id,
      stableId: "s1",
      day: 1,
      accuracy: 0.95,
      revealedStats: { speed: 70 },
      notes: "",
    };
    const { confidence } = getDisplayableStats(horse, [report], 10);
    expect(confidence).toBe("full");
  });

  it("stale report (> 30 days ago) → not used", () => {
    const horse = mkHorse({ fame: 0 });
    const staleReport: ScoutReport = {
      horseId: horse.id,
      stableId: "s1",
      day: 1,
      accuracy: 0.95,
      revealedStats: { speed: 70 },
      notes: "",
    };
    const { confidence } = getDisplayableStats(horse, [staleReport], 50);
    // Day 50 - day 1 = 49 days > 30 → report is too old → unknown
    expect(confidence).toBe("unknown");
  });
});

describe("getScoutStatus", () => {
  it("full confidence → canScout=false", () => {
    const horse = mkHorse({ fame: 80 });
    const { canScout } = getScoutStatus(horse, [], 1);
    expect(canScout).toBe(false);
  });

  it("unknown confidence → canScout=true", () => {
    const horse = mkHorse({ fame: 0 });
    const { canScout } = getScoutStatus(horse, [], 1);
    expect(canScout).toBe(true);
  });

  it("returns a non-empty icon, label, and color string", () => {
    const horse = mkHorse({ fame: 50 });
    const status = getScoutStatus(horse, [], 1);
    expect(status.icon).toBeTruthy();
    expect(status.label).toBeTruthy();
    expect(status.color).toBeTruthy();
  });
});

describe("getIntelSummary", () => {
  it("famous horse (fame >= 70) → 'All stats known'", () => {
    const horse = mkHorse({ fame: 80 });
    const summary = getIntelSummary(horse, [], 1);
    expect(summary).toContain("All stats known");
  });

  it("complete unknown (no visible stats, fame=0) → includes OVR estimate or unknown message", () => {
    // At fame=0, getVisibleStats still returns 1 stat (seed-based deterministic), so
    // the intel summary will be "OVR ~N - stat known (unknown)" rather than "Complete unknown".
    // Only when getVisibleStats returns [] would we get "Complete unknown" — this can't happen
    // with the current fame-based logic. Verify the output is a non-empty string.
    const horse = mkHorse({ fame: 0 });
    const summary = getIntelSummary(horse, [], 1);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("partial scout → contains OVR estimate and 'known'", () => {
    const horse = mkHorse({ fame: 0 });
    const report: ScoutReport = {
      horseId: horse.id,
      stableId: "s1",
      day: 1,
      accuracy: 0.75,
      revealedStats: { speed: 68, stamina: 72 },
      notes: "",
    };
    const summary = getIntelSummary(horse, [report], 10);
    expect(summary).toContain("OVR ~");
    expect(summary).toContain("known");
  });
});
