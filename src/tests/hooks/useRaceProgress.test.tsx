import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRaceProgress } from "@/hooks/race/useRaceProgress";
import type { RacePhase } from "@/hooks/race/useRacePhase";

// sessionStorage mock (localStorage is already mocked in setup.ts)
const ssStore = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => ssStore.get(key) ?? null,
    setItem: (key: string, value: string) => ssStore.set(key, value),
    removeItem: (key: string) => ssStore.delete(key),
    clear: () => ssStore.clear(),
  },
  writable: true,
  configurable: true,
});

function setup(opts: {
  raceId?: string;
  phase?: RacePhase;
  finished?: boolean;
  simTime?: number;
  paused?: boolean;
  speed?: number;
  tick?: number;
}) {
  const {
    raceId = "race-1",
    phase = "live",
    finished = false,
    simTime = 0,
    paused = false,
    speed = 1,
    tick = 0,
  } = opts;
  return renderHook(
    (props) =>
      useRaceProgress({
        raceId: props.raceId,
        phase: props.phase,
        finished: props.finished,
        simTime: props.simTime,
        paused: props.paused,
        speed: props.speed,
        tick: props.tick,
      }),
    {
      initialProps: { raceId, phase, finished, simTime, paused, speed, tick },
    },
  );
}

beforeEach(() => {
  ssStore.clear();
});

describe("useRaceProgress — analysis panel persistence (localStorage)", () => {
  it("analysisOpen defaults to false when localStorage is empty", () => {
    const { result } = setup({});
    expect(result.current.analysisOpen).toBe(false);
  });

  it("reads '1' from localStorage to default analysisOpen to true", () => {
    localStorage.setItem("race-analysis-open:race-1", "1");
    const { result } = setup({});
    expect(result.current.analysisOpen).toBe(true);
  });

  it("setting analysisOpen=true writes '1' to localStorage", () => {
    const { result } = setup({});
    act(() => result.current.setAnalysisOpen(true));
    expect(localStorage.getItem("race-analysis-open:race-1")).toBe("1");
  });

  it("setting analysisOpen=false writes '0' to localStorage", () => {
    const { result } = setup({});
    act(() => result.current.setAnalysisOpen(false));
    expect(localStorage.getItem("race-analysis-open:race-1")).toBe("0");
  });
});

describe("useRaceProgress — sim progress persistence (sessionStorage)", () => {
  it("initialProgress defaults to { simTime:0, paused:false, speed:1 } when sessionStorage is empty", () => {
    const { result } = setup({});
    expect(result.current.initialProgress).toEqual({ simTime: 0, paused: false, speed: 1 });
  });

  it("initialProgress reads parsed JSON from sessionStorage", () => {
    ssStore.set("race-sim-progress:race-1", JSON.stringify({ simTime: 42, paused: true, speed: 2 }));
    const { result } = setup({});
    expect(result.current.initialProgress).toEqual({ simTime: 42, paused: true, speed: 2 });
  });

  it("invalid JSON in sessionStorage falls back to defaults", () => {
    ssStore.set("race-sim-progress:race-1", "{bad json}");
    const { result } = setup({});
    expect(result.current.initialProgress).toEqual({ simTime: 0, paused: false, speed: 1 });
  });

  it("persists { simTime, paused, speed } to sessionStorage while phase=live and not finished", () => {
    const { rerender } = setup({ phase: "live", finished: false, simTime: 10, paused: false, speed: 2, tick: 1 });
    rerender({ raceId: "race-1", phase: "live", finished: false, simTime: 10, paused: false, speed: 2, tick: 2 });
    const stored = JSON.parse(ssStore.get("race-sim-progress:race-1")!);
    expect(stored.simTime).toBe(10);
    expect(stored.speed).toBe(2);
  });

  it("does NOT write to sessionStorage when phase !== 'live'", () => {
    setup({ phase: "preshow", finished: false, simTime: 5, tick: 1 });
    expect(ssStore.has("race-sim-progress:race-1")).toBe(false);
  });

  it("does NOT write to sessionStorage when finished=true", () => {
    setup({ phase: "live", finished: true, simTime: 5, tick: 1 });
    expect(ssStore.has("race-sim-progress:race-1")).toBe(false);
  });

  it("removes sessionStorage entry when finished transitions to true", () => {
    ssStore.set("race-sim-progress:race-1", JSON.stringify({ simTime: 5, paused: false, speed: 1 }));
    const { rerender } = setup({ phase: "live", finished: false, tick: 1 });
    rerender({ raceId: "race-1", phase: "live", finished: true, simTime: 90, paused: false, speed: 1, tick: 2 });
    expect(ssStore.has("race-sim-progress:race-1")).toBe(false);
  });

  it("does NOT remove sessionStorage entry when not finished", () => {
    ssStore.set("race-sim-progress:race-1", JSON.stringify({ simTime: 5, paused: false, speed: 1 }));
    setup({ phase: "live", finished: false, tick: 1 });
    expect(ssStore.has("race-sim-progress:race-1")).toBe(true);
  });
});
