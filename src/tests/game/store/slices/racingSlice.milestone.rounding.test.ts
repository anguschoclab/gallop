import { describe, it, expect, vi } from "vitest";
import { createRacingSlice } from "@/game/store/slices/racingSlice";
import type { StoreGet } from "@/game/store/types";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import type { Horse } from "@/game/types";

function makeMockState(horseOverrides: Partial<Horse> = {}) {
  const arc = createDefaultFoalDevelopmentArc(0);
  const horse: Horse = {
    id: "h1",
    name: "Foal",
    ownership: { type: "player" },
    age: 2,
    potential: 80,
    stats: {
      speed: 38.4,
      stamina: 50,
      acceleration: 45,
      temperament: 40,
      conformation: 35,
      consistency: 30,
    },
    developmentArc: arc,
    ...horseOverrides,
  } as unknown as Horse;

  return {
    day: 10,
    cash: 500000,
    horses: { h1: horse },
    horseMap: new Map([["h1", horse]]),
    log: [],
  };
}

function makeMockStore(initialState: ReturnType<typeof makeMockState>) {
  let state = initialState as any;
  const get: StoreGet = () => state;
  const set = vi.fn((partial: any) => {
    if (typeof partial === "function") {
      state = { ...state, ...partial(state) };
    } else {
      state = { ...state, ...partial };
    }
  });
  const enqueueIntent = vi.fn();
  return { get, set, enqueueIntent, getState: () => state };
}

describe("resolveFoalMilestone — stat rounding", () => {
  it("produces integer stats after milestone resolution", () => {
    const initialState = makeMockState();
    const { get, set, enqueueIntent } = makeMockStore(initialState);
    const slice = createRacingSlice(set, get, enqueueIntent);

    const result = (slice as any).resolveFoalMilestone("h1", "breaking_in", "bold_approach");
    expect(result.ok).toBe(true);

    const horse = get().horses["h1"];
    expect(Number.isInteger(horse.stats.speed)).toBe(true);
  });

  it("rounds correctly when delta would produce a float", () => {
    const initialState = makeMockState({
      stats: {
        speed: 50.6,
        stamina: 50,
        acceleration: 45,
        temperament: 40,
        conformation: 35,
        consistency: 30,
      },
    } as any);
    const { get, set, enqueueIntent } = makeMockStore(initialState);
    const slice = createRacingSlice(set, get, enqueueIntent);

    (slice as any).resolveFoalMilestone("h1", "breaking_in", "bold_approach");

    const horse = get().horses["h1"];
    // 50.6 + 2 = 52.6 → Math.round → 53
    expect(horse.stats.speed).toBe(53);
  });
});
