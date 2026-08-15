import { describe, it, expect } from "vitest";
import { solvencyPhase } from "@/core/time/phases/solvency";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("solvencyPhase", () => {
  it("should skip if runEnded is true", () => {
    const state = makeGameState({ runEnded: true, cash: -50000 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should not charge interest when cash is positive", () => {
    const state = makeGameState({ cash: 100000 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    const interestImpact = result.impacts.find((i) => (i as any).reason?.includes("interest"));
    expect(interestImpact).toBeUndefined();
  });

  it("should charge daily interest when in debt", () => {
    const state = makeGameState({ cash: -50000 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    const interestImpact = result.impacts.find((i) => (i as any).reason?.includes("interest"));
    expect(interestImpact).toBeDefined();
    expect((interestImpact as any).amount).toBeLessThan(0);
  });

  it("should track consecutiveDaysInDebt", () => {
    const state = makeGameState({ cash: -50000, consecutiveDaysInDebt: 3 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result.state.consecutiveDaysInDebt).toBe(4);
  });

  it("should reset consecutiveDaysInDebt when cash is positive", () => {
    const state = makeGameState({ cash: 10000, consecutiveDaysInDebt: 5 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result.state.consecutiveDaysInDebt).toBe(0);
  });

  it("should set solvencyTier on state", () => {
    const state = makeGameState({ cash: 100000 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result.state.solvencyTier).toBeDefined();
  });

  it("should populate solvencyAuditLog", () => {
    const state = makeGameState({ cash: -50000 }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result.state.solvencyAuditLog).toBeDefined();
    expect(result.state.solvencyAuditLog!.length).toBeGreaterThan(0);
  });

  it("should cap audit log at 200 entries", () => {
    const existingAudit = Array.from({ length: 200 }, (_, i) => ({
      day: i,
      tier: "warning" as const,
      cashBefore: 0,
      cashAfter: 0,
      delta: 0,
      kind: "interest" as const,
      detail: `entry ${i}`,
    }));
    const state = makeGameState({
      cash: -50000,
      solvencyAuditLog: existingAudit,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = solvencyPhase.execute(context);
    expect(result.state.solvencyAuditLog!.length).toBeLessThanOrEqual(200);
  });
});
