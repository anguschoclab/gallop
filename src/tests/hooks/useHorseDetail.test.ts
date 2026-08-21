import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { useHorseDetail } from "@/hooks/horse/useHorseDetail";
import { renderHook } from "@testing-library/react";
import type { Horse } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

// Mock IntersectionObserver (used by useHorseDetail's scroll section tracking)
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "";
  thresholds = [];
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

function makeHorse(id: string, name: string): Horse {
  return {
    id,
    name,
    sireName: "Sire",
    damName: "Dam",
    pedigree: { name: "Test", generation: 1 },
    birthDay: 0,
    fanCount: 0,
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "",
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    genotype: {} as any,
    energy: 100,
    fitness: 50,
    fatigue: 10,
    peakingIndex: 10,
    form: 0,
    potential: 70,
    recoveryPoints: 100,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    healthStatusDay: 0,
    isBlueHen: false,
    gelded: false,
    foalingEase: 0.5,
    heterozygosity: 0.5,
    raceHistory: [],
    fame: 0,
    ownership: { type: "player" },
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1, Dirt: 1, Synthetic: 1 },
    mudAptitude: 1,
    corneringAptitude: 1,
    climbingAptitude: 1,
    peakAge: 4,
    strideType: "average",
    trackPreference: "balanced",
    runningStyle: "EP",
    bleederRisk: 0,
    roarerRisk: 0,
    ocdRisk: 0,
    recoveryRate: 1,
    trainability: 0.5,
    heartScore: 80,
    bloodline: "",
    fiberBias: "",
    healthStatus: "healthy",
    racingViable: true,
    lifecycleStatus: "active",
    courseVisits: {},
  } as Horse;
}

describe("useHorseDetail — horses Record optimization", () => {
  beforeEach(() => {
    const horse1 = makeHorse("h1", "Star");
    const horse2 = makeHorse("h2", "Comet");
    const state = createDefaultGameState();
    useGame.setState({
      ...state,
      horses: h2r([horse1, horse2]),
    } as any);
  });

  it("returns localHorseMap from the store (not a useMemo recreation)", () => {
    const { result } = renderHook(() => useHorseDetail("h1"));
    expect(result.current.localHorseMap).toBeDefined();
    expect(result.current.localHorseMap.get("h1")?.name).toBe("Star");
    expect(result.current.localHorseMap.get("h2")?.name).toBe("Comet");
  });

  it("does not return horses array (uses store horses Record instead)", () => {
    const { result } = renderHook(() => useHorseDetail("h1"));
    expect((result.current as any).horses).toBeUndefined();
  });

  it("localHorseMap is derived from the store horses Record", () => {
    const storeHorses = useGame.getState().horses;
    const { result } = renderHook(() => useHorseDetail("h1"));
    expect(result.current.localHorseMap.get("h1")).toBe(storeHorses["h1"]);
  });
});
