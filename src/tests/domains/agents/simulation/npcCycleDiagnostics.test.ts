import { describe, expect, it, vi } from "vitest";
import { runNpcCycle } from "@/domains/agents/simulation/npc/npcCycle";
import { createTestRng, createTestStable } from "@/tests/helpers";

describe("runNpcCycle diagnostics", () => {
  it("returns a structured diagnostic for a stable failure and continues other stables", () => {
    const badStable = createTestStable({ id: "bad-stable" });
    Object.defineProperty(badStable, "personality", {
      get() {
        throw new Error("personality unavailable");
      },
    });
    const goodStable = createTestStable({ id: "good-stable" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = runNpcCycle(
      [badStable, goodStable],
      [],
      [],
      [],
      10,
      createTestRng("npc-cycle-stable-failure"),
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        stableId: "bad-stable",
        day: 10,
        phase: "npc_cycle",
        message: expect.stringContaining("personality unavailable"),
      }),
    ]);
    expect(result.aiManager.stableStates["good-stable"]).toBeDefined();
    consoleError.mockRestore();
  });

  it("returns a structured diagnostic instead of logging when the whole cycle fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenManager = {
      globalDay: 10,
      regionalKings: {},
      get stableStates(): Record<string, never> {
        throw new Error("AI manager unavailable");
      },
    };
    const result = runNpcCycle(
      [createTestStable({ id: "stable-1" })],
      [],
      [],
      [],
      10,
      createTestRng("npc-cycle-failure"),
      3,
      new Set(),
      brokenManager,
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        day: 10,
        phase: "npc_cycle",
        message: expect.any(String),
      }),
    ]);
    consoleError.mockRestore();
  });
});
