import { describe, it, expect } from "vitest";
import { GAME_PHASE_DESCRIPTORS, GAME_SCHEDULE } from "@/platform/time/phases/descriptors";
import { GAME_PIPELINE_PHASES } from "@/platform/time/phases";
import { compileSchedule } from "@/platform/time/scheduler";

describe("Compiled schedule replaces numeric stages", () => {
  it("every registered phase appears exactly once in the compiled schedule", () => {
    const names = GAME_SCHEDULE.phases.map((d) => d.phase.name);
    expect(names.length).toBe(GAME_PIPELINE_PHASES.length);
    expect(new Set(names).size).toBe(GAME_PIPELINE_PHASES.length);
  });

  it("schedule order is deterministic across compilations", () => {
    const names1 = GAME_SCHEDULE.phases.map((d) => d.id).join(",");
    // Recompile fresh to prove determinism regardless of registration order
    const names2 = compileSchedule([...GAME_PHASE_DESCRIPTORS].reverse())
      .phases.map((d) => d.id)
      .join(",");
    expect(names1).toBe(names2);
  });

  it("no phase ordering is left implicit — conflicts are resolved", () => {
    // If compile succeeded, no unorderable writer conflicts exist; spot check
    // that terminal phases run last.
    const order = GAME_SCHEDULE.phases.map((d) => d.id);
    expect(order.indexOf("impactApplication")).toBeGreaterThan(order.indexOf("raceResolution"));
    expect(order.indexOf("dailySnapshot")).toBe(order.length - 1);
  });
});
