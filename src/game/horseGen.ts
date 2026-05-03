import type { Horse, Lineage, Race, RaceClass, Sex } from "./types";
import { randomHorseName, randomSilk, randomRaceName } from "./names";

const uid = () => Math.random().toString(36).slice(2, 10);

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function generateHorse(opts: {
  tier?: "starter" | "budget" | "mid" | "elite";
  owned?: boolean;
  sex?: Sex;
  age?: number;
  lineage?: Lineage;
} = {}): Horse {
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
    age: opts.age ?? rand(2, 6),
    sex: opts.sex ?? (Math.random() < 0.5 ? "M" : "F"),
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
    lineage: opts.lineage ?? {},
  };
}

export function horsePrice(h: Horse): number {
  const overall = (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
  const ageMod = h.age <= 3 ? 1.2 : h.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;
  return Math.round((overall * 80 * ageMod * potMod) / 50) * 50;
}

/**
 * Stud fee for using a sire (public or owned). Premium for elite potential.
 */
export function studFee(sire: Horse): number {
  const overall = (sire.stats.speed + sire.stats.stamina + sire.stats.acceleration + sire.stats.consistency) / 4;
  const fee = (overall * 30 + sire.potential * 25) * (sire.publicStud ? 1.4 : 1);
  return Math.round(fee / 50) * 50;
}

/**
 * Generate a public stud — top-tier male, available for breeding only.
 */
export function generatePublicStud(): Horse {
  const h = generateHorse({ tier: "elite", sex: "M" });
  h.publicStud = true;
  h.retired = true;
  h.studFee = studFee(h);
  return h;
}

/**
 * Breed two horses to produce a foal. Foal stats inherit from parents
 * with variance. Foal arrives at age 2 (race-eligible) for gameplay simplicity.
 */
export function breed(sire: Horse, dam: Horse): Horse {
  const inherit = (a: number, b: number, lo = 20, hi = 95) => {
    const mid = (a + b) / 2;
    const variance = (Math.random() - 0.5) * 20; // ±10
    return clamp(Math.round(mid + variance), lo, hi);
  };

  const stats = {
    speed: inherit(sire.stats.speed, dam.stats.speed),
    stamina: inherit(sire.stats.stamina, dam.stats.stamina),
    acceleration: inherit(sire.stats.acceleration, dam.stats.acceleration),
    consistency: inherit(sire.stats.consistency, dam.stats.consistency),
  };

  // Potential: average + slight bias toward higher parent + small chance of exceptional
  const parentPotAvg = (sire.potential + dam.potential) / 2;
  const parentPotMax = Math.max(sire.potential, dam.potential);
  const exceptional = Math.random() < 0.08;
  const potBase = parentPotAvg + (parentPotMax - parentPotAvg) * 0.3;
  const potential = clamp(
    Math.round(potBase + (Math.random() - 0.4) * 12 + (exceptional ? 8 : 0)),
    55,
    100
  );

  return {
    id: uid(),
    name: randomHorseName(),
    age: 2,
    sex: Math.random() < 0.5 ? "M" : "F",
    silk: randomSilk(),
    stats,
    energy: 100,
    form: 0,
    potential,
    raceHistory: [],
    owned: true,
    lineage: {
      sireId: sire.id,
      sireName: sire.name,
      damId: dam.id,
      damName: dam.name,
    },
  };
}

/**
 * Predict the foal stat range a player can expect. Used for UI preview.
 */
export function foalPreview(sire: Horse, dam: Horse) {
  const avg = (key: keyof typeof sire.stats) =>
    Math.round((sire.stats[key] + dam.stats[key]) / 2);
  const potAvg = Math.round((sire.potential + dam.potential) / 2);
  return {
    expectedStats: {
      speed: avg("speed"),
      stamina: avg("stamina"),
      acceleration: avg("acceleration"),
      consistency: avg("consistency"),
    },
    expectedPotential: potAvg,
    statRange: 20, // ±10
  };
}

const classConfig: Record<RaceClass, { entry: number; purse: number; minStat?: number; dist: [number, number] }> = {
  Maiden: { entry: 100, purse: 2000, dist: [1000, 1400] },
  Allowance: { entry: 300, purse: 6000, minStat: 50, dist: [1200, 1800] },
  Stakes: { entry: 800, purse: 18000, minStat: 65, dist: [1400, 2200] },
  Group: { entry: 2000, purse: 50000, minStat: 78, dist: [1600, 2400] },
};

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
