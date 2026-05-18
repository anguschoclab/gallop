import { describe, it, expect } from "vitest";
import { awardsPhase } from "@/core/time/phases/awards";
import { createRng } from "@/game/rng";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/state";

describe("awardsPhase", () => {
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

  it("should return unchanged context when no ceremony scheduled", () => {
    const state = createTestState();
    state.day = 10;
    
    const context = createTestContext(state, 9, 10);
    const result = awardsPhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should skip if already processed this year for region", () => {
    const state = createTestState();
    state.day = 365; // Year end
    state.lastAwardYear = {
      north_america: 1,
      europe: 1,
      asia_pacific: 1,
      south_america: 1,
    };

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.awards).toEqual([]);
  });

  it("should have correct order", () => {
    expect(awardsPhase.order).toBe(95);
  });

  it("should have correct name", () => {
    expect(awardsPhase.name).toBe("awards");
  });

  it("should preserve state when no winners determined", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 3,
    });

    const state = createTestState();
    state.day = 365;
    state.horses = [horse];

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.horses).toEqual([horse]);
    expect(result.state.awards).toEqual([]);
  });

  it("should update lastAwardYear even with no winners", () => {
    const state = createTestState();
    state.day = 365;

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.lastAwardYear?.north_america).toBe(1);
  });

  it("should preserve existing logs", () => {
    const state = createTestState();
    state.day = 10;
    
    const context = createTestContext(state, 9, 10);
    context.logs = [{ day: 9, text: "Existing log" }];

    const result = awardsPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
