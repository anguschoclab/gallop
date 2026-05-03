import type { Horse, Race, RaceClass } from "./types";
import { randomHorseName, randomSilk, randomRaceName } from "./names";
import type { GradedRace } from "./gradedRaces";

const uid = () => Math.random().toString(36).slice(2, 10);

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateHorse(opts: { tier?: "starter" | "budget" | "mid" | "elite"; owned?: boolean } = {}): Horse {
  const tier = opts.tier ?? "budget";
  const ranges: Record<string, [number, number]> = {
    starter: [30, 55],
    budget: [25, 60],
    mid: [45, 75],
    elite: [60, 90],
  };
  const [lo, hi] = ranges[tier];
  const potentialRanges: Record<string, [number, number]> = {
    starter: [65, 80],
    budget: [60, 80],
    mid: [75, 90],
    elite: [85, 100],
  };
  const [pLo, pHi] = potentialRanges[tier];

  return {
    id: uid(),
    name: randomHorseName(),
    age: rand(2, 6),
    silk: randomSilk(),
    stats: {
      speed: rand(lo, hi),
      stamina: rand(lo, hi),
      acceleration: rand(lo, hi),
      consistency: rand(lo, hi),
    },
    energy: 100,
    form: 0,
    potential: rand(pLo, pHi),
    raceHistory: [],
    owned: opts.owned ?? false,
    sireName: randomHorseName(),
    damName: randomHorseName(),
  };
}

export function horsePrice(h: Horse): number {
  const overall = (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
  const ageMod = h.age <= 3 ? 1.2 : h.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;
  return Math.round((overall * 80 * ageMod * potMod) / 50) * 50;
}

const classConfig: Record<RaceClass, { entry: number; purse: number; minStat?: number; dist: [number, number] }> = {
  Maiden: { entry: 100, purse: 2000, dist: [1000, 1400] },
  Allowance: { entry: 300, purse: 6000, minStat: 50, dist: [1200, 1800] },
  Stakes: { entry: 800, purse: 18000, minStat: 65, dist: [1400, 2200] },
  Group: { entry: 2000, purse: 50000, minStat: 78, dist: [1600, 2400] },
  Graded: { entry: 0, purse: 0, dist: [1200, 2400] },
};

export function makeGradedRace(g: GradedRace, gameDay: number): Race {
  const entryFee = g.grade === "G1" ? 2500 : g.grade === "G2" ? 1500 : 1000;
  const minStat = g.grade === "G1" ? 78 : g.grade === "G2" ? 70 : 62;
  return {
    id: uid(),
    name: g.name,
    day: gameDay,
    distance: g.distance,
    raceClass: "Graded",
    entryFee,
    purse: g.purse,
    minStat,
    fieldSize: 12,
    entries: [],
    resolved: false,
    graded: { key: g.key, grade: g.grade, track: g.track, surface: g.surface },
    restrictions: g.restrictions,
  };
}

export function generateRace(day: number): Race {
  const r = Math.random();
  const cls: RaceClass = r < 0.45 ? "Maiden" : r < 0.78 ? "Allowance" : r < 0.95 ? "Stakes" : "Group";
  const cfg = classConfig[cls];
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100) * 100;
  return {
    id: uid(),
    name: randomRaceName(),
    day,
    distance,
    raceClass: cls,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(6, 8),
    entries: [],
    resolved: false,
  };
}
