import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import type { GameState, Stable } from "@/game/types";
import { createTestStable } from "@/tests/helpers/createTestStable";

// Define a mock instance variable to control throw behavior
let shouldThrowForStable1 = false;

// Mock the AI module so we can control when it throws
vi.mock("@/core/ai/npcCycleAI", () => ({
  getOrCreateStableAIState: vi.fn((manager: any, stable: Stable, day: number) => {
    if (stable.id === "stable1" && shouldThrowForStable1) {
      throw new Error("Simulated AI error for stable 1");
    }
    return { id: stable.id }; // Return a dummy AI state
  }),
  updateStableAIState: vi.fn((state: any) => ({ ...state, updated: true })),
}));

describe("generateNpcIntents error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrowForStable1 = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should catch errors for a specific stable and continue processing others", () => {
    shouldThrowForStable1 = true;

    const mockState = {
      horses: {},
      pregnancies: [],
      races: {},
      npcStables: [
        createTestStable({ id: "stable1", country: "USA", personality: "aggressive" }),
        createTestStable({ id: "stable2", country: "USA", personality: "conservative" }),
      ],
      npcAIManager: {
        stableStates: {},
      },
    } as unknown as GameState;

    // generateNpcIntents should not throw when the error is caught
    const intents = generateNpcIntents(mockState, 1);

    // Test that the error was caught
    expect(Array.isArray(intents)).toBe(true);

    // We should see a console.warn for the stable that threw
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to generate intents for NPC",
      "stable1",
      expect.any(Error),
    );

    // Wait, the error is an instance of Error with the message "Simulated AI error for stable 1"
    const warnCallArgs = (console.warn as any).mock.calls.find(
      (call: any) => call[1] === "stable1",
    );
    expect(warnCallArgs).toBeDefined();
    expect(warnCallArgs[2].message).toBe("Simulated AI error for stable 1");
  });
});
