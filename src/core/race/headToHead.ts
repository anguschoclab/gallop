import type { Horse, Race } from "@/game/types";
import { calculateWinProbability } from "@/core/odds/oddsTypes";
import { computeDistanceScaling, buildRunner } from "@/core/race/engine/runnerBuilder";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { calculateProjectedBeyer } from "@/core/race/beyerProjections";
import { generateHorse } from "@/core/horse/horseFactory";
import { createRng } from "@/core/common/rng";

export interface HeadToHeadResult {
  horseId: string;
  winPct: number;
  projectedBeyer: number;
  projectedFinishTime: number;
}

export interface MonteCarloResult {
  horseId: string;
  winPct: number;
  avgFinishPosition: number;
  avgFinishTime: number;
  beyerRange: [number, number];
  finishTimeRange: [number, number];
}

export function calculateHeadToHeadOdds(
  horses: Horse[],
  distance: number,
  surface: "Turf" | "Dirt" | "Synthetic",
): HeadToHeadResult[] {
  const syntheticRace = {
    distance,
    raceClass: "Allowance",
    graded: { surface, grade: undefined },
  } as unknown as Race;

  const rawProbs = horses.map((h) => {
    const baseProb = calculateWinProbability(
      h.stats.speed,
      h.stats.stamina,
      h.stats.acceleration,
      h.form ?? 50,
      0,
    );
    const surfaceMod = h.surfaceAptitude?.[surface] ?? 0.95;
    const { distanceMod } = computeDistanceScaling(h.distanceAptitude, distance);
    return baseProb * surfaceMod * distanceMod;
  });

  const total = rawProbs.reduce((s, p) => s + p, 0) || 1;

  return horses.map((h, i) => {
    const projectedBeyer = Math.max(
      30,
      Math.min(125, calculateProjectedBeyer(h, syntheticRace, {})),
    );
    const avgSpeed = (h.stats.speed + h.stats.acceleration) / 2;
    const projectedFinishTime = distance / (avgSpeed * 0.16 + 8);
    return {
      horseId: h.id,
      winPct: rawProbs[i] / total,
      projectedBeyer,
      projectedFinishTime,
    };
  });
}

export function runHeadToHeadSimulation(
  horses: Horse[],
  distance: number,
  surface: "Turf" | "Dirt" | "Synthetic",
  iterations: number = 50,
  seed?: number,
): MonteCarloResult[] {
  const baseSeed = seed ?? Date.now();
  const selectedIds = new Set(horses.map((h) => h.id));

  const stats = new Map<
    string,
    {
      wins: number;
      positions: number[];
      times: number[];
      beyers: number[];
    }
  >();

  for (const h of horses) {
    stats.set(h.id, { wins: 0, positions: [], times: [], beyers: [] });
  }

  for (let iter = 0; iter < iterations; iter++) {
    const rng = createRng(baseSeed + iter);
    const runners = horses.map((h, i) =>
      buildRunner(
        h,
        h.owned ?? false,
        distance,
        surface,
        { speedMul: 1, staminaDrainMul: 1 },
        i + 1,
      ),
    );
    while (runners.length < 8) {
      const filler = generateHorse({ tier: "mid", owned: false }, rng);
      runners.push(
        buildRunner(
          filler,
          false,
          distance,
          surface,
          { speedMul: 1, staminaDrainMul: 1 },
          runners.length + 1,
        ),
      );
    }

    const { result } = runRaceToCompletion(runners, distance, rng, 0.1, 600);

    for (const r of result) {
      if (!selectedIds.has(r.horseId)) continue;
      const s = stats.get(r.horseId)!;
      if (r.position === 1) s.wins++;
      s.positions.push(r.position);
      s.times.push(r.time);
      const beyer = Math.max(30, Math.min(125, Math.round(100 - r.time / 10)));
      s.beyers.push(beyer);
    }
  }

  return horses.map((h) => {
    const s = stats.get(h.id)!;
    const avgPos =
      s.positions.length > 0 ? s.positions.reduce((a, b) => a + b, 0) / s.positions.length : 0;
    const avgTime = s.times.length > 0 ? s.times.reduce((a, b) => a + b, 0) / s.times.length : 0;
    const minBeyer = s.beyers.length > 0 ? Math.min(...s.beyers) : 0;
    const maxBeyer = s.beyers.length > 0 ? Math.max(...s.beyers) : 0;
    const minTime = s.times.length > 0 ? Math.min(...s.times) : 0;
    const maxTime = s.times.length > 0 ? Math.max(...s.times) : 0;
    return {
      horseId: h.id,
      winPct: s.wins / iterations,
      avgFinishPosition: avgPos,
      avgFinishTime: avgTime,
      beyerRange: [minBeyer, maxBeyer] as [number, number],
      finishTimeRange: [minTime, maxTime] as [number, number],
    };
  });
}
