import type { Horse, Race, RaceClass, Hemisphere, Conformation, Temperament, GeneticMarkers, HealthStatus, CoatColor, Weather, TrackCondition, RunningStyle } from "./types";
import { randomHorseName, randomSilk, randomRaceName } from "./names";
import type { GradedRace } from "./gradedRaces";
import { generateUUID } from "./uuid";

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

// Pick a running style biased by the horse's stat profile. Speed/acceleration
// tilt toward front-runner; stamina tilts toward closer; balanced horses lean
// stalker. There's still randomness so identical-stat horses can differ.
function rollRunningStyle(stats: { speed: number; stamina: number; acceleration: number }): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = Math.random() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "front-runner";
  if (r < 55) return "stalker";
  if (r < 80) return "mid-pack";
  return "closer";
}

function generateHealthStatus(): HealthStatus {
  // Most horses are healthy, small chance of illness
  const r = Math.random();
  if (r < 0.02) return "covering_sickness"; // 2% chance
  if (r < 0.05) return "other_illness"; // 3% chance
  return "healthy";
}

function randomCoatColor(): CoatColor {
  const colors: CoatColor[] = ["bay", "black", "chestnut", "dark-bay", "gray", "roan", "palomino", "white"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomWeather(): Weather {
  const r = Math.random();
  if (r < 0.45) return "sunny";
  if (r < 0.70) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
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

  const stats = {
    speed: rand(lo, hi),
    stamina: rand(lo, hi),
    acceleration: rand(lo, hi),
    consistency: rand(lo, hi),
  };
  return {
    id: generateUUID(),
    name: randomHorseName(),
    age,
    gender,
    hemisphere,
    silk: randomSilk(),
    stats,
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
    runningStyle: rollRunningStyle(stats),
    fame: 0, // Player horses start with no fame
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
    id: generateUUID(),
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
    graded: { key: g.key, grade: g.grade, track: g.track, trackId: g.trackId, surface: g.surface },
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
    id: generateUUID(),
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
