import type { RunningStyle } from "@/core/horse/types";

export interface RunningStyleProfile {
  /** Human-readable label for UI / docs. */
  label: string;
  /** Preferred relative front-of-field slot, 0 = leader … 1 = last. */
  preferredFieldFraction: number;
  /** Max fractional velocity dampening when ahead of preferred slot. */
  seekMaxDampen: number;
  /** Max fractional velocity boost when behind preferred slot. */
  seekMaxBoost: number;
  /** Slope applied to (delta) when dampening. */
  seekDampenSlope: number;
  /** Slope applied to (delta) when boosting. */
  seekBoostSlope: number;
  /** Extra spurt-buildup fraction on top of the base peak. */
  spurtBuildupExtra: number;
}

export const RUNNING_STYLE_PROFILES: Record<RunningStyle, RunningStyleProfile> = {
  E: {
    label: "Front-runner",
    preferredFieldFraction: 0.08,
    seekMaxDampen: 0.04,
    seekMaxBoost: 0.02,
    seekDampenSlope: 0.15,
    seekBoostSlope: 0.08,
    spurtBuildupExtra: 0,
  },
  EP: {
    label: "Early-presser",
    preferredFieldFraction: 0.25,
    seekMaxDampen: 0.04,
    seekMaxBoost: 0.02,
    seekDampenSlope: 0.15,
    seekBoostSlope: 0.08,
    spurtBuildupExtra: 0,
  },
  P: {
    label: "Stalker",
    preferredFieldFraction: 0.5,
    seekMaxDampen: 0.04,
    seekMaxBoost: 0.02,
    seekDampenSlope: 0.15,
    seekBoostSlope: 0.08,
    spurtBuildupExtra: 0.03,
  },
  S: {
    label: "Closer",
    preferredFieldFraction: 0.78,
    seekMaxDampen: 0.04,
    seekMaxBoost: 0.02,
    seekDampenSlope: 0.15,
    seekBoostSlope: 0.08,
    spurtBuildupExtra: 0.03,
  },
};

// Shared (non per-style) seek/spurt window constants
export const POSITION_SEEK_PROGRESS = 0.15;
export const POSITION_SEEK_MAX_DAMPEN = 0.04;
export const POSITION_SEEK_MAX_BOOST = 0.02;
export const SPURT_BUILDUP_START_M = 600;
export const SPURT_BUILDUP_END_M = 400;
export const SPURT_BUILDUP_PEAK = 0.04;

export function getRunningStyleProfile(style: RunningStyle): RunningStyleProfile {
  return RUNNING_STYLE_PROFILES[style];
}

/**
 * Compute a dynamic running style profile that adapts to race conditions.
 *
 * Adjusts preferredFieldFraction based on pace rating, field size, and race progress.
 * Scales spurtBuildupExtra by horse acceleration and jockey vigor.
 * Reduces seekMaxBoost for fatigued horses (recoveryPoints < 50).
 *
 * @param style - The horse's base running style
 * @param paceRating - Current pace rating (0.8 = crawl, 1.0 = normal, 1.2 = blistering)
 * @param fieldSize - Number of runners in the race
 * @param progress - Race progress 0-1
 * @param horse - Optional horse object with stats.acceleration and recoveryPoints
 * @param horse.stats
 * @param horse.stats.acceleration
 * @param horse.recoveryPoints
 * @param jockey - Optional jockey object with stats.vigor
 * @param jockey.stats
 * @param jockey.stats.vigor
 * @returns Adjusted RunningStyleProfile
 */
export function getDynamicProfile(
  style: RunningStyle,
  paceRating: number,
  fieldSize: number,
  progress: number,
  horse?: { stats?: { acceleration?: number }; recoveryPoints?: number },
  jockey?: { stats?: { vigor?: number } },
): RunningStyleProfile {
  const base = RUNNING_STYLE_PROFILES[style] ?? RUNNING_STYLE_PROFILES["P"];
  let { preferredFieldFraction, seekMaxBoost, spurtBuildupExtra } = base;

  // 1. Adaptive preferred field fraction based on pace
  if (paceRating < 1.0) {
    // Slow pace: front-runners further forward, closers slightly back
    const paceDelta = 1.0 - paceRating;
    if (style === "E" || style === "EP") {
      preferredFieldFraction = Math.max(0, preferredFieldFraction - paceDelta * 0.1);
    } else if (style === "S") {
      preferredFieldFraction = Math.min(1, preferredFieldFraction + paceDelta * 0.05);
    }
  } else if (paceRating > 1.0) {
    // Fast pace: closers further back, front-runners slightly back
    const paceDelta = paceRating - 1.0;
    if (style === "S") {
      preferredFieldFraction = Math.min(1, preferredFieldFraction + paceDelta * 0.08);
    } else if (style === "E") {
      preferredFieldFraction = Math.min(1, preferredFieldFraction + paceDelta * 0.03);
    }
  }

  // 2. Large fields (>14) shift all styles toward midpack
  if (fieldSize > 14) {
    const shift = Math.min(0.1, (fieldSize - 14) * 0.02);
    if (preferredFieldFraction < 0.5) {
      preferredFieldFraction = Math.min(0.5, preferredFieldFraction + shift);
    } else {
      preferredFieldFraction = Math.max(0.5, preferredFieldFraction - shift);
    }
  }

  // 3. Late race (progress > 0.7): closers shift forward
  if (progress > 0.7 && (style === "S" || style === "P")) {
    const lateShift = ((progress - 0.7) / 0.3) * 0.1;
    preferredFieldFraction = Math.max(0, preferredFieldFraction - lateShift);
  }

  // 4. Spurt buildup scaling by horse acceleration and jockey vigor
  if (horse?.stats?.acceleration != null || jockey?.stats?.vigor != null) {
    const accel = horse?.stats?.acceleration ?? 50;
    const vigor = jockey?.stats?.vigor ?? 50;
    const spurtBonus = (accel / 100) * 0.02 + (vigor / 100) * 0.02;
    spurtBuildupExtra = base.spurtBuildupExtra + spurtBonus;
  }

  // 5. Energy-aware: reduce seekMaxBoost by 50% if fatigued
  const recoveryPoints = horse?.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    seekMaxBoost = base.seekMaxBoost * 0.5;
  }

  return {
    ...base,
    preferredFieldFraction,
    seekMaxBoost,
    spurtBuildupExtra,
  };
}
