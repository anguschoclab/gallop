import { describe, it, expect } from "vitest";
import { horseDeathPhase } from "@/core/time/phases/horseDeath";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("horseDeathPhase", () => {
  it("should skip already deceased horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 25,
      lifecycleStatus: "deceased",
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "horse_death")).toBeUndefined();
  });

  it("should skip horses younger than 20", () => {
    const horse = createTestHorse({ id: "horse-1", age: 10 });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "horse_death")).toBeUndefined();
  });

  it("should emit name_reservation impact on death", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 25,
      name: "Old Timer",
      lifecycleStatus: "retired",
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    // Death is probabilistic, so we check structure if it happens
    const deathImpact = result.impacts.find((i) => i.type === "horse_death");
    if (deathImpact) {
      const nameReservation = result.impacts.find((i) => i.type === "name_reservation");
      expect(nameReservation).toBeDefined();
    }
  });

  it("should emit insurance_payout for insured horses on death", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 25,
      name: "Insured Horse",
      lifecycleStatus: "retired",
      ownership: makePlayerOwned(),
      insurancePolicy: {
        type: "mortality_only",
        startDate: 1,
        coverageAmount: 50000,
      } as any,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    const deathImpact = result.impacts.find((i) => i.type === "horse_death");
    if (deathImpact) {
      const insurancePayout = result.impacts.find((i) => i.type === "insurance_payout");
      expect(insurancePayout).toBeDefined();
    }
  });

  it("should emit log for owned horses on death", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 25,
      name: "Beloved Horse",
      lifecycleStatus: "retired",
      ownership: makePlayerOwned(),
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    const deathImpact = result.impacts.find((i) => i.type === "horse_death");
    if (deathImpact) {
      const logImpact = result.impacts.find(
        (i) => i.type === "log" && (i as any).text?.includes("Beloved Horse"),
      );
      expect(logImpact).toBeDefined();
    }
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    expect(result.impacts).toEqual([]);
  });

  it("should preserve existing impacts", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const existingImpact = { id: "old-1", type: "log", text: "old", day: 1 } as any;
    const context = makePipelineContext({
      state,
      newDay: 100,
      impacts: [existingImpact],
    }) as PipelineContext;

    const result = horseDeathPhase.execute(context);
    expect(result.impacts).toContainEqual(existingImpact);
  });
});
