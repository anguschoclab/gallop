import { describe, it, expect } from "vitest";
import { cashPressureHistoryPhase } from "@/core/time/phases/cashPressureHistoryPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { CashPressureHistory } from "@/core/stable/cashPressureHistory";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

function mkContext(overrides: Partial<GameState> = {}, newDay = 10): PipelineContext {
  const state = makeGameState(overrides) as GameState;
  return makePipelineContext({ state, newDay }) as PipelineContext;
}

describe("cashPressureHistoryPhase", () => {
  it("appends one snapshot per NPC stable per day", () => {
    const stable1 = createTestStable({ id: "s1", cash: 100000, horses });
    const stable2 = createTestStable({ id: "s2", cash: 50000, horses });
    const ctx = mkContext({ npcStables: [stable1, stable2] }, 10);

    const result = cashPressureHistoryPhase.execute(ctx);
    const history = result.state.cashPressureHistory as CashPressureHistory;
    expect(history).toBeDefined();
    expect(history.s1).toHaveLength(1);
    expect(history.s2).toHaveLength(1);
    expect(history.s1[0].day).toBe(10);
    expect(history.s1[0]).toHaveProperty("pressure");
    expect(history.s1[0]).toHaveProperty("meter");
    expect(history.s1[0]).toHaveProperty("runwayDays");
    expect(history.s1[0]).toHaveProperty("label");
  });

  it("appends a second snapshot on the next day", () => {
    const stable = createTestStable({ id: "s1", cash: 100000, horses });
    const existing: CashPressureHistory = {
      s1: [{ day: 9, pressure: 0.5, meter: 50, runwayDays: 100, label: "strained" }],
    };
    const ctx = mkContext({ npcStables: [stable], cashPressureHistory: existing }, 10);

    const result = cashPressureHistoryPhase.execute(ctx);
    const history = result.state.cashPressureHistory as CashPressureHistory;
    expect(history.s1).toHaveLength(2);
    expect(history.s1[0].day).toBe(9);
    expect(history.s1[1].day).toBe(10);
  });

  it("lazily initializes cashPressureHistory when undefined", () => {
    const stable = createTestStable({ id: "s1", cash: 100000, horses });
    const ctx = mkContext({ npcStables: [stable] }, 10);
    expect((ctx.state as GameState).cashPressureHistory).toBeUndefined();

    const result = cashPressureHistoryPhase.execute(ctx);
    expect(result.state.cashPressureHistory).toBeDefined();
    expect((result.state.cashPressureHistory as CashPressureHistory).s1).toHaveLength(1);
  });

  it("prunes dissolved stables from history", () => {
    const stable = createTestStable({ id: "s1", cash: 100000, horses });
    const existing: CashPressureHistory = {
      s1: [{ day: 9, pressure: 0.5, meter: 50, runwayDays: 100, label: "strained" }],
      s_dead: [{ day: 9, pressure: 0.9, meter: 90, runwayDays: 10, label: "desperate" }],
    };
    const ctx = mkContext({ npcStables: [stable], cashPressureHistory: existing }, 10);

    const result = cashPressureHistoryPhase.execute(ctx);
    const history = result.state.cashPressureHistory as CashPressureHistory;
    expect(history.s1).toBeDefined();
    expect(history.s_dead).toBeUndefined();
  });

  it("has order 201", () => {
    expect(cashPressureHistoryPhase.order).toBe(201);
  });

  it("has name cashPressureHistory", () => {
    expect(cashPressureHistoryPhase.name).toBe("cashPressureHistory");
  });
});
