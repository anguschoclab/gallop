/**
 * careerTracker.ts - Off-screen career progression for NPC horses
 *
 * Real racing careers are continuous: a horse debuts as a juvenile, builds a
 * record through its prime, then tails off before retirement. NPC horses that
 * never happen to be entered in a race the player can see would otherwise sit
 * on a permanent 0-start, $0 record. This module simulates plausible off-screen
 * starts for those horses so their age, career record, earnings and fame evolve
 * over time.
 *
 * Pure derivation + deterministic RNG only — no state mutation of inputs.
 *
 * Dependencies: @/core/horse/types, @/core/horse/stats, @/core/common/rng
 * Related files: src/core/time/phases/npcCareerTrackerPhase.ts (drives this),
 *   src/components/stable/NpcCareerTrackerPanel.tsx (surfaces it)
 */

import type { Horse, HorseRaceHistoryEntry, NpcCareerStage } from "@/core/horse/types";
import type { StableTier } from "@/core/stable/types";
import type { Rng } from "@/core/common/rng";
import { calculateRaceRating } from "@/core/horse/stats";

/** Minimum age at which a horse can take an off-screen start. */
export const CAREER_DEBUT_AGE = 2;
/** Age past which off-screen racing stops (retirement phases take over). */
export const CAREER_MAX_AGE = 10;
/** Days a real (player-visible) start suppresses off-screen simulation. */
export const REAL_START_COOLDOWN_DAYS = 45;

const PURSE_SPLIT = [0.6, 0.2, 0.11, 0.05, 0.03, 0.01];

interface RaceClassBand {
  minRating: number;
  grade?: string;
  raceClass: string;
  purse: number;
  fameWeight: number;
  names: string[];
}

const CLASS_BANDS: RaceClassBand[] = [
  {
    minRating: 88,
    grade: "G1",
    raceClass: "Graded",
    purse: 1_200_000,
    fameWeight: 10,
    names: ["Continental Cup", "Sovereign Stakes", "Autumn Championship"],
  },
  {
    minRating: 82,
    grade: "G2",
    raceClass: "Graded",
    purse: 600_000,
    fameWeight: 7,
    names: ["Meridian Stakes", "Coronation Trial", "Harvest Cup"],
  },
  {
    minRating: 76,
    grade: "G3",
    raceClass: "Graded",
    purse: 320_000,
    fameWeight: 5,
    names: ["Provincial Stakes", "Riverside Trophy", "Foundry Cup"],
  },
  {
    minRating: 70,
    raceClass: "Listed",
    purse: 150_000,
    fameWeight: 3,
    names: ["Listed Handicap", "Borough Listed", "Midsummer Listed"],
  },
  {
    minRating: 62,
    raceClass: "Allowance",
    purse: 60_000,
    fameWeight: 1.5,
    names: ["Allowance Optional", "Conditions Race", "Novice Handicap"],
  },
  {
    minRating: 0,
    raceClass: "Claiming",
    purse: 24_000,
    fameWeight: 0.6,
    names: ["Claiming Handicap", "Selling Plate", "Maiden Claimer"],
  },
];

/** Progress bookkeeping stored on the horse so ticks stay idempotent per day. */
export interface NpcCareerProgressUpdate {
  lastOffscreenDay: number;
  offscreenStarts: number;
  offscreenWins: number;
  offscreenEarnings: number;
  stage: NpcCareerStage;
}

export interface OffscreenStartOutcome {
  entry: HorseRaceHistoryEntry;
  fameDelta: number;
  fanDelta: number;
  beyer: number;
}

/**
 * Determine which stage of its racing life a horse is in.
 *
 * @param horse - Horse to classify
 * @returns Career stage label
 */
export function careerStage(horse: Horse): NpcCareerStage {
  if (horse.lifecycleStatus && horse.lifecycleStatus !== "active") return "retired";
  const age = Math.floor(horse.age);
  const peak = horse.peakAge && horse.peakAge > 2 ? horse.peakAge : 4;
  if (age < CAREER_DEBUT_AGE) return "unraced";
  if (age === 2) return "juvenile";
  if (age >= CAREER_MAX_AGE) return "veteran";
  if (age < peak) return "rising";
  if (age <= peak + 1) return "prime";
  if (age >= 8) return "veteran";
  return "declining";
}

/**
 * Average number of days between off-screen starts for a horse.
 *
 * Busier in the prime years, sparser as a juvenile or veteran. Elite yards
 * campaign their horses slightly more often than budget yards.
 *
 * @param stage - Career stage
 * @param tier - Owning stable tier
 * @returns Interval in days
 */
