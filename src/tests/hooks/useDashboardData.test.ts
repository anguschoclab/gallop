import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { createDefaultGameState } from "@/game/store/state";
import type { Horse } from "@/core/horse/types";

function mkHorse(id: string, overrides: Partial<Horse> = {}): Horse {
  return {
    id,
    name: `Horse-${id}`,
    owned: true,
    lifecycleStatus: "active",
    energy: 50,
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
      h1: mkHorse("h1", { owned: true, lifecycleStatus: "active", energy: 50 }),
      h2: mkHorse("h2", { owned: true, lifecycleStatus: "active", energy: 30 }),
      h3: mkHorse("h3", { owned: true, lifecycleStatus: "retired", energy: 50 }),
      h4: mkHorse("h4", { owned: false, lifecycleStatus: "active", energy: 50 }),
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
      h1: mkHorse("h1", { owned: true, lifecycleStatus: "active", energy: 20 }),
      h2: mkHorse("h2", { owned: true, lifecycleStatus: "active", energy: 10 }),
      h3: mkHorse("h3", { owned: true, lifecycleStatus: "active", energy: 30 }),
    };

    seedStore({ horses });
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.ownedHorses).toHaveLength(3);
    expect(result.current.activeHorses).toHaveLength(3);
    expect(result.current.lowEnergyHorses).toHaveLength(3);
  });
});
