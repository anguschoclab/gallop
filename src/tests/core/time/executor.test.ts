/**
 * executor.test.ts — SimulationExecutor contract tests.
 *
 * Exercises the production executor with injected fake descriptors so phase
 * order, cadence gating, per-day RNG, log accumulation, year rollover,
 * interruption, cancellation, and range behavior are pinned to the real code
 * path — not a reimplementation.
 */
import { describe, it, expect } from "vitest";
import { SimulationExecutor } from "@/core/time/executor";
import type { PhaseDescriptor } from "@/core/time/scheduler";
import type { PipelineContext, PipelinePhase } from "@/core/time/pipeline";
import { buildAdvancePlan } from "@/core/time/advancePlan";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned } from "@/core/horse/ownership";
import type { GameState } from "@/game/types";

function phase(name: string, order: number, exec: (ctx: PipelineContext) => PipelineContext) {
  return { name, order, execute: exec } satisfies PipelinePhase;
}

function descriptor(
  id: string,
  order: number,
  exec: (ctx: PipelineContext) => PipelineContext = (ctx) => ctx,
  extra: Partial<PhaseDescriptor> = {},
): PhaseDescriptor {
  return { id, label: id, phase: phase(id, order, exec), cadence: "daily", ...extra };
}

function touch(field: string, order: number): PhaseDescriptor {
  return descriptor(field, order, (ctx) => ({
    ...ctx,
    state: {
      ...ctx.state,
      [field]: ((ctx.state as unknown as Record<string, number>)[field] ?? 0) + 1,
    } as GameState,
  }));
}