export function offscreenStartInterval(stage: NpcCareerStage, tier: StableTier = "mid"): number {
  const base =
    stage === "juvenile"
      ? 42
      : stage === "rising"
        ? 32
        : stage === "prime"
          ? 28
          : stage === "declining"
            ? 38
            : stage === "veteran"
              ? 56
              : 0;
  if (base === 0) return 0;
  const tierMul = tier === "elite" ? 0.9 : tier === "budget" ? 1.15 : 1;
  return Math.round(base * tierMul);
}

/**
 * Day of the horse's most recent start, off-screen or real. Null when unraced.
 * @param horse - the horse to query
 */
export function lastStartDay(horse: Horse): number | null {
  const history = horse.raceHistory ?? [];
  if (history.length === 0) return horse.careerTracker?.lastOffscreenDay ?? null;
  let max = -Infinity;
  for (const e of history) if (e.day > max) max = e.day;
  const tracked = horse.careerTracker?.lastOffscreenDay ?? -Infinity;
  const latest = Math.max(max, tracked);
  return Number.isFinite(latest) ? latest : null;
}

/**
 * Day of the horse's most recent player-visible (non off-screen) start.
 * @param horse - the horse to query
 */
function lastRealStartDay(horse: Horse): number | null {
  let max = -Infinity;
  for (const e of horse.raceHistory ?? []) if (!e.offscreen && e.day > max) max = e.day;
  return Number.isFinite(max) ? max : null;
}

/**
 * Whether a horse should take an off-screen start today.
 *
 * Horses actively campaigning in the real race calendar are left alone so the
 * tracker never double-counts a career.
 *
 * @param horse - NPC horse
 * @param day - Current game day
 * @param tier - Owning stable tier
 * @param rng - Deterministic RNG
 * @returns True when an off-screen start should be simulated
 */
export function isDueForOffscreenStart(
  horse: Horse,
  day: number,
  tier: StableTier,
  rng: Rng,
): boolean {
  const stage = careerStage(horse);
  const interval = offscreenStartInterval(stage, tier);
  if (interval <= 0) return false;
  if (horse.age < CAREER_DEBUT_AGE || horse.age > CAREER_MAX_AGE) return false;
  if (horse.stud?.atStud) return false;
  if ((horse.activeInjury?.recoveryDays ?? 0) > 0) return false;

  const real = lastRealStartDay(horse);
  if (real !== null && day - real < REAL_START_COOLDOWN_DAYS) return false;

  const last = lastStartDay(horse);
  const since = last === null ? interval : day - last;
  if (since < interval * 0.6) return false;

  // Probability ramps as the gap grows past the target interval.
  const chance = Math.min(1, (since / interval) * (1 / interval));
  return rng.next() < chance;
}

function bandFor(rating: number): RaceClassBand {
  return CLASS_BANDS.find((b) => rating >= b.minRating) ?? CLASS_BANDS[CLASS_BANDS.length - 1];
}

function samplePosition(rating: number, fieldSize: number, rng: Rng): number {
  const mine = rating + rng.gauss(0, 7);
  let better = 0;
  for (let i = 0; i < fieldSize - 1; i++) {
    if (rating - 2 + rng.gauss(0, 8) > mine) better++;
  }
  return better + 1;
}

