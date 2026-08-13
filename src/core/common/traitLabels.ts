import type { JockeyTrait } from "@/core/jockey/types";
import type { Horse } from "@/core/horse/types";
import { resolveTrait } from "@/core/genetics/phenotype/traits";
import { SPECIALIZED_TRAITS } from "@/core/staff/staffGenerator";

function titleCase(snake: string): string {
  return snake
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- Jockey traits ---

export function formatJockeyTrait(trait: JockeyTrait): string {
  return titleCase(trait);
}

export const JOCKEY_TRAIT_OPTIONS: { value: JockeyTrait | "all"; label: string }[] = [
  { value: "all", label: "All Traits" },
  { value: "bullring_expert", label: "Bullring Expert" },
  { value: "hill_specialist", label: "Hill Specialist" },
  { value: "long_straight_pro", label: "Long Straight Pro" },
  { value: "gate_master", label: "Gate Master" },
];

// --- Staff traits ---

export function formatStaffTrait(trait: string): string {
  return titleCase(trait);
}

const ALL_STAFF_TRAITS: string[] = [...new Set(Object.values(SPECIALIZED_TRAITS).flat())].sort();

export const STAFF_TRAIT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Traits" },
  ...ALL_STAFF_TRAITS.map((t) => ({ value: t, label: formatStaffTrait(t) })),
];

// --- Horse traits ---

export type HorseTraitKey =
  | "runningStyle"
  | "fiberBias"
  | "strideType"
  | "trackPreference"
  | "weatherPreference"
  | "temperament"
  | "constitution";

export const HORSE_TRAIT_CATEGORY_OPTIONS: { value: HorseTraitKey | "all"; label: string }[] = [
  { value: "all", label: "All Traits" },
  { value: "runningStyle", label: "Running Style" },
  { value: "fiberBias", label: "Fiber Bias" },
  { value: "strideType", label: "Stride Type" },
  { value: "trackPreference", label: "Track Preference" },
  { value: "weatherPreference", label: "Weather Preference" },
  { value: "temperament", label: "Temperament" },
  { value: "constitution", label: "Constitution" },
];

export const HORSE_TRAIT_OPTIONS: Record<HorseTraitKey, { value: string; label: string }[]> = {
  runningStyle: [
    { value: "all", label: "All" },
    { value: "E", label: "Early" },
    { value: "EP", label: "Early/Presser" },
    { value: "P", label: "Presser" },
    { value: "S", label: "Sustainer" },
  ],
  fiberBias: [
    { value: "all", label: "All" },
    { value: "sprinter", label: "Sprinter" },
    { value: "balanced", label: "Balanced" },
    { value: "stayer", label: "Stayer" },
  ],
  strideType: [
    { value: "all", label: "All" },
    { value: "short", label: "Short" },
    { value: "average", label: "Average" },
    { value: "long", label: "Long" },
  ],
  trackPreference: [
    { value: "all", label: "All" },
    { value: "left", label: "Left" },
    { value: "balanced", label: "Balanced" },
    { value: "right", label: "Right" },
  ],
  weatherPreference: [
    { value: "all", label: "All" },
    { value: "dry", label: "Dry" },
    { value: "wet", label: "Wet" },
  ],
  temperament: [
    { value: "all", label: "All" },
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ],
  constitution: [
    { value: "all", label: "All" },
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ],
};

export function getHorseTraitValue(horse: Horse, key: HorseTraitKey): string {
  switch (key) {
    case "temperament":
      return resolveTrait(horse.genotype.mental);
    case "constitution":
      return resolveTrait(horse.genotype.physical);
    case "runningStyle":
      return horse.runningStyle;
    case "fiberBias":
      return horse.fiberBias;
    case "strideType":
      return horse.strideType;
    case "trackPreference":
      return horse.trackPreference;
    case "weatherPreference":
      return horse.weatherPreference ?? "all";
    default:
      return "";
  }
}

export const ALL_HORSE_TRAIT_KEYS: HorseTraitKey[] = [
  "runningStyle",
  "fiberBias",
  "strideType",
  "trackPreference",
  "weatherPreference",
  "temperament",
  "constitution",
];

export function getAllHorseTraitValues(horse: Horse): string[] {
  return ALL_HORSE_TRAIT_KEYS.map((k) => getHorseTraitValue(horse, k));
}
