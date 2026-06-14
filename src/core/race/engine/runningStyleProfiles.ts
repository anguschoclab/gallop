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
