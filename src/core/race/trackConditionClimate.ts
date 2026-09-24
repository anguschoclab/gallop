/**
 * trackConditionClimate.ts - Climate zone and Koppen climate profiles
 *
 * Extracted from trackConditionData.ts for modularity.
 * Contains condition bias distributions and drying rates by climate zone
 * and Koppen climate code.
 */

import type { TrackCondition } from "@/game/types";
import type { KoppenCode } from "@/core/weather/koppenTypes";

export type ClimateZone =
  "arid" | "temperate" | "humid" | "tropical" | "continental" | "cool" | "warm";

export const CLIMATE_CONDITION_BIAS: Record<ClimateZone, Record<TrackCondition, number>> = {
  arid: {
    fast: 0.7,
    good: 0.2,
    soft: 0.07,
    heavy: 0.02,
    yielding: 0.01,
  },
  temperate: {
    fast: 0.45,
    good: 0.35,
    soft: 0.15,
    heavy: 0.04,
    yielding: 0.01,
  },
  humid: {
    fast: 0.25,
    good: 0.35,
    soft: 0.3,
    heavy: 0.08,
    yielding: 0.02,
  },
  tropical: {
    fast: 0.15,
    good: 0.25,
    soft: 0.35,
    heavy: 0.2,
    yielding: 0.05,
  },
  continental: {
    fast: 0.5,
    good: 0.3,
    soft: 0.15,
    heavy: 0.04,
    yielding: 0.01,
  },
  cool: {
    fast: 0.3,
    good: 0.4,
    soft: 0.2,
    heavy: 0.08,
    yielding: 0.02,
  },
  warm: {
    fast: 0.5,
    good: 0.3,
    soft: 0.1,
    heavy: 0.08,
    yielding: 0.02,
  },
};

export const CLIMATE_DRYING_RATES: Record<ClimateZone, number> = {
  arid: 2.0,
  temperate: 1.0,
  humid: 0.7,
  tropical: 0.5,
  continental: 1.2,
  cool: 0.8,
  warm: 1.5,
};

export const KOPPEN_CONDITION_BIAS: Record<KoppenCode, Record<TrackCondition, number>> = {
  Cfb: {
    fast: 0.2,
    good: 0.45,
    soft: 0.25,
    heavy: 0.08,
    yielding: 0.02,
  },
  Cfa: {
    fast: 0.3,
    good: 0.35,
    soft: 0.22,
    heavy: 0.1,
    yielding: 0.03,
  },
  Csa: {
    fast: 0.6,
    good: 0.3,
    soft: 0.08,
    heavy: 0.02,
    yielding: 0,
  },
  Csb: {
    fast: 0.5,
    good: 0.35,
    soft: 0.12,
    heavy: 0.03,
    yielding: 0,
  },
  BWh: {
    fast: 0.75,
    good: 0.2,
    soft: 0.04,
    heavy: 0.01,
    yielding: 0,
  },
  Dfb: {
    fast: 0.25,
    good: 0.4,
    soft: 0.22,
    heavy: 0.1,
    yielding: 0.03,
  },
  Dfa: {
    fast: 0.35,
    good: 0.35,
    soft: 0.18,
    heavy: 0.09,
    yielding: 0.03,
  },
  Aw: {
    fast: 0.2,
    good: 0.3,
    soft: 0.3,
    heavy: 0.15,
    yielding: 0.05,
  },
  Af: {
    fast: 0.15,
    good: 0.25,
    soft: 0.35,
    heavy: 0.2,
    yielding: 0.05,
  },
  BSk: {
    fast: 0.55,
    good: 0.3,
    soft: 0.1,
    heavy: 0.04,
    yielding: 0.01,
  },
  ET: {
    fast: 0.4,
    good: 0.35,
    soft: 0.18,
    heavy: 0.06,
    yielding: 0.01,
  },
};

export const KOPPEN_DRYING_RATES: Record<KoppenCode, number> = {
  Cfb: 0.9,
  Cfa: 1.0,
  Csa: 1.6,
  Csb: 1.3,
  BWh: 2.5,
  Dfb: 0.8,
  Dfa: 1.1,
  Aw: 0.6,
  Af: 0.4,
  BSk: 1.8,
  ET: 0.5,
};
