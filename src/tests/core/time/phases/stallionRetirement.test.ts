import { describe, it, expect } from "vitest";
import { stallionRetirementPhase } from "@/core/time/phases/stallionRetirement";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";

describe("stallionRetirementPhase", () => {
  it("should skip non-NPC horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 8,
      gender: "horse",
      ownership: makePlayerOwned(),
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "stud_career")).toBeUndefined();
  });

  it("should skip mares and fillies", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 8,
      gender: "mare",
      ownership: makeNpcOwned("npc-1"),
    });
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "stud_career")).toBeUndefined();
  });

  it("should skip horses already at stud", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned("npc-1"),
      stud: {
        atStud: true,
        standingFee: 5000,
        bookSize: 40,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 1,
      } as any,
    });
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "stud_career")).toBeUndefined();
  });

  it("should skip horses younger than 4", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 3,
      gender: "horse",
      ownership: makeNpcOwned("npc-1"),
    });
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "stud_career")).toBeUndefined();
  });

  it("should retire old NPC stallions (age >= 6)", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 6,
      gender: "horse",
      ownership: makeNpcOwned("npc-1"),
      name: "Old Stallion",
    });
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    const studImpact = result.impacts.find((i) => i.type === "stud_career");
    expect(studImpact).toBeDefined();
    expect((studImpact as any).studCareer.atStud).toBe(true);
  });

  it("should emit log impact on retirement", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 6,
      gender: "horse",
      ownership: makeNpcOwned("npc-1"),
      name: "Logged Stallion",
    });
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    const logImpact = result.impacts.find(
      (i) => i.type === "log" && (i as any).text?.includes("Logged Stallion"),
    );
    expect(logImpact).toBeDefined();
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = stallionRetirementPhase.execute(context);
    expect(result.impacts).toEqual([]);
  });
});
