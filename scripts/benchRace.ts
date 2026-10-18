/**
 * benchRace.ts - Live/headless race-session tick benchmark.
 *
 * Measures per-step physics cost (median/p95/p99), RAF-equivalent frame cost
 * at 1x/4x/max speeds, and a per-step allocation proxy for deterministic
 * 6/14/40-runner fields through the production RaceSimulationSession — the
 * same kernel the live RAF adapter and headless resolver share.
 *
 * Usage:
 *   bun run scripts/benchRace.ts           (fast pass)
 *   bun --expose-gc run scripts/benchRace.ts   (adds precise heap-per-step)
 *
 * Gates (from the redesign plan):
 * - physics step p95 < 4 ms for the 14-runner field at 1x
 * - RAF-equivalent frame cost p95 < 16.7 ms at 1x (1x ⇒ ≤1 step/frame)
 * - ≥25% lower tick p95 or allocations vs the legacy tick loop — this script
 *   emits the candidate numbers; the baseline is measured ad hoc from the
 *   pre-redesign worktree.
 */

import { RaceSimulationSession } from "@/domains/race/simulation/engine/raceSession";
import { createRng } from "@/shared/common/rng";
import { SIMULATION_MAX_STEPS_PER_FRAME } from "@/domains/race/model/raceSimulationConstants";
import { DEFAULT_DT } from "@/domains/race/model/engine/constants";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Runner } from "@/domains/race/model/engine/runnerTypes";
import { createTestJockey } from "../src/tests/helpers";
import { asJockeyId } from "@/shared/types/branded";

const STYLES = ["E", "EP", "P", "S"] as const;
const FIELD_SIZES = [6, 14, 40] as const;
const DISTANCE = 1600;
const SNAPSHOT_EVERY = 10;

function makeJockey() {
  return createTestJockey({
    id: asJockeyId("bench-jockey"),
    archetype: "clinical",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 0,
    stableAffinity: 0,
  });
}

function makeField(n: number): Runner[] {
  return Array.from(
    { length: n },
    (_, i) =>
      ({
        horseId: `bench-h${i + 1}`,
        name: `Bench ${i + 1}`,
        silk: "#fff",
        isPlayer: false,
        position: 0,
        velocity: 0,
        finishTime: null,
        lane: i + 1,
        targetLane: i + 1,
        laneVelocity: 0,
        gate: i + 1,
        topSpeed: 15 + (i % 5) * 0.35,
        accel: 1,
        staminaFactor: 1,
        noise: 0.05 + (i % 7) * 0.02,
        affinityBonus: 0,
        runningStyle: STYLES[i % STYLES.length],
        draftingHorseId: null,
        weight: 55,
        horse: {} as never,
        jockey: makeJockey() as never,
      }) as Runner,
  );
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

interface FieldReport {
  runners: number;
  steps: number;
  stepMs: { median: number; p95: number; p99: number; max: number };
  stepsPerSec: number;
  frameCostMs: { at1x: number; at4x: number; atMax: number };
  heapPerStepBytes: number | null;
}

function benchField(n: number): FieldReport {
  const times: number[] = [];
  const rng = createRng(`bench-race-${n}`);
  const session = new RaceSimulationSession(makeField(n), {
    distance: DISTANCE,
    rng,
    snapshotEveryTicks: SNAPSHOT_EVERY,
    recordPaceSnapshots: true,
    trackSplits: true,
  });

  // Warmup: JIT stabilisation over the first ~5% of the race.
  for (let i = 0; i < 50 && session.step(false); i++) {
    /* warmup */
  }

  const gc = (globalThis as { gc?: () => void }).gc;
  let heapBefore = 0;
  let heapSteps = 0;
  if (gc) {
    gc();
    heapBefore = process.memoryUsage().heapUsed;
  }

  while (true) {
    const t0 = performance.now();
    const running = session.step(false);
    times.push(performance.now() - t0);
    heapSteps++;
    if (!running) break;
  }

  let heapPerStepBytes: number | null = null;
  if (gc) {
    const heapAfter = process.memoryUsage().heapUsed;
    heapPerStepBytes = Math.round((heapAfter - heapBefore) / heapSteps);
  }

  times.sort((a, b) => a - b);
  const median = percentile(times, 0.5);
  const p95 = percentile(times, 0.95);
  // RAF frame model: at 60fps a frame budgets (16.7ms × speed)/dt seconds of
  // sim time → steps/frame = 16.7·speed/(dt·1000), capped at MAX_STEPS.
  const stepsPerFrame = (speed: number) =>
    Math.min(
      SIMULATION_MAX_STEPS_PER_FRAME,
      Math.max(1, Math.ceil((16.7 * speed) / (DEFAULT_DT * 1000))),
    );

  return {
    runners: n,
    steps: times.length + 50,
    stepMs: { median, p95, p99: percentile(times, 0.99), max: times[times.length - 1] },
    stepsPerSec: Math.round(1000 / median),
    frameCostMs: {
      at1x: p95 * stepsPerFrame(1),
      at4x: p95 * stepsPerFrame(4),
      atMax: p95 * SIMULATION_MAX_STEPS_PER_FRAME,
    },
    heapPerStepBytes,
  };
}

const reports: FieldReport[] = [];
for (const n of FIELD_SIZES) {
  reports.push(benchField(n));
}

console.log(
  "runners,steps,step_p50_ms,step_p95_ms,step_p99_ms,step_max_ms,steps_per_sec,frame_p95_1x,frame_p95_4x,frame_p95_max,heap_bytes_per_step",
);
for (const r of reports) {
  console.log(
    `${r.runners},${r.steps},${r.stepMs.median.toFixed(3)},${r.stepMs.p95.toFixed(3)},${r.stepMs.p99.toFixed(3)},${r.stepMs.max.toFixed(3)},${r.stepsPerSec},${r.frameCostMs.at1x.toFixed(3)},${r.frameCostMs.at4x.toFixed(3)},${r.frameCostMs.atMax.toFixed(3)},${r.heapPerStepBytes ?? "n/a (run with --expose-gc)"}`,
  );
}

const headline = reports.find((r) => r.runners === 14)!;
console.log(
  `\nGates (14-runner @1x): physics p95 ${headline.stepMs.p95.toFixed(3)}ms ${headline.stepMs.p95 < 4 ? "< 4ms PASS" : ">= 4ms FAIL"} | RAF-equiv p95 ${headline.frameCostMs.at1x.toFixed(3)}ms ${headline.frameCostMs.at1x < 16.7 ? "< 16.7ms PASS" : ">= 16.7ms FAIL"}`,
);

try {
  mkdirSync("bench-results", { recursive: true });
  writeFileSync(
    "bench-results/race-latest.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2),
  );
  console.log("Report written to bench-results/race-latest.json");
} catch {
  /* artifact write is best-effort */
}
