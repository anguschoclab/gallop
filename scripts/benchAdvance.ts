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

import { SimulationExecutor } from "@/platform/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { buildAdvancePlan } from "@/platform/time/advancePlan";
import { checksumState } from "@/platform/time/checksum";
import { createTelemetry } from "@/platform/time/telemetry";
import { createInitialState } from "@/platform/game/store/initialization";
import { SimulationEngine } from "@/platform/engine/engine";
import { EngineClient } from "@/platform/engine/client";
import { LocalTransport } from "@/platform/engine/transports";
import { mkdirSync, writeFileSync } from "node:fs";
import type { GameState } from "@/platform/game/types";

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
      silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
      backstoryId: "inheritor",
      founded: 1,
    },
    backstory: {
      id: "inheritor",
      label: "Bench",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "standard",
    },
    worldSize: def.worldSize,
  });
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function main() {
  const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
  console.log("fixture,range_days,reps,median_ms,p95_ms,days_per_sec,checksum");
  const report: Record<string, unknown>[] = [];

  for (const fixture of FIXTURES) {
    const baseState = makeFixture(fixture);

    for (const days of RANGES) {
      const times: number[] = [];
      let checksum = "";
      let telemetryReport: ReturnType<ReturnType<typeof createTelemetry>["report"]> | null = null;
      for (let rep = 0; rep < REPS; rep++) {
        // Fresh clone per rep so each run sees identical input.
        const input = structuredClone(baseState);
        const plan = buildAdvancePlan(input, days, true);
        const telemetry = createTelemetry(rep === REPS - 1);
        const t0 = performance.now();
        // checksum:false mirrors production commits (verification-only cost);
        // same-seed determinism is still verified below via checksumState.
        const outcome = executor.runRange(input, plan, {
          checksum: false,
          telemetry,
        });
        const elapsed = performance.now() - t0;
        times.push(elapsed);
        if (rep === REPS - 1) telemetryReport = telemetry.report();
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

      // Serialization share: the worker boundary clones state in and out per
      // command. Report clone+payload cost relative to advance wall time.
      const t1 = performance.now();
      const cloneIn = structuredClone(baseState);
      const cloneMs = performance.now() - t1;
      const payloadBytes = JSON.stringify(baseState).length;
      const serialShare = median > 0 ? (cloneMs * 2) / median : 0;

      if (telemetryReport?.enabled) {
        const top = telemetryReport.spans.filter((s) => s.label !== "day").slice(0, 5);
        const shares = top
          .map((s) => `${s.label}:${((s.ms / telemetryReport!.totalMs) * 100).toFixed(1)}%`)
          .join(" ");
        console.log(
          `  phases: ${shares} | serial ${(serialShare * 100).toFixed(2)}% (${payloadBytes}B)`,
        );
      }
      report.push({
        fixture: fixture.name,
        days,
        medianMs: median,
        p95Ms: p95,
        daysPerSec,
        checksum,
        serialSharePct: serialShare * 100,
        payloadBytes,
        topPhases: telemetryReport?.spans.slice(0, 8),
      });
    }
  }
  console.log("Done. Same-seed checksum repeatability: PASS");

  // Command-transport measurement: with a retained engine world, only the
  // loadWorld/resync command carries state — steady-state advance commands
  // are ~100B envelopes. Measure clone cost both ways through the real
  // client→transport→engine path (small fixture, 1-day commands).
  {
    const world = makeFixture(FIXTURES[0]);
    const engine = new SimulationEngine();
    const client = new EngineClient(new LocalTransport(engine));

    const statefulCmd = {
      kind: "loadWorld" as const,
      commandId: "bench-load",
      baseRevision: 0,
      state: world,
    };
    const t0 = performance.now();
    structuredClone(statefulCmd);
    const statefulCloneMs = performance.now() - t0;
    const statefulBytes = JSON.stringify(statefulCmd).length;

    await client.submit({ kind: "loadWorld", state: world });
    const advanceTimes: number[] = [];
    let steadyBytes = 0;
    for (let i = 0; i < 3; i++) {
      const statelessCmd = {
        kind: "advance" as const,
        commandId: `bench-${i}`,
        baseRevision: i + 1,
        days: 1,
        headless: true,
      };
      steadyBytes = JSON.stringify(statelessCmd).length;
      const t1 = performance.now();
      structuredClone(statelessCmd);
      const cloneMs = performance.now() - t1;
      const t2 = performance.now();
      await client.submit({ days: 1, headless: true });
      advanceTimes.push(performance.now() - t2 - cloneMs);
    }
    advanceTimes.sort((a, b) => a - b);
    const advanceMedian = percentile(advanceTimes, 0.5);
    const statefulShare = advanceMedian > 0 ? (statefulCloneMs * 2) / advanceMedian : 0;
    console.log(
      `Command transport (small/1d): stateful ${statefulBytes}B clone ${statefulCloneMs.toFixed(1)}ms → ` +
        `steady-state ${steadyBytes}B (~0ms) | advance median ${advanceMedian.toFixed(1)}ms | ` +
        `old-model serial share ${(statefulShare * 100).toFixed(1)}% → retained ~0%`,
    );
    report.push({
      commandTransport: {
        statefulBytes,
        statefulCloneMs,
        steadyBytes,
        advanceMedianMs: advanceMedian,
      },
    });
  }

  // Retained-heap check: repeated identical 30-day advances must not grow
  // retained heap beyond noise. Requires --expose-gc for precision.
  const gc = (globalThis as { gc?: () => void }).gc;
  if (gc) {
    const small = makeFixture(FIXTURES[0]);
    const heaps: number[] = [];
    for (let i = 0; i < 3; i++) {
      const input = structuredClone(small);
      executor.runRange(input, buildAdvancePlan(input, 30, true), { checksum: false });
      gc();
      heaps.push(process.memoryUsage().heapUsed);
    }
    const growthMb = (heaps[2] - heaps[0]) / 1e6;
    console.log(
      `Retained heap over 3× 30-day advances: ${heaps.map((h) => (h / 1e6).toFixed(1)).join(" → ")}MB (Δ ${growthMb.toFixed(1)}MB)`,
    );
    report.push({ heapGrowth: { heaps, growthMb } });
  } else {
    console.log("Heap check skipped (run with --expose-gc for retained-heap gate)");
  }

  try {
    mkdirSync("bench-results", { recursive: true });
    writeFileSync(
      "bench-results/advance-latest.json",
      JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2),
    );
    console.log("Report written to bench-results/advance-latest.json");
  } catch {
    /* artifact write is best-effort */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
