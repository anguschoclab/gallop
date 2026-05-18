import { describe, it, expect } from "vitest";
import { agingPhase } from "@/core/time/phases/aging";
import { createRng } from "@/game/rng";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/state";

describe("agingPhase", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
  });

  const createTestContext = (state: GameState, previousDay = 0, newDay = 1): PipelineContext => ({
    previousDay,
    newDay,
    state,
    logs: [],
    intents: [],
    impacts: [],
    impactLog: [],
    dailyRng: createRng(1),
  });

  it("should not age horses when not a universal birthday", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 2,
      hemisphere: "Northern",
    });
    
    const state = createTestState();
    state.day = 10;
    state.horses = [horse];

    const context = createTestContext(state, 9, 10);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(2); // No change
  });

  it("should age Northern hemisphere horses on Jan 1 (day 1)", () => {
    const h1 = createTestHorse({
      id: "horse-1",
      age: 2,
      hemisphere: "Northern",
      gender: "colt",
    });
    const h2 = createTestHorse({
      id: "horse-2",
      age: 3,
      hemisphere: "Southern",
      gender: "filly",
    });
    
    const state = createTestState();
    state.day = 1;
    state.horses = [h1, h2];

    const context = createTestContext(state, 0, 1);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3); // Northern horse aged
    expect(result.state.horses[1].age).toBe(3); // Southern horse not aged
  });

  it("should age Southern hemisphere horses on Aug 1 (day 213)", () => {
    const h1 = createTestHorse({
      id: "horse-1",
      age: 2,
      hemisphere: "Northern",
    });
    const h2 = createTestHorse({
      id: "horse-2",
      age: 3,
      hemisphere: "Southern",
    });
    
    const state = createTestState();
    state.day = 213;
    state.horses = [h1, h2];

    const context = createTestContext(state, 212, 213);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(2); // Northern horse not aged
    expect(result.state.horses[1].age).toBe(4); // Southern horse aged
  });

  it("should convert colt to horse at age 3", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 2,
      gender: "colt",
      hemisphere: "Northern",
    });
    
    const state = createTestState();
    state.day = 1;
    state.horses = [horse];

    const context = createTestContext(state, 0, 1);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3);
    expect(result.state.horses[0].gender).toBe("horse");
  });

  it("should convert filly to mare at age 3", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 2,
      gender: "filly",
      hemisphere: "Northern",
    });
    
    const state = createTestState();
    state.day = 1;
    state.horses = [horse];

    const context = createTestContext(state, 0, 1);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(3);
    expect(result.state.horses[0].gender).toBe("mare");
  });

  it("should not change gender if already horse/mare", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 4,
      gender: "horse",
      hemisphere: "Northern",
    });
    
    const state = createTestState();
    state.day = 1;
    state.horses = [horse];

    const context = createTestContext(state, 0, 1);
    const result = agingPhase.execute(context);
    expect(result.state.horses[0].age).toBe(5);
    expect(result.state.horses[0].gender).toBe("horse");
  });

  it("should preserve other context properties", () => {
    const state = createTestState();
    state.day = 10;
    
    const context = createTestContext(state, 9, 10);
    context.logs = [{ day: 9, text: "Existing log" }];

    const result = agingPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
    expect(result.state.cash).toBe(10000);
  });
});
