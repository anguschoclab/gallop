/**
 * benchAdvance.ts - World-advance benchmark harness.
 *
 * Measures wall time and simulated-days/sec for 1/7/30/365-day advances at
 * three fixture sizes through the production SimulationExecutor, verifies
 * same-seed checksum repeatability, and reports per-run timings.
 *
 * Usage: bun run scripts/benchAdvance.ts
 *
 * Gates (from the redesign plan):
 * - zero same-seed checksum divergence (hard gate)
 * - report median/p95 per range length and fixture size
 */

import { SimulationExecutor } from "../src/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "../src/core/time/phases/descriptors";
import { buildAdvancePlan } from "../src/core/time/advancePlan";
import { checksumState } from "../src/core/time/checksum";
import { createInitialState } from "../src/game/store/initialization";
import type { GameState } from "../src/game/types";

const RANGES = [1, 7, 30, 365] as const;
const REPS = 3;

interface FixtureDef {
  name: string;
  worldSize: "small" | "medium" | "large";
}

const FIXTURES: FixtureDef[] = [
  { name: "small", worldSize: "small" },
  { name: "medium", worldSize: "medium" },
  { name: "large", worldSize: "large" },
];

function makeFixture(def: FixtureDef): GameState {
  return createInitialState({
    profile: {
      stableName: `bench-${def.name}`,
      ownerName: "Bench",
      silk: { primary: "#c8a24a", secondary: "#1c1c22", pattern: "solid" },
      backstoryId: "wealthy_dilettante",
      founded: 1,
    },
    backstory: {
      id: "wealthy_dilettante",
      label: "Bench",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "normal",
    },
    worldSize: def.worldSize,
  } as Parameters<typeof createInitialState>[0]) as GameState;
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function main() {
  const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
  console.log("fixture,range_days,reps,median_ms,p95_ms,days_per_sec,checksum");

  for (const fixture of FIXTURES) {
    const baseState = makeFixture(fixture);

    for (const days of RANGES) {
      const times: number[] = [];
      let checksum = "";
      for (let rep = 0; rep < REPS; rep++) {
        // Fresh clone per rep so each run sees identical input.
        const input = structuredClone(baseState);
        const plan = buildAdvancePlan(input, days, true);
        const t0 = performance.now();
        // checksum:false mirrors production commits (verification-only cost);
        // same-seed determinism is still verified below via checksumState.
        const outcome = executor.runRange(input, plan, { checksum: false });
        const elapsed = performance.now() - t0;
        times.push(elapsed);
        const sum = checksumState(outcome.state);
        if (rep === 0) checksum = sum;
        else if (sum !== checksum) {
          console.error(
            `CHECKSUM DIVERGENCE: ${fixture.name} ${days}d rep ${rep}: ${sum} !== ${checksum}`,
          );
          process.exit(2);
        }
      }
      times.sort((a, b) => a - b);
      const median = percentile(times, 0.5);
      const p95 = percentile(times, 0.95);
      const daysPerSec = Math.round(((days * 1000) / median) * 10) / 10;
      console.log(
        `${fixture.name},${days},${REPS},${median.toFixed(1)},${p95.toFixed(1)},${daysPerSec},${checksum}`,
      );
    }
  }
  console.log("Done. Same-seed checksum repeatability: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
