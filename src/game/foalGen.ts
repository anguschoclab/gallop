import type { Horse, Pregnancy, RunningStyle } from "./types";
import { calculateBreedingCompatibility } from "./breedingCompatibility";
import { generateHorse } from "./horseGen";
import { clamp, clampStat } from "./math";
import { createRng, hashStr, type Rng } from "./rng";

const STYLES: RunningStyle[] = ["front-runner", "stalker", "mid-pack", "closer"];

function inheritRunningStyle(
  sire: RunningStyle | undefined,
  dam: RunningStyle | undefined,
  rng: Rng
): RunningStyle {
  // 60% chance to copy a parent (50/50 sire vs dam), 40% chance the foal
  // mutates one slot toward an adjacent style or picks fresh. This keeps
  // pedigree influence visible without locking lineages into one tactic.
  const r = rng.next();
  if (r < 0.3 && sire) return sire;
  if (r < 0.6 && dam) return dam;
  return rng.pick(STYLES);
}

const TRAIT_VALUES: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };

function rollTrait(avg: number, rng: Rng): "excellent" | "good" | "fair" | "poor" {
  const roll = avg + rng.range(-1, 1);
  if (roll >= 3.5) return "excellent";
  if (roll >= 2.5) return "good";
  if (roll >= 1.5) return "fair";
  return "poor";
}

function inheritGeneticTrait(
  sireTrait: string | undefined,
  damTrait: string | undefined,
  rng: Rng
): "excellent" | "good" | "fair" | "poor" {
  const s = TRAIT_VALUES[sireTrait || "fair"] || 2;
  const d = TRAIT_VALUES[damTrait || "fair"] || 2;
  return rollTrait((s + d) / 2, rng);
}

export type FoalOutcome =
  | { kind: "live"; foal: Horse; transmission: boolean }
  | { kind: "complication"; type: "stillborn" | "unable to stand" };

// Pure (given a Pregnancy id-derived RNG) generation of one foaling outcome.
// All mutations to dam/foal are returned via the foal object; the caller is
// responsible for updating dam state and persisting.
export function resolveFoaling(
  pregnancy: Pregnancy,
  sire: Horse | undefined,
  dam: Horse | undefined
): FoalOutcome {
  const rng = createRng(hashStr(pregnancy.id) ^ (pregnancy.reBreedingAttempts ?? 0));

  // 5% complication rate — modeled outside any guarantee logic.
  if (rng.next() < 0.05) {
    return { kind: "complication", type: rng.next() < 0.5 ? "stillborn" : "unable to stand" };
  }

  // Build foal from a starter template, then overwrite with parent-derived
  // values when both parents are available.
  const foal = generateHorse({ tier: "starter", owned: true });
  foal.age = 0;
  foal.sireName = pregnancy.sireName;
  foal.damName = pregnancy.damName;

  if (sire && dam) {
    const compatibility = calculateBreedingCompatibility(sire, dam);
    const baseVariance = 8;
    const compatibilityBonus = compatibility.overallScore * 5;

    const inheritStat = (sireStat: number, damStat: number): number => {
      const base = (sireStat + damStat) / 2;
      const variance = rng.range(-baseVariance / 2, baseVariance / 2);
      return clampStat(base + variance + compatibilityBonus);
    };

    foal.stats = {
      speed: inheritStat(sire.stats.speed, dam.stats.speed),
      stamina: inheritStat(sire.stats.stamina, dam.stats.stamina),
      acceleration: inheritStat(sire.stats.acceleration, dam.stats.acceleration),
      consistency: inheritStat(sire.stats.consistency, dam.stats.consistency),
    };

    foal.potential = clampStat(
      (sire.potential + dam.potential) / 2 + rng.range(-2, 6) + compatibilityBonus
    );

    const sireConf = sire.conformation || "fair";
    const damConf = dam.conformation || "fair";
    const sireTemp = sire.temperament || "fair";
    const damTemp = dam.temperament || "fair";
    foal.conformation = rollTrait((TRAIT_VALUES[sireConf] + TRAIT_VALUES[damConf]) / 2, rng);
    foal.temperament = rollTrait((TRAIT_VALUES[sireTemp] + TRAIT_VALUES[damTemp]) / 2, rng);

    foal.runningStyle = inheritRunningStyle(sire.runningStyle, dam.runningStyle, rng);

    if (sire.geneticMarkers && dam.geneticMarkers) {
      const sg = sire.geneticMarkers;
      const dg = dam.geneticMarkers;
      foal.geneticMarkers = {
        sensoryPerception: inheritGeneticTrait(sg.sensoryPerception, dg.sensoryPerception, rng),
        signalTransduction: inheritGeneticTrait(sg.signalTransduction, dg.signalTransduction, rng),
        immunity: inheritGeneticTrait(sg.immunity, dg.immunity, rng),
        geneticDiversity: clamp(
          ((sg.geneticDiversity || 0.5) + (dg.geneticDiversity || 0.5)) / 2 + rng.range(-0.1, 0.1),
          0,
          1
        ),
      };
    }
  }

  // 1% covering-sickness transmission roll — kept outside the
  // parent-derived block since it can occur even with no genetic markers.
  const transmission = rng.next() < 0.01;
  return { kind: "live", foal, transmission };
}