function preferredSurface(horse: Horse): "Turf" | "Dirt" | "Synthetic" {
  const apt = horse.surfaceAptitude ?? { Turf: 1, Dirt: 0, Synthetic: 0 };
  const entries: ["Turf" | "Dirt" | "Synthetic", number][] = [
    ["Turf", apt.Turf ?? 0],
    ["Dirt", apt.Dirt ?? 0],
    ["Synthetic", apt.Synthetic ?? 0],
  ];
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Simulate one off-screen start for an NPC horse.
 *
 * Class, purse, field strength and finishing position all derive from the
 * horse's race rating, so a good horse builds a good record over time.
 *
 * @param horse - NPC horse
 * @param day - Game day of the start
 * @param tier - Owning stable tier
 * @param rng - Deterministic RNG
 * @returns Race history entry plus fame/fan deltas
 */
export function simulateOffscreenStart(
  horse: Horse,
  day: number,
  tier: StableTier,
  rng: Rng,
): OffscreenStartOutcome {
  const rating = Math.max(20, Math.min(100, calculateRaceRating(horse)));
  const band = bandFor(rating);
  const tierMul = tier === "elite" ? 1.1 : tier === "budget" ? 0.85 : 1;
  const purse = Math.round((band.purse * tierMul) / 1000) * 1000;
  const fieldSize = rng.int(7, 12);
  const position = samplePosition(rating, fieldSize, rng);
  const share = PURSE_SPLIT[position - 1] ?? 0;
  const purseEarned = Math.round(purse * share);

  const apt = horse.distanceAptitude ?? 1600;
  const distance = Math.max(800, Math.min(3600, Math.round((apt + rng.gauss(0, 180)) / 100) * 100));
  const beyer = Math.round(
    Math.max(20, 62 + (rating - 60) * 0.95 - (position - 1) * 1.6 + rng.gauss(0, 3)),
  );

  const placeWeight = position === 1 ? 1 : position === 2 ? 0.45 : position === 3 ? 0.25 : 0.05;
  const fameDelta = Math.round(band.fameWeight * placeWeight * 10) / 10;
  const fanDelta = Math.round(band.fameWeight * placeWeight * 40);

  const entry: HorseRaceHistoryEntry = {
    raceId: `offscreen-${horse.id}-${day}`,
    raceName: band.names[rng.int(0, band.names.length - 1)],
    position,
    day,
    beyer,
    grade: band.grade,
    distance,
    surface: preferredSurface(horse),
    purse,
    purseEarned,
    fieldSize,
    raceClass: band.raceClass,
    offscreen: true,
  };

  return { entry, fameDelta, fanDelta, beyer };
}

/**
 * Apply an off-screen start to a horse, returning a new horse object.
 *
 * @param horse - NPC horse
 * @param outcome - Simulated start
 * @returns Updated horse with career record, earnings, fame and fans advanced
 */
export function applyOffscreenStart(horse: Horse, outcome: OffscreenStartOutcome): Horse {
  const { entry, fameDelta, fanDelta, beyer } = outcome;
  const won = entry.position === 1;
  const prior = horse.careerTracker;

  return {
    ...horse,
    raceHistory: [...(horse.raceHistory ?? []), entry],
    careerStarts: (horse.careerStarts ?? 0) + 1,
    careerWins: (horse.careerWins ?? 0) + (won ? 1 : 0),
    lifetimeEarnings: (horse.lifetimeEarnings ?? 0) + (entry.purseEarned ?? 0),
    fame: Math.min(100, Math.max(0, (horse.fame ?? 0) + fameDelta)),
    fanCount: Math.max(0, (horse.fanCount ?? 0) + fanDelta),
    lastBeyer: beyer,
    careerTracker: {
      lastOffscreenDay: entry.day,
      offscreenStarts: (prior?.offscreenStarts ?? 0) + 1,
      offscreenWins: (prior?.offscreenWins ?? 0) + (won ? 1 : 0),
      offscreenEarnings: (prior?.offscreenEarnings ?? 0) + (entry.purseEarned ?? 0),
      stage: careerStage(horse),
    },
  };
}

export interface NpcCareerSummary {
  stage: NpcCareerStage;
  starts: number;
  wins: number;
  earnings: number;
  winRate: number;
  offscreenStarts: number;
  lastStartDay: number | null;
  daysSinceStart: number | null;
}

/**
 * Summarise a horse's career for display.
 *
 * @param horse - Horse to summarise
 * @param day - Current game day (for idle days)
 * @returns Career summary
 */
export function summarizeNpcCareer(horse: Horse, day: number): NpcCareerSummary {
  const history = horse.raceHistory ?? [];
  const wins = history.filter((e) => e.position === 1).length;
  const earnings = history.reduce((sum, e) => sum + (e.purseEarned ?? 0), 0);
  const last = lastStartDay(horse);
  return {
    stage: careerStage(horse),
    starts: history.length,
    wins,
    earnings,
    winRate: history.length ? wins / history.length : 0,
    offscreenStarts: horse.careerTracker?.offscreenStarts ?? 0,
    lastStartDay: last,
    daysSinceStart: last === null ? null : Math.max(0, day - last),
  };
}

/**
 * Human label for a career stage.
 * @param stage - the career stage
 */
export function careerStageLabel(stage: NpcCareerStage): string {
  switch (stage) {
    case "unraced":
      return "Unraced";
    case "juvenile":
      return "Juvenile";
    case "rising":
      return "Rising";
    case "prime":
      return "Prime";
    case "declining":
      return "Declining";
    case "veteran":
      return "Veteran";
    case "retired":
      return "Retired";
  }
}
