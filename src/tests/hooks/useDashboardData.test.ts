import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { createDefaultGameState } from "@/game/store/state";
import { ENERGY_LOW_THRESHOLD } from "@/constants";
import type { Horse } from "@/core/horse/types";

function mkHorse(id: string, overrides: Partial<Horse> = {}): Horse {
  return {
    id,
    name: `Horse-${id}`,
    ownership: { type: "player" },
    lifecycleStatus: "active",
    energy: ENERGY_LOW_THRESHOLD + 10,
    raceHistory: [],
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    ...overrides,
  } as unknown as Horse;
}

describe("useDashboardData — horse categorization", () => {
  beforeEach(() => {
    seedStore();
  });

  it("correctly categorizes owned, active, and low-energy horses", () => {
    const horses: Record<string, Horse> = {
      h1: mkHorse("h1", {
        ownership: { type: "player" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD + 10,
      }),
      h2: mkHorse("h2", {
        ownership: { type: "player" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD - 10,
      }),
      h3: mkHorse("h3", {
        ownership: { type: "player" },
        lifecycleStatus: "retired",
        energy: ENERGY_LOW_THRESHOLD + 10,
      }),
      h4: mkHorse("h4", {
        ownership: { type: "unowned" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD + 10,
      }),
    };

    seedStore({ horses });
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.ownedHorses).toHaveLength(3);
    expect(result.current.activeHorses).toHaveLength(2);
    expect(result.current.lowEnergyHorses).toHaveLength(1);
    expect(result.current.lowEnergyHorses[0].id).toBe("h2");
  });

  it("returns empty arrays when horses record is empty", () => {
    seedStore({ horses: {} });
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.ownedHorses).toHaveLength(0);
    expect(result.current.activeHorses).toHaveLength(0);
    expect(result.current.lowEnergyHorses).toHaveLength(0);
  });

  it("all owned, active, low-energy → all three arrays have same length", () => {
    const horses: Record<string, Horse> = {
      h1: mkHorse("h1", {
        ownership: { type: "player" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD - 20,
      }),
      h2: mkHorse("h2", {
        ownership: { type: "player" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD - 30,
      }),
      h3: mkHorse("h3", {
        ownership: { type: "player" },
        lifecycleStatus: "active",
        energy: ENERGY_LOW_THRESHOLD - 10,
      }),
    };

    seedStore({ horses });
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.ownedHorses).toHaveLength(3);
    expect(result.current.activeHorses).toHaveLength(3);
    expect(result.current.lowEnergyHorses).toHaveLength(3);
  });
});
