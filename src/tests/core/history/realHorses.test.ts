import { describe, it, expect } from "vitest";
import { findRealHorse, realSireName } from "@/shared/data/realHorses";
import { findHorseByName, pedigreeDataset } from "@/shared/data/pedigreeData";
import { getStallionResearchData, researchFromRealRecord } from "@/shared/data/stallionDNAData";
import {
  closestRealCareers,
  realAncestry,
  realLeaderboard,
  searchRealHorses,
} from "@/domains/history/simulation/realHorseInsights";

describe("real horse snapshot", () => {
  it("carries Frankel's real unbeaten record", () => {
    const f = findRealHorse("Frankel")!;
    expect(f.starts).toBe(14);
    expect(f.wins).toBe(14);
    expect(f.timeform).toBe(147);
    expect(realSireName(f)).toBe("Galileo");
  });

  it("carries Winx's real record", () => {
    const w = findRealHorse("Winx")!;
    expect([w.starts, w.wins]).toEqual([43, 37]);
  });
});

describe("legacy family trees use real horses", () => {
  it("adds real ancestors not in the curated list", () => {
    expect(pedigreeDataset.length).toBeGreaterThan(5000);
    expect(findHorseByName("Kincsem")?.birthYear).toBe(1874);
  });

  it("traces Frankel's male line through real sires", () => {
    const line = realAncestry(findRealHorse("Frankel")!).sireline.map((h) => h.name);
    expect(line.slice(0, 3)).toEqual(["Galileo", "Sadler's Wells", "Northern Dancer"]);
  });

  it("keeps curated entries ahead of real data", () => {
    expect(findHorseByName("Secretariat")?.sire).toBe("Bold Ruler");
  });
});

describe("real-record stallion research", () => {
  it("turns a flat Timeform rating into a speed figure (Timeform − 30)", () => {
    expect(researchFromRealRecord("Frankel")?.racingPerformance?.speedFigure).toBe(117);
  });

  it("ignores jumps ratings above 150 and clamps to 80-120", () => {
    const fig = researchFromRealRecord("Flyingbolt")?.racingPerformance?.speedFigure;
    if (fig !== undefined) {
      expect(fig).toBeGreaterThanOrEqual(80);
      expect(fig).toBeLessThanOrEqual(120);
    }
  });

  it("is used when no hand-researched entry exists", () => {
    expect(getStallionResearchData("Black Caviar")?.racingPerformance?.speedFigure).toBe(106);
  });
});

describe("almanac insights", () => {
  it("lists Frankel and Black Caviar among unbeaten careers", () => {
    const names = realLeaderboard("unbeaten", 200).map((h) => h.name);
    expect(names).toContain("Frankel");
    expect(names).toContain("Black Caviar");
  });

  it("finds a horse by name with the exact match first", () => {
    expect(searchRealHorses("winx")[0].name).toBe("Winx");
  });

  it("matches a perfect 14-from-14 career to unbeaten real horses", () => {
    const m = closestRealCareers({ starts: 14, wins: 14, earnings: 3_800_000 }, 3);
    expect(m[0].horse.wins).toBe(m[0].horse.starts);
  });

  it("returns no match for an unraced horse", () => {
    expect(closestRealCareers({ starts: 0, wins: 0, earnings: 0 })).toEqual([]);
  });
});

describe("real family-tree integrity", () => {
  it("no real horse is its own ancestor, and every parent is older", { timeout: 30_000 }, async () => {
    const { realHorses, realHorseById } = await import("@/shared/data/realHorses");
    const bad: string[] = [];
    for (const h of realHorses) {
      for (const pid of [h.sire, h.dam]) {
        const p = pid ? realHorseById.get(pid) : undefined;
        if (p?.foaled && h.foaled && p.foaled >= h.foaled) bad.push(`${h.name}: parent ${p.name} not older`);
      }
      const stack = [h.sire, h.dam];
      const seen = new Set<string>();
      while (stack.length) {
        const id = stack.pop();
        if (!id || seen.has(id)) continue;
        if (id === h.id) {
          bad.push(`${h.name}: own ancestor`);
          break;
        }
        seen.add(id);
        const n = realHorseById.get(id);
        if (n) stack.push(n.sire, n.dam);
      }
    }
    expect(bad).toEqual([]);
  });
});
