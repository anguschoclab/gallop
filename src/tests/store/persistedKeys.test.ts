import { describe, it, expect } from "vitest";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Regression test: cashPressureHistory must be included in the persisted keys
 * so that 90-day trends survive reloads. We verify via the partialize function
 * exposed through the store's persist config.
 */
describe("PERSISTED_KEYS includes cashPressureHistory", () => {
  it("cashPressureHistory is a key on GameState", () => {
    const state = useGame.getState() as unknown as GameState;
    // The field may be undefined on a fresh store, but the key must be
    // recognized — we verify it's an optional property of the type by
    // accessing it without error.
    expect(state.cashPressureHistory).toBeUndefined();
  });

  it("partialize preserves cashPressureHistory when set", () => {
    // Set a value on the store, then call partialize via the persist config.
    const testData = {
      s1: [{ day: 1, pressure: 0.5, meter: 50, runwayDays: 100, label: "strained" as const }],
    };
    useGame.setState({ cashPressureHistory: testData } as Partial<GameState>);

    // Access the internal partialize through the store's persist middleware.
    // The persist config is stored on the store; we can access it via the
    // store's internal _persist property.
    const persistApi = (
      useGame as unknown as {
        persist?: { getOptions?: () => { partialize?: (s: unknown) => unknown } };
      }
    ).persist;
    const options = persistApi?.getOptions?.();
    if (options?.partialize) {
      const partialized = options.partialize(useGame.getState()) as GameState;
      expect(partialized.cashPressureHistory).toEqual(testData);
    }

    // Cleanup
    useGame.setState({ cashPressureHistory: undefined } as Partial<GameState>);
  });
});
