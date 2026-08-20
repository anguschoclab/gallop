/**
 * trackConditionTerminology.ts - Regional terminology and surface modifiers
 *
 * Extracted from trackConditionData.ts for modularity.
 * Contains regional condition labels, speed/stamina modifiers, and surface compatibility.
 */

import type { TrackCondition } from "@/game/types";

export type RegionCode = "us" | "europe" | "australia" | "asia" | "south_america";

export const CONDITION_TIERS: TrackCondition[] = ["fast", "good", "soft", "heavy", "yielding"];

export const REGIONAL_TERMINOLOGY: Record<
  RegionCode,
  Record<TrackCondition, { label: string; abbreviation: string; description: string }>
> = {
  us: {
    fast: { label: "Fast", abbreviation: "FT", description: "Dry, hard surface. Optimal speed." },
    good: { label: "Good", abbreviation: "GD", description: "Slightly loosened, still quick." },
    soft: { label: "Muddy", abbreviation: "MY", description: "Wet but firming. Challenging." },
    heavy: { label: "Sloppy", abbreviation: "SL", description: "Waterlogged, very testing." },
    yielding: {
      label: "Sealed",
      abbreviation: "SX",
      description: "Packed wet surface for stability.",
    },
  },
  europe: {
    fast: { label: "Firm", abbreviation: "FM", description: "Hard turf. Fast times expected." },
    good: { label: "Good", abbreviation: "GF", description: "Ideal racing surface." },
    soft: { label: "Soft", abbreviation: "SF", description: "Dampened, more stamina required." },
    heavy: { label: "Heavy", abbreviation: "HV", description: "Deep going. Tests endurance." },
    yielding: { label: "Yielding", abbreviation: "YD", description: "Slow surface, hard work." },
  },
  australia: {
    fast: { label: "Good", abbreviation: "G", description: "Hard, fast surface." },
    good: { label: "Good (3)", abbreviation: "G3", description: "Standard good going." },
    soft: { label: "Soft", abbreviation: "S", description: "Damp surface, slower pace." },
    heavy: { label: "Heavy", abbreviation: "H", description: "Very slow, demanding conditions." },
    yielding: { label: "Slow", abbreviation: "SLW", description: "Energy-sapping surface." },
  },
  asia: {
    fast: { label: "Good", abbreviation: "G", description: "Firm, fast racing surface." },
    good: { label: "Good to Firm", abbreviation: "GF", description: "Ideal conditions." },
    soft: { label: "Good to Soft", abbreviation: "GS", description: "Some cut in the ground." },
    heavy: { label: "Soft", abbreviation: "S", description: "Testing, stamina-sapping." },
    yielding: { label: "Heavy", abbreviation: "H", description: "Extremely demanding." },
  },
  south_america: {
    fast: { label: "Firme", abbreviation: "FR", description: "Firme y rápido." },
    good: { label: "Bueno", abbreviation: "BN", description: "Condiciones ideales." },
    soft: { label: "Blando", abbreviation: "BL", description: "Con algo de barro." },
    heavy: { label: "Pesado", abbreviation: "PS", description: "Muy exigente." },
    yielding: { label: "Muy Pesado", abbreviation: "MP", description: "Extremadamente difícil." },
  },
};

export const TRACK_SPEED_MODIFIERS: Record<TrackCondition, number> = {
  fast: 1.0,
  good: 0.985,
  soft: 0.95,
  heavy: 0.93,
  yielding: 0.9,
};

export const STAMINA_DRAIN_MODIFIERS: Record<TrackCondition, number> = {
  fast: 1.0,
  good: 1.05,
  soft: 1.15,
  heavy: 1.3,
  yielding: 1.5,
};

export const SURFACE_COMPATIBILITY: Record<
  "dirt" | "turf" | "synthetic",
  { validConditions: TrackCondition[]; preferred: TrackCondition[] }
> = {
  dirt: {
    validConditions: ["fast", "good", "soft", "heavy", "yielding"],
    preferred: ["fast", "good"],
  },
  turf: {
    validConditions: ["fast", "good", "soft", "heavy", "yielding"],
    preferred: ["good", "soft"],
  },
  synthetic: {
    validConditions: ["fast", "good", "soft"],
    preferred: ["fast", "good"],
  },
};
