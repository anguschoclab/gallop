import type { Horse, Race, RaceClass, Hemisphere, Conformation, Temperament, GeneticMarkers, HealthStatus, CoatColor, Weather, TrackCondition } from "./types";
import { randomHorseName, randomSilk, randomRaceName } from "./names";
import type { GradedRace } from "./gradedRaces";

const uid = () => Math.random().toString(36).slice(2, 10);

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randConformation(): Conformation {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function randTemperament(): Temperament {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function randGeneticQuality(): "excellent" | "good" | "fair" | "poor" {
  const r = Math.random();
  if (r < 0.15) return "excellent";
  if (r < 0.45) return "good";
  if (r < 0.75) return "fair";
  return "poor";
}

function generateGeneticMarkers(): GeneticMarkers {
  // Based on horse genome research - genes governing sensory perception, signal transduction, and immunity
  return {
    sensoryPerception: randGeneticQuality(),
    signalTransduction: randGeneticQuality(),
    immunity: randGeneticQuality(),
    geneticDiversity: Math.random() * 0.5 + 0.5, // Random diversity score 0.5-1.0
  };
}

function generateHealthStatus(): HealthStatus {
  // Most horses are healthy, small chance of illness
  const r = Math.random();
  if (r < 0.02) return "covering_sickness"; // 2% chance
  if (r < 0.05) return "other_illness"; // 3% chance
  return "healthy";
}

function randomCoatColor(): CoatColor {
  const colors: CoatColor[] = ["bay", "black", "chestnut", "dark-bay", "gray"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomWeather(): Weather {
  return Math.random() < 0.8 ? "sunny" : "rainy";
}

function randomTrackCondition(): TrackCondition {
  const r = Math.random();
  if (r < 0.6) return "fast";
  if (r < 0.85) return "good";
  if (r < 0.95) return "soft";
  return "heavy";
}

export function generateHorse(opts: { tier?: "starter" | "budget" | "mid" | "elite"; owned?: boolean; hemisphere?: Hemisphere } = {}): Horse {
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
  const age = rand(2, 6);
  const isMale = Math.random() < 0.5;
  const gender = age <= 2 ? (isMale ? "colt" : "filly") : (isMale ? "horse" : "mare");
  const hemisphere: Hemisphere = opts.hemisphere ?? (Math.random() < 0.5 ? "Northern" : "Southern");

  return {
    id: uid(),
    name: randomHorseName(),
    age,
    gender,
    hemisphere,
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
    conformation: randConformation(),
    temperament: randTemperament(),
    geneticMarkers: generateGeneticMarkers(),
    healthStatus: "healthy",
    coatColor: randomCoatColor(),
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
    weather: randomWeather(),
    trackCondition: randomTrackCondition(),
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
    weather: randomWeather(),
    trackCondition: randomTrackCondition(),
  };
}
