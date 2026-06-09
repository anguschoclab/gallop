import { describe, it, expect, vi } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
import type { Race, Stable } from "@/game/types";

describe("npcCycle error handling", () => {
  it("runNpcCycle catches general errors and returns original state", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const npcStables = [{ id: "stable-1" } as Stable];
    // Passing null for races will cause `races.filter` to throw
    const races = null as unknown as Race[];

    const result = runNpcCycle(npcStables, [], [], races, 10, {} as any);

    expect(consoleSpy).toHaveBeenCalledWith("Error in runNpcCycle:", expect.any(TypeError));
    expect(result.races).toBeNull();

    consoleSpy.mockRestore();
  });

  it("catches errors in calculateFameGainsForRaces without crashing the cycle", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const npcStables = [{ id: "stable-1", personality: "breeder" } as Stable];
    const race = {
      id: "race-1",
      day: 10,
      resolved: true,
      result: {}, // not iterable, will throw TypeError inside calculateFameGainsForRaces
    } as Race;

    const result = runNpcCycle(npcStables, [], [], [race], 10, {} as any);

    // It should have logged the error from calculateFameGainsForRaces
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error calculating fame gains for races:",
      expect.any(TypeError),
    );

    // The cycle should continue and return valid result
    expect(result.races).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("catches errors processing stable AI state without crashing", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Invalid personality will throw when trying to create AI state
    const npcStables = [
      { id: "stable-error", personality: "invalid_personality" as any } as Stable,
    ];

    const result = runNpcCycle(npcStables, [], [], [], 10, {} as any);

    // It should have logged the error for the specific stable
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error processing stable stable-error in NPC cycle:",
      expect.any(TypeError),
    );

    // The cycle should complete
    expect(result.races).toBeDefined();

    consoleSpy.mockRestore();
  });
});
