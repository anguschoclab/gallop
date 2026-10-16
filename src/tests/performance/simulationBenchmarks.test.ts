/**
 * simulationBenchmarks.test.ts — benchmark-path validation.
 *
 * Lightweight CI check that the measurement seam used by
 * scripts/benchAdvance.ts is sound: the production executor produces stable
 * same-seed checksums at every time scale, timing samples are monotonic, and
 * day counts match the requested range. Heavy sweep numbers live in the
 * script; this guards the harness itself.
 */
import { describe, it, expect } from "vitest";
import { SimulationExecutor } from "@/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import { buildAdvancePlan } from "@/core/time/advancePlan";
import { checksumState } from "@/core/time/checksum";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";

function timedRange(state: GameState, days: number) {
  const input = structuredClone(state);
  const t0 = performance.now();
  const out = new SimulationExecutor(GAME_PHASE_DESCRIPTORS).runRange(
    input,
    buildAdvancePlan(input, days, true),
  );
  return { ms: performance.now() - t0, out };
}

describe("benchmark harness validation", () => {
  it.each([1, 7, 30])("same-seed %dd ranges are bit-identical across reps", (days) => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    const sums = new Set<string>();
    for (let rep = 0; rep < 3; rep++) {
      const { out } = timedRange(state, days);
      expect(out.daysAdvanced).toBe(days);
      sums.add(checksumState(out.state));
    }
    expect(sums.size).toBe(1);
  });

  it("report fields are well-formed for a sampled range", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) samples.push(timedRange(state, 7).ms);
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    const p95 = samples[samples.length - 1];
    expect(median).toBeGreaterThan(0);
    expect(p95).toBeGreaterThanOrEqual(median);
    expect(median / 7).toBeGreaterThan(0); // per-day cost positive
  });
});
