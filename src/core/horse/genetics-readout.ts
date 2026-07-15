import type { Horse } from "@/core/horse/types";
import type { Locus } from "@/core/common/types";
import {
  resolveTrait,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
  resolveFoalingEase,
  resolveHeartScore,
  resolveFiberBias,
  resolveStrideType,
  resolveTrackPreference,
} from "@/core/genetics/phenotype/traits";
import {
  resolveRunningStyle,
  resolveMudAptitude,
  resolveWeatherPreference,
} from "@/core/genetics/phenotype/aptitude";
import { calculateDosageMetrics, interpretDosageIndex } from "@/core/race/dosage";
import {
  calculateFounderEffect,
  checkDirectInbreeding,
} from "@/services/breeding/inbreedingCalculator";
import { getBruceLoweRole } from "@/core/breeding/bruceLowe";

export type TraitRating = "excellent" | "good" | "fair" | "poor";

export interface HealthReadout {
  key: string;
  label: string;
  risk: "low" | "moderate" | "elevated";
}

export interface HorseGeneticsReadout {
  traits: {
    temperament: TraitRating; // genotype.mental
    constitution: TraitRating; // genotype.physical
    trainability: number; // 0.5–1.4
    peakAge: number; // 3–7
    recoveryRate: number; // 0.7–1.4
    fertility: number; // 0.7–0.99
    foalingEase: number; // 0.6–1.4 (higher = easier)
    heartScore: number; // 0.85–1.15
  };
  aptitude: {
    runningStyle: ReturnType<typeof resolveRunningStyle>;
    fiberBias: "sprinter" | "balanced" | "stayer";
    strideType: "short" | "average" | "long";
    trackPreference: "left" | "balanced" | "right";
    mudAptitude: number; // 0.85–1.15
    weatherPreference: "dry" | "wet" | "all";
  };
  health: HealthReadout[];
  dosage: { index: number; interpretation: string };
  inbreeding: { score: number; description: string; warning?: string };
  bruceLowe: { family?: number; role: string };
}

const HEALTH_LABELS: Record<string, string> = {
  bleeder: "Bleeder (EIPH)",
  roarer: "Roarer (laryngeal)",
  ocd: "OCD (joints)",
  efna5: "EFNA5",
  pssm: "PSSM (muscle)",
  rer: "RER (tying-up)",
  epm: "EPM (neuro)",
};

// Higher locus sum on a health condition = higher genetic predisposition.
function classifyHealthRisk(locus: Locus): HealthReadout["risk"] {
  const sum = locus[0] + locus[1];
  if (sum >= 8) return "elevated";
  if (sum >= 5) return "moderate";
  return "low";
}

export function deriveHorseGenetics(horse: Horse): HorseGeneticsReadout {
  const g = horse.genotype;
  const dosageMetrics = calculateDosageMetrics(horse.sireName);
  const directInbreeding = checkDirectInbreeding(
    horse.sireId,
    horse.damId,
    horse.sireName ?? "",
    horse.damName ?? "",
  );
  const founder =
    directInbreeding ??
    calculateFounderEffect(horse.sireName ?? "", horse.damName ?? "");

  return {
    traits: {
      temperament: resolveTrait(g.mental),
      constitution: resolveTrait(g.physical),
      trainability: resolveTrainability(g.trainability),
      peakAge: resolvePeakAge(g.peakAge),
      recoveryRate: resolveRecoveryRate(g.recovery),
      fertility: resolveFertility(g.fertility),
      foalingEase: resolveFoalingEase(g.foalingEase),
      heartScore: resolveHeartScore(g.heart),
    },
    aptitude: {
      runningStyle: resolveRunningStyle(g.style),
      fiberBias: resolveFiberBias(g.fiberType),
      strideType: resolveStrideType(g.stride),
      trackPreference: resolveTrackPreference(g.trackBias),
      mudAptitude: resolveMudAptitude(g.mudAptitude),
      weatherPreference: resolveWeatherPreference(g.weatherAptitude),
    },
    health: Object.entries(HEALTH_LABELS).map(([key, label]) => ({
      key,
      label,
      risk: classifyHealthRisk(g.health[key as keyof typeof g.health]),
    })),
    dosage: {
      index: dosageMetrics.dosageIndex,
      interpretation: interpretDosageIndex(dosageMetrics.dosageIndex),
    },
    inbreeding: {
      score: founder.score,
      description: founder.description,
      warning: founder.warning,
    },
    bruceLowe: {
      family: horse.bruceLoweFamily,
      role: getBruceLoweRole(horse.bruceLoweFamily),
    },
  };
}