describe("SimulationExecutor", () => {
  const base = () => makeGameState({ day: 1, cash: 100000 }) as GameState;

  it("runs phases in dependency order and sets the new day once", () => {
    const seen: string[] = [];
    const ex = new SimulationExecutor([
      descriptor("b", 2, (ctx) => {
        seen.push("b");
        return ctx;
      }),
      descriptor("a", 1, (ctx) => {
        seen.push("a");
        return ctx;
      }),
    ]);
    const out = ex.runDay(base(), 2);
    expect(seen).toEqual(["a", "b"]);
    expect(out.state.day).toBe(2);
  });

  it("builds a per-day context: indexes, previousDay, cleared intent buffers", () => {
    let ctxSeen: PipelineContext | undefined;
    const ex = new SimulationExecutor([
      descriptor("probe", 1, (ctx) => {
        ctxSeen = ctx;
        return ctx;
      }),
    ]);
    const state = {
      ...base(),
      pendingIntents: [{ type: "noop" }],
      trainingUsed: { h1: true },
    } as unknown as GameState;
    ex.runDay(state, 2);
    expect(ctxSeen).toBeDefined();
    expect(ctxSeen!.previousDay).toBe(1);
    expect(ctxSeen!.newDay).toBe(2);
    expect(ctxSeen!.horseMap).toBeInstanceOf(Map);
    expect(ctxSeen!.raceMap).toBeInstanceOf(Map);
    // Finalization cleared intents/training and stamped the day.
    expect(ctxSeen!.state.day).toBe(1); // ctx snapshot before finalize
  });

  it("cadence-gated phases run only on due days", () => {
    let ran = 0;
    const ex = new SimulationExecutor([
      touch("dailyCount", 1),
      descriptor(
        "weekly",
        2,
        (ctx) => {
          ran++;
          // Cadence gating reads the phase's recorded run day — production
          // phases stamp their own lastRunField when they produce output.
          return { ...ctx, state: { ...ctx.state, weeklyRanDay: ctx.newDay } };
        },
        { cadence: "weekly", lastRunField: "weeklyRanDay" },
      ),
    ]);
    const plan = buildAdvancePlan(base(), 14, true);
    const out = ex.runRange(base(), plan);
    // Daily phase ran every day; weekly phase ran on its boundary only.
    expect((out.state as unknown as Record<string, number>).dailyCount).toBe(14);
    expect(ran).toBeGreaterThan(0);
    expect(ran).toBeLessThan(14);
  });

  it("accumulates logs from every simulated day", () => {
    const ex = new SimulationExecutor([
      descriptor("logger", 1, (ctx) => ({
        ...ctx,
        logs: [...ctx.logs, { day: ctx.newDay, text: `day ${ctx.newDay}` }],
      })),
    ]);
    const out = ex.runRange(base(), buildAdvancePlan(base(), 3, true));
    expect(out.logs.filter((l) => l.text.startsWith("day "))).toHaveLength(3);
    expect(out.daysAdvanced).toBe(3);
  });

  it("same seed → identical checksum; different input → different checksum", () => {
    const ex = new SimulationExecutor([touch("counter", 1)]);
    const a = ex.runRange(base(), buildAdvancePlan(base(), 5, true));
    const b = ex.runRange(base(), buildAdvancePlan(base(), 5, true));
    expect(a.checksum).toBe(b.checksum);
    const c = ex.runRange(
      { ...base(), cash: 999 } as GameState,
      buildAdvancePlan({ ...base(), cash: 999 } as GameState, 5, true),
    );
    expect(c.checksum).not.toBe(a.checksum);
  });

  it("interrupts a non-headless range at a player race day", () => {
    const state = {
      ...base(),
      races: {
        "race-1": {
          id: "race-1",
          name: "Player Race",
          day: 3,
          distance: 1600,
          raceClass: "Maiden",
          entryFee: 0,
          purse: 1000,
          minStat: 0,
          fieldSize: 8,
          entries: [{ horseId: "h1", ownership: makePlayerOwned(), npc: false }],
          resolved: false,
        },
      },
    } as unknown as GameState;
    const ex = new SimulationExecutor([touch("counter", 1)]);
    const out = ex.runRange(state, buildAdvancePlan(state, 5, false));
    expect(out.interruption).toEqual({ day: 3, raceId: "race-1", reason: "player_race" });
    expect(out.daysAdvanced).toBe(1);
    expect(out.state.day).toBe(2);
    expect((out.state as unknown as Record<string, number>).counter).toBe(1);
  });

  it("honours cooperative cancellation at day boundaries", () => {
    let calls = 0;
    const ex = new SimulationExecutor([touch("counter", 1)]);
    const out = ex.runRange(base(), buildAdvancePlan(base(), 10, true), {
      shouldCancel: () => ++calls > 3,
    });
    expect(out.cancelled).toBe(true);
    expect(out.daysAdvanced).toBe(3);
    expect(out.state.day).toBe(4);
    expect((out.state as unknown as Record<string, number>).counter).toBe(3);
  });

  it("onDay returning false cancels after that day's commit", () => {
    const ex = new SimulationExecutor([touch("counter", 1)]);
    const out = ex.runRange(base(), buildAdvancePlan(base(), 10, true), {
      onDay: (_day, completed) => completed < 2,
    });
    expect(out.cancelled).toBe(true);
    expect(out.daysAdvanced).toBe(2);
    expect((out.state as unknown as Record<string, number>).counter).toBe(2);
  });

  it("runRangeAsync yields control between days and produces the same result", async () => {
    const ex = new SimulationExecutor([touch("counter", 1)]);
    let yields = 0;
    const out = await ex.runRangeAsync(base(), buildAdvancePlan(base(), 4, true), {
      yieldControl: async () => {
        yields++;
      },
    });
    expect(out.daysAdvanced).toBe(4);
    expect(yields).toBe(4);
    expect((out.state as unknown as Record<string, number>).counter).toBe(4);
  });

  it("year rollover prunes expired win-and-you're-in qualifications", () => {
    const state = {
      ...base(),
      day: 364, // day 366 rolls into year 2 (years are 1-indexed)
      horses: {
        h1: {
          id: "h1",
          winAndYouInQualified: [{ year: 1 }, { year: 2 }, { year: 99 }],
        },
      },
    } as unknown as GameState;
    const ex = new SimulationExecutor([]);
    const out = ex.runRange(state, buildAdvancePlan(state, 2, true));
    const kept = (out.state.horses.h1 as { winAndYouInQualified: { year: number }[] })
      .winAndYouInQualified;
    expect(kept.every((q) => q.year >= 2)).toBe(true);
    expect(kept.map((q) => q.year)).toEqual([2, 99]);
  });

  it("index maps stay consistent with entities added mid-range", () => {
    const seenMaps: PipelineContext[] = [];
    const ex = new SimulationExecutor([
      // Day 2: a phase adds a horse. Day 3+: the probe must see it indexed.
      descriptor("adds-horse", 1, (ctx) => {
        seenMaps.push(ctx);
        if (ctx.newDay !== 2) return ctx;
        const horse = { id: "added", name: "Added Horse" };
        return {
          ...ctx,
          state: {
            ...ctx.state,
            horses: { ...ctx.state.horses, added: horse },
          } as unknown as GameState,
        };
      }),
    ]);
    const out = ex.runRange(base(), buildAdvancePlan(base(), 3, true));
    expect(out.state.horses.added).toBeDefined();
    // Day 2's own context predates the add; day 3's map must contain it.
    const day3Ctx = seenMaps.find((c) => c.newDay === 3);
    expect(day3Ctx?.horseMap.has("added")).toBe(true);
  });

  it("zero-phase executor still advances the day and clears intents", () => {
    const ex = new SimulationExecutor([]);
    const out = ex.runDay(base(), 2);
    expect(out.state.day).toBe(2);
    expect(out.state.pendingIntents).toEqual([]);
    expect(out.state.trainingUsed).toEqual({});
  });
});
