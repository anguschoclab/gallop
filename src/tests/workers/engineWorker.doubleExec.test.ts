import { describe, it, expect, vi } from "vitest";
import type { PipelineContext } from "@/core/time/pipeline";
import { createPhase } from "@/core/time/pipeline";
import { describePhase, type PhaseDescriptor } from "@/core/time/scheduler";
import { SimulationExecutor } from "@/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";

describe("Executor exactly-once semantics", () => {
  it("each due phase executes exactly once per day", () => {
    const calls = new Map<string, number>();
    const descriptors: PhaseDescriptor[] = GAME_PIPELINE_PHASES.map((phase) =>
      describePhase(
        createPhase(phase.name, phase.order, (ctx: PipelineContext) => {
          calls.set(phase.name, (calls.get(phase.name) ?? 0) + 1);
          return ctx;
        }),
        {
          label: phase.name,
          // Use cadence from production registry so skips mirror reality
          cadence: GAME_PHASE_DESCRIPTORS.find((d) => d.id === phase.name)?.cadence ?? "daily",
          lastRunField: GAME_PHASE_DESCRIPTORS.find((d) => d.id === phase.name)?.lastRunField,
        },
      ),
    );

    const executor = new SimulationExecutor(descriptors);
    const state = makeGameState({ day: 1 }) as GameState;
    executor.runDay(state, 2);

    for (const [name, count] of calls) {
      expect(count, `phase ${name} ran ${count} times`).toBe(1);
    }
    // Every phase either ran once or was cadence-skipped — never 2+.
    for (const phase of GAME_PIPELINE_PHASES) {
      expect(calls.get(phase.name) ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it("cadence-skipped phases do not run on non-boundary days", () => {
    const spy = vi.fn((ctx: PipelineContext) => ctx);
    const descriptors = [
      describePhase(
        createPhase("gate", 1, (ctx) => ctx),
        {
          label: "gate",
          cadence: "daily",
        },
      ),
      describePhase(createPhase("weeklyPhase", 2, spy), {
        label: "weekly",
        cadence: "weekly",
        lastRunField: "lastWeeklyRun",
      }),
    ];
    const executor = new SimulationExecutor(descriptors);
    // day 8: not a weekly boundary; lastWeeklyRun=7 → skipped
    const state = makeGameState({ day: 7, lastWeeklyRun: 7 } as Partial<GameState>) as GameState;
    executor.runDay(state, 8);
    expect(spy).not.toHaveBeenCalled();
  });

  it("weekly cadence runs on boundary day", () => {
    const spy = vi.fn((ctx: PipelineContext) => ctx);
    const descriptors = [
      describePhase(createPhase("weeklyPhase", 1, spy), {
        label: "weekly",
        cadence: "weekly",
        lastRunField: "lastWeeklyRun",
      }),
    ];
    const executor = new SimulationExecutor(descriptors);
    const state = makeGameState({ day: 13, lastWeeklyRun: 7 } as Partial<GameState>) as GameState;
    executor.runDay(state, 14);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("finalization sets day and clears intents/training each day", () => {
    const descriptors = [
      describePhase(
        createPhase("noop", 1, (ctx) => ctx),
        {
          label: "noop",
          cadence: "daily",
        },
      ),
    ];
    const executor = new SimulationExecutor(descriptors);
    const state = makeGameState({
      day: 5,
      pendingIntents: [{ kind: "noop" } as never],
      trainingUsed: { h1: true } as never,
    }) as GameState;
    const { state: out } = executor.runDay(state, 6);
    expect(out.day).toBe(6);
    expect(out.pendingIntents).toEqual([]);
    expect(out.trainingUsed).toEqual({});
  });
});
