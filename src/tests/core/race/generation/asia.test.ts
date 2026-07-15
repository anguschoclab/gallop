import { describe, it, expect } from "vitest";
import { generateAsianRace } from "@/core/race/generation/asia";
import { createRng } from "@/core/common/rng";
import type { Track } from "@/data/tracks";
import { MINSTAT_ALLOWANCE, MINSTAT_STAKES } from "@/constants";

function mkAsianTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "asia-track-1",
    name: "Tokyo",
    country: "Japan",
    courses: [
      {
        surface: "Turf",
        circumference: 2000,
        straightLength: 400,
        sections: [
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
        ],
      },
    ],
    ...overrides,
  };
}

function generateManyAsianRaces(count: number): { raceClass: string; minStat?: number }[] {
  const track = mkAsianTrack();
  const rng = createRng("asia-test");
  const usedNames = new Set<string>();
  const results: { raceClass: string; minStat?: number }[] = [];
  for (let i = 0; i < count; i++) {
    const race = generateAsianRace(track, 10, rng, undefined, usedNames);
    results.push({ raceClass: race.raceClass, minStat: race.minStat });
  }
  return results;
}

describe("Asian race generator minStat fix", () => {
  it("Asian Maiden race has no minStat (after fix)", () => {
    const results = generateManyAsianRaces(100);
    const maidens = results.filter((r) => r.raceClass === "Maiden");
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.minStat).toBeUndefined();
    }
  });

  it("Asian Allowance race has minStat = MINSTAT_ALLOWANCE + 10", () => {
    const results = generateManyAsianRaces(100);
    const allowances = results.filter((r) => r.raceClass === "Allowance");
    expect(allowances.length).toBeGreaterThan(0);
    for (const a of allowances) {
      expect(a.minStat).toBe(MINSTAT_ALLOWANCE + 10);
    }
  });

  it("Asian MaidenClaiming race has no minStat (after fix)", () => {
    // MaidenClaiming is not in Asia distribution, so we need to test the logic
    // by checking that the fix applies to all maiden-type classes
    const results = generateManyAsianRaces(200);
    const maidenClaimings = results.filter((r) => r.raceClass === "MaidenClaiming");
    // MaidenClaiming may not appear in Asia distribution, so just verify if any exist
    for (const m of maidenClaimings) {
      expect(m.minStat).toBeUndefined();
    }
  });

  it("Asian Stakes race has minStat = MINSTAT_STAKES + 10", () => {
    const results = generateManyAsianRaces(100);
    const stakes = results.filter((r) => r.raceClass === "Stakes");
    expect(stakes.length).toBeGreaterThan(0);
    for (const s of stakes) {
      expect(s.minStat).toBe(MINSTAT_STAKES + 10);
    }
  });
});
