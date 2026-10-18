import { describe, expect, it, vi } from "vitest";
import {
  createConditionTrigger,
  createDayOfYearTrigger,
  createIntervalTrigger,
  eventRegistry,
} from "@/core/time/events";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("quarantined EventRegistry", () => {
  it("executes registered triggers in descending priority and supports unregister", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 42 }) as PipelineContext;
    const calls: string[] = [];
    const low = createConditionTrigger(
      "low-test",
      () => true,
      () => calls.push("low"),
      1,
    );
    const high = createConditionTrigger(
      "high-test",
      () => true,
      () => calls.push("high"),
      99,
    );

    eventRegistry.register(low);
    eventRegistry.register(high);
    eventRegistry.executeTriggers(context);
    eventRegistry.unregister("high-test");
    eventRegistry.executeTriggers(context);
    eventRegistry.unregister("low-test");

    expect(calls).toEqual(["high", "low", "low"]);
  });

  it("implements day-of-year and interval trigger conditions deterministically", () => {
    const handler = vi.fn();
    const dayOfYear = createDayOfYearTrigger("doy-test", 1, handler);
    const interval = createIntervalTrigger("interval-test", 4, 3, handler);

    expect(dayOfYear.condition(1, {} as GameState)).toBe(true);
    expect(dayOfYear.condition(2, {} as GameState)).toBe(false);
    expect(dayOfYear.condition(366, {} as GameState)).toBe(true);
    expect(interval.condition(3, {} as GameState)).toBe(true);
    expect(interval.condition(4, {} as GameState)).toBe(false);
    expect(interval.condition(7, {} as GameState)).toBe(true);
  });
});
