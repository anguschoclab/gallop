/**
 * Tests for deterministic phase ordering (successor to the removed
 * standalone executePipeline runner).
 *
 * Ordering guarantees are owned by two production artifacts:
 * - compileSchedule: topological sort over dependsOn, tie-broken by
 *   phase.order then registration index.
 * - SimulationExecutor.executeDay: iterates the compiled schedule in
 *   order, honoring cadence gates and skipIf.
 */
import { describe, it, expect } from "vitest";
import type { GameState } from "@/platform/game/types";
import { createPhase, type PipelinePhase } from "@/platform/time/pipeline";
import { compileSchedule, describePhase, type PhaseDescriptor } from "@/platform/time/scheduler";
import { SimulationExecutor } from "@/platform/time/executor";
import { GAME_PIPELINE_PHASES } from "@/platform/time/phases";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { makeGameState } from "@/tests/helpers/sampleGameState";

function spyDescriptor(
  id: string,
  order: number,
  seen: string[],
  meta: Partial<Omit<PhaseDescriptor, "id" | "phase">> = {},
): PhaseDescriptor {
  const phase: PipelinePhase = createPhase(id, order, (ctx) => {
    seen.push(id);
    return ctx;
  });
  return describePhase(phase, { id, label: id, cadence: "daily", ...meta });
}

describe("Phase ordering guarantees", () => {
  it("GAME_PIPELINE_PHASES is registered sorted by order", () => {
    for (let i = 0; i < GAME_PIPELINE_PHASES.length - 1; i++) {
      expect(GAME_PIPELINE_PHASES[i].order).toBeLessThan(GAME_PIPELINE_PHASES[i + 1].order);
    }
  });

  it("the compiled production schedule orders every dependency before its dependents", () => {
    const schedule = compileSchedule(GAME_PHASE_DESCRIPTORS);
    const position = new Map(schedule.phases.map((d, i) => [d.id, i]));
    for (const d of schedule.phases) {
      for (const dep of d.dependsOn ?? []) {
        expect(position.get(dep)!).toBeLessThan(position.get(d.id)!);
      }
    }
  });

  it("dependsOn overrides order: a lower-order dependent still runs after its dependency", () => {
    const seen: string[] = [];
    const dependency = spyDescriptor("dependency", 20, seen);
    const dependent = spyDescriptor("dependent", 10, seen, {
      dependsOn: ["dependency"],
    });
    const schedule = compileSchedule([dependent, dependency]);
    expect(schedule.phases.map((d) => d.id)).toEqual(["dependency", "dependent"]);
  });

  it("the executor runs descriptors in compiled order even when registered unsorted", () => {
    const seen: string[] = [];
    const executor = new SimulationExecutor([
      spyDescriptor("third", 30, seen),
      spyDescriptor("first", 10, seen),
      spyDescriptor("second", 20, seen),
    ]);
    executor.runDay(makeGameState() as GameState, 2);
    expect(seen).toEqual(["first", "second", "third"]);
  });

  it("same-order descriptors execute in registration order (stable tie-break)", () => {
    const seen: string[] = [];
    const executor = new SimulationExecutor([
      spyDescriptor("alpha", 50, seen),
      spyDescriptor("beta", 50, seen),
      spyDescriptor("gamma", 50, seen),
    ]);
    executor.runDay(makeGameState() as GameState, 2);
    expect(seen).toEqual(["alpha", "beta", "gamma"]);
  });

  it("skipIf is honored during executor iteration", () => {
    const seen: string[] = [];
    const skipped: PhaseDescriptor = describePhase(
      {
        name: "skipped",
        order: 10,
        execute: (ctx) => {
          seen.push("skipped");
          return ctx;
        },
        skipIf: () => true,
      },
      { id: "skipped", label: "skipped", cadence: "daily" },
    );
    const ran = spyDescriptor("ran", 20, seen);
    const executor = new SimulationExecutor([skipped, ran]);
    executor.runDay(makeGameState() as GameState, 2);
    expect(seen).toEqual(["ran"]);
  });
});
