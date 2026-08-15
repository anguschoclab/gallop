import { describe, it, expect } from "vitest";
import { energyPhase } from "@/core/time/phases/energy";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("energyPhase", () => {
  it("should restore energy for horses", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 50, recoveryRate: 1.0 });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    const updatedHorse = result.state.horses["horse-1"];
    expect(updatedHorse.energy).toBeGreaterThan(50);
    expect(updatedHorse.energy).toBeLessThanOrEqual(100);
  });

  it("should cap energy at 100", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 95, recoveryRate: 1.0 });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses["horse-1"].energy).toBe(100);
  });

  it("should skip deceased horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      energy: 50,
      lifecycleStatus: "deceased",
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses["horse-1"].energy).toBe(50);
  });

  it("should recover from covering_sickness after duration", () => {
    const horse = createTestHorse({
      id: "horse-1",
      healthStatus: "covering_sickness",
      healthStatusDay: 1,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses["horse-1"].healthStatus).toBe("recovering");
  });

  it("should recover from recovering after full recovery period", () => {
    const horse = createTestHorse({
      id: "horse-1",
      healthStatus: "recovering",
      healthStatusDay: 1,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 40 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses["horse-1"].healthStatus).toBe("healthy");
  });

  it("should apply Banister fitness/fatigue decay", () => {
    const horse = createTestHorse({
      id: "horse-1",
      fitness: 80,
      fatigue: 50,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    const updated = result.state.horses["horse-1"];
    expect(updated.fitness).toBeLessThan(80);
    expect(updated.fatigue).toBeLessThan(50);
    expect(updated.peakingIndex).toBeDefined();
  });

  it("should restore recoveryPoints", () => {
    const horse = createTestHorse({ id: "horse-1", recoveryPoints: 50, recoveryRate: 1.0 });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses["horse-1"].recoveryPoints).toBeGreaterThan(50);
    expect(result.state.horses["horse-1"].recoveryPoints).toBeLessThanOrEqual(100);
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = energyPhase.execute(context);
    expect(result.state.horses).toEqual({});
  });
});
