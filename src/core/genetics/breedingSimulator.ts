/**
 * breedingSimulator.ts - Breeding simulation and prediction
 *
 * This file provides Monte Carlo simulation for breeding prediction, running
 * multiple iterations to estimate offspring phenotype distribution, health risks,
 * and genetic compatibility.
 *
 * Dependencies: @/game/types (Horse, GameState), @/core/common/types (Rng), @/game/rng (createRng), ./inheritance (inheritDNA), ./phenotype (resolveStats, resolveFiberBias, resolveStrideType, resolveRunningStyle, resolveTrainability, resolvePeakAge, resolveRecoveryRate, resolveBleederRisk, resolveRoarerRisk, resolvePssmRisk, resolveRerRisk, resolveEpmRisk, resolveCoatColor), @/core/horse/types (RunningStyle, CoatColor), @/core/breeding/populationGenetics (computeCoiFromSnapshot), @/game/breedingCompatibility (calculateGeneticCompatibility)
 * Related files: inheritance.ts (provides DNA inheritance), phenotype.ts (provides phenotype resolution)
 */

import type { Horse } from "@/game/types";
import type { GameState } from "@/game/types";
import type { Rng } from "@/core/common/types";
import { createRng } from "@/game/rng";
import { inheritDNA } from "./inheritance";
import {
  resolveStats,
  resolveFiberBias,
  resolveStrideType,
  resolveRunningStyle,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveBleederRisk,
  resolveRoarerRisk,
  resolvePssmRisk,
  resolveRerRisk,
  resolveEpmRisk,
  resolveCoatColor,
} from "./phenotype";
import type { RunningStyle, CoatColor } from "@/core/horse/types";
import { computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import { calculateGeneticCompatibility } from "@/game/breedingCompatibility";

export type SimulationResult = {
  stats: {
    speed: { p10: number; p25: number; p75: number; p90: number };
    stamina: { p10: number; p25: number; p75: number; p90: number };
    acceleration: { p10: number; p25: number; p75: number; p90: number };
    consistency: { p10: number; p25: number; p75: number; p90: number };
  };
  traits: {
    fiberBias: Record<"sprinter" | "balanced" | "stayer", number>;
    strideType: Record<"short" | "average" | "long", number>;
    runningStyle: Record<RunningStyle, number>;
    trainability: { mean: number; tier: Record<"excellent" | "good" | "fair" | "poor", number> };
    distanceAptitude: { mean: number; range: [number, number] };
    surfaceAptitude: { likelyTurf: number; likelyDirt: number; versatile: number };
  };
  health: {
    bleederRisk: number;
    roarerRisk: number;
    pssmRisk: number;
    rerRisk: number;
    epmRisk: number;
    lethalRisk: { csnb: number; hypp: number; olws: number; ffs1: number };
  };
  coatColors: Record<CoatColor, number>;
  coiEstimate: number;
  compatScore: number;
};

const SIMULATION_ITERATIONS = 250;

/**
 * Calculate percentile from sorted array.
 *
 * @param sorted - Sorted array of numbers
 * @param p - Percentile (0-100)
 * @returns Value at percentile
 */
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

/**
 * Calculate mean of array.
 *
 * @param arr - Array of numbers
 * @returns Mean value
 */
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate range of array.
 *
 * @param arr - Array of numbers
 * @returns Min and max values
 */
function range(arr: number[]): [number, number] {
  return [Math.min(...arr), Math.max(...arr)];
}

/**
 * Run breeding simulation.
 *
 * Runs Monte Carlo simulation (250 iterations) to predict offspring phenotype
 * distribution including stats, traits, health risks, coat colors, COI estimate,
 * and genetic compatibility score.
 *
 * @param sire - Sire horse
 * @param dam - Dam horse
 * @param state - Game state (for COI calculation)
 * @param rng - Random number generator
 * @returns Simulation result with phenotype distribution
 *
 * @example
 * const result = runBreedingSimulation(sire, dam, gameState, rng);
 */
export function runBreedingSimulation(
  sire: Horse,
  dam: Horse,
  state: GameState,
  rng: Rng,
): SimulationResult {
  const speedValues: number[] = [];
  const staminaValues: number[] = [];
  const accelerationValues: number[] = [];
  const consistencyValues: number[] = [];

  const fiberBiasValues: ("sprinter" | "balanced" | "stayer")[] = [];
  const strideTypeValues: ("short" | "average" | "long")[] = [];
  const runningStyleValues: RunningStyle[] = [];
  const trainabilityValues: number[] = [];
  const distanceAptitudeValues: number[] = [];
  const surfaceAptitudeValues: { Turf: number; Dirt: number; Synthetic: number }[] = [];

  const bleederRiskValues: number[] = [];
  const roarerRiskValues: number[] = [];
  const pssmRiskValues: number[] = [];
  const rerRiskValues: number[] = [];
  const epmRiskValues: number[] = [];
  const lethalCarrierValues: { csnb: boolean; hypp: boolean; olws: boolean; ffs1: boolean }[] = [];

  const coatColorValues: CoatColor[] = [];

  // Draw a base seed from the passed RNG and create a single generator for the simulation
  const seed = Math.floor(rng.next() * 2 ** 31);
  const simulationRng = createRng(seed);

  // Run 250 simulations
  for (let i = 0; i < SIMULATION_ITERATIONS; i++) {
    // Inherit DNA using the single simulationRng sequence
    const offspringGenotype = inheritDNA(sire.genotype, dam.genotype, simulationRng);

    // Resolve to phenotype
    const stats = resolveStats(offspringGenotype.stats);
    speedValues.push(stats.speed);
    staminaValues.push(stats.stamina);
    accelerationValues.push(stats.acceleration);
    consistencyValues.push(stats.consistency);

    const fiberBias = resolveFiberBias(offspringGenotype.fiberType);
    fiberBiasValues.push(fiberBias);

    const strideType = resolveStrideType(offspringGenotype.stride);
    strideTypeValues.push(strideType);

    const runningStyle = resolveRunningStyle(offspringGenotype.style);
    runningStyleValues.push(runningStyle);

    const trainability = resolveTrainability(offspringGenotype.trainability);
    trainabilityValues.push(trainability);

    // Distance aptitude (from preferences.distance)
    const distanceSum =
      offspringGenotype.preferences.distance[0] + offspringGenotype.preferences.distance[1];
    const distanceAptitude = 800 + distanceSum * 120;
    distanceAptitudeValues.push(distanceAptitude);

    // Surface aptitude
    const surfaceSum =
      offspringGenotype.preferences.surface[0] + offspringGenotype.preferences.surface[1];
    let surfaceAptitude: { Turf: number; Dirt: number; Synthetic: number };
    if (surfaceSum <= 4) {
      surfaceAptitude = { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 };
    } else if (surfaceSum >= 8) {
      surfaceAptitude = { Turf: 0.9, Dirt: 1.0, Synthetic: 0.95 };
    } else {
      surfaceAptitude = { Turf: 0.98, Dirt: 0.98, Synthetic: 1.0 };
    }
    surfaceAptitudeValues.push(surfaceAptitude);

    // Health risks
    const bleederRisk = resolveBleederRisk(offspringGenotype.health.bleeder);
    bleederRiskValues.push(bleederRisk);

    const roarerRisk = resolveRoarerRisk(offspringGenotype.health.roarer);
    roarerRiskValues.push(roarerRisk);

    const pssmRisk = resolvePssmRisk(offspringGenotype.health.pssm);
    pssmRiskValues.push(pssmRisk);

    const rerRisk = resolveRerRisk(offspringGenotype.health.rer);
    rerRiskValues.push(rerRisk);

    const epmRisk = resolveEpmRisk(offspringGenotype.health.epm);
    epmRiskValues.push(epmRisk);

    lethalCarrierValues.push({
      csnb: offspringGenotype.markers.lethalCarriers.csnb,
      hypp: offspringGenotype.markers.lethalCarriers.hypp,
      olws: offspringGenotype.markers.lethalCarriers.olws,
      ffs1: offspringGenotype.markers.lethalCarriers.ffs1,
    });

    // Coat color
    const coatColor = resolveCoatColor(offspringGenotype.color);
    coatColorValues.push(coatColor);
  }

  // Sort for percentile calculation
  speedValues.sort((a, b) => a - b);
  staminaValues.sort((a, b) => a - b);
  accelerationValues.sort((a, b) => a - b);
  consistencyValues.sort((a, b) => a - b);
  trainabilityValues.sort((a, b) => a - b);
  distanceAptitudeValues.sort((a, b) => a - b);
  bleederRiskValues.sort((a, b) => a - b);
  roarerRiskValues.sort((a, b) => a - b);
  pssmRiskValues.sort((a, b) => a - b);
  rerRiskValues.sort((a, b) => a - b);
  epmRiskValues.sort((a, b) => a - b);

  // Calculate percentiles
  const result: SimulationResult = {
    stats: {
      speed: {
        p10: percentile(speedValues, 10),
        p25: percentile(speedValues, 25),
        p75: percentile(speedValues, 75),
        p90: percentile(speedValues, 90),
      },
      stamina: {
        p10: percentile(staminaValues, 10),
        p25: percentile(staminaValues, 25),
        p75: percentile(staminaValues, 75),
        p90: percentile(staminaValues, 90),
      },
      acceleration: {
        p10: percentile(accelerationValues, 10),
        p25: percentile(accelerationValues, 25),
        p75: percentile(accelerationValues, 75),
        p90: percentile(accelerationValues, 90),
      },
      consistency: {
        p10: percentile(consistencyValues, 10),
        p25: percentile(consistencyValues, 25),
        p75: percentile(consistencyValues, 75),
        p90: percentile(consistencyValues, 90),
      },
    },
    traits: {
      fiberBias: {
        sprinter: fiberBiasValues.filter((v) => v === "sprinter").length / SIMULATION_ITERATIONS,
        balanced: fiberBiasValues.filter((v) => v === "balanced").length / SIMULATION_ITERATIONS,
        stayer: fiberBiasValues.filter((v) => v === "stayer").length / SIMULATION_ITERATIONS,
      },
      strideType: {
        short: strideTypeValues.filter((v) => v === "short").length / SIMULATION_ITERATIONS,
        average: strideTypeValues.filter((v) => v === "average").length / SIMULATION_ITERATIONS,
        long: strideTypeValues.filter((v) => v === "long").length / SIMULATION_ITERATIONS,
      },
      runningStyle: {
        E: runningStyleValues.filter((v) => v === "E").length / SIMULATION_ITERATIONS,
        EP: runningStyleValues.filter((v) => v === "EP").length / SIMULATION_ITERATIONS,
        P: runningStyleValues.filter((v) => v === "P").length / SIMULATION_ITERATIONS,
        S: runningStyleValues.filter((v) => v === "S").length / SIMULATION_ITERATIONS,
      },

      trainability: {
        mean: mean(trainabilityValues),
        tier: {
          excellent: trainabilityValues.filter((v) => v >= 0.85).length / SIMULATION_ITERATIONS,
          good:
            trainabilityValues.filter((v) => v >= 0.65 && v < 0.85).length / SIMULATION_ITERATIONS,
          fair:
            trainabilityValues.filter((v) => v >= 0.45 && v < 0.65).length / SIMULATION_ITERATIONS,
          poor: trainabilityValues.filter((v) => v < 0.45).length / SIMULATION_ITERATIONS,
        },
      },
      distanceAptitude: {
        mean: mean(distanceAptitudeValues),
        range: range(distanceAptitudeValues),
      },
      surfaceAptitude: {
        likelyTurf:
          surfaceAptitudeValues.filter((v) => v.Turf > 0.95).length / SIMULATION_ITERATIONS,
        likelyDirt:
          surfaceAptitudeValues.filter((v) => v.Dirt > 0.95).length / SIMULATION_ITERATIONS,
        versatile:
          surfaceAptitudeValues.filter((v) => Math.abs(v.Turf - v.Dirt) < 0.05).length /
          SIMULATION_ITERATIONS,
      },
    },
    health: {
      bleederRisk: mean(bleederRiskValues),
      roarerRisk: mean(roarerRiskValues),
      pssmRisk: mean(pssmRiskValues),
      rerRisk: mean(rerRiskValues),
      epmRisk: mean(epmRiskValues),
      lethalRisk: {
        csnb: lethalCarrierValues.filter((v) => v.csnb).length / SIMULATION_ITERATIONS,
        hypp: lethalCarrierValues.filter((v) => v.hypp).length / SIMULATION_ITERATIONS,
        olws: lethalCarrierValues.filter((v) => v.olws).length / SIMULATION_ITERATIONS,
        ffs1: lethalCarrierValues.filter((v) => v.ffs1).length / SIMULATION_ITERATIONS,
      },
    },
    coatColors: coatColorValues.reduce(
      (acc, color) => {
        acc[color] = (acc[color] || 0) + 1 / SIMULATION_ITERATIONS;
        return acc;
      },
      {} as Record<CoatColor, number>,
    ),
    coiEstimate: computeProspectiveCoi(sire, dam),
    compatScore: calculateGeneticCompatibility(sire, dam).score,
  };

  return result;
}
