/**
 * useLiveRaceSimulation.clock.test.tsx — RAF clock policy.
 *
 * Drives the real hook with a scripted requestAnimationFrame so frame traces
 * (30/60/120 Hz, backlog spikes, hidden-tab gaps) are deterministic. Verifies
 * fixed-dt accumulation, max-steps-per-frame capping, pause, unmount
 * cancellation, and per-frame (not per-step) React publication.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveRaceSimulation } from "@/hooks/race/useLiveRaceSimulation";
import { DEFAULT_DT } from "@/constants/raceEngineConstants";
import { SIMULATION_MAX_STEPS_PER_FRAME } from "@/constants/raceSimulationConstants";
import { createRng } from "@/core/common/rng";
import type { Race } from "@/core/race/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createTestJockey } from "@/tests/helpers";
import { asJockeyId } from "@/core/types/branded";
import { createRef } from "react";

// ── Scripted RAF clock ──────────────────────────────────────────────────────

let rafCallbacks: Map<number, FrameRequestCallback>;
let rafSeq: number;
let cancelled: Set<number>;
let nowMs: number;

function pumpFrames(n: number, frameMs: number) {
  for (let i = 0; i < n; i++) {
    nowMs += frameMs;
    const cbs = [...rafCallbacks.values()];
    rafCallbacks.clear();
    act(() => {
      for (const cb of cbs) cb(nowMs);
    });
  }
}

function makeJockey() {
  return createTestJockey({
    id: asJockeyId("j1"),
    archetype: "clinical",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 0,
    stableAffinity: 0,
  });
}

const STYLES = ["E", "EP", "P", "S"] as const;

function makeField(): Runner[] {
  return Array.from(
    { length: 6 },
    (_, i) =>
      ({
        horseId: `h${i + 1}`,
        name: `Horse ${i + 1}`,
        silk: "#fff",
        isPlayer: true,
        position: 0,
        velocity: 0,
        finishTime: null,
        lane: i + 1,
        targetLane: i + 1,
        laneVelocity: 0,
        gate: i + 1,
        topSpeed: 15 + (i % 3) * 0.4,
        accel: 1,
        staminaFactor: 1,
        noise: 0.05 + i * 0.02,
        affinityBonus: 0,
        runningStyle: STYLES[i % STYLES.length],
        draftingHorseId: null,
        weight: 55,
        horse: {} as never,
        jockey: makeJockey(),
      }) as Runner,
  );
}

const RACE: Race = {
  id: "r-clock",
  name: "Clock Test",
  day: 1,
  distance: 100000, // long enough that races never finish mid-test
  raceClass: "Allowance",
  entryFee: 0,
  purse: 0,
  fieldSize: 6,
  entries: [],
  resolved: false,
} as unknown as Race;

function makeProps(onTick?: (f: Runner[], t: number, silent: boolean) => void) {
  return {
    race: RACE,
    runners: makeField(),
    resolveRaceWithImpacts: vi.fn(),
    narrativeRef: createRef() as React.MutableRefObject<null>,
    messageQueue: createRef() as React.MutableRefObject<never[]>,
    rngRef: { current: createRng("clock") },
    onTick,
  };
}

describe("useLiveRaceSimulation RAF clock", () => {
  beforeEach(() => {
    rafCallbacks = new Map();
    rafSeq = 0;
    cancelled = new Set();
    nowMs = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.set(++rafSeq, cb);
      return rafSeq;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      cancelled.add(id);
      rafCallbacks.delete(id);
    });
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["30 Hz", 1000 / 30],
    ["60 Hz", 1000 / 60],
    ["120 Hz", 1000 / 120],
  ])("integrates %s frame traces to the same sim time", (_label, frameMs) => {
    const steps: number[] = [];
    const props = makeProps((_f, t) => steps.push(t));
    renderHook(() => useLiveRaceSimulation(props));

    // One simulated second at each refresh rate must advance the same fixed-dt
    // amount regardless of frame cadence.
    const frames = Math.round(1000 / frameMs);
    pumpFrames(frames, frameMs);
    const expected = Math.floor(1.0 / DEFAULT_DT);
    // Accumulator keeps fractional remainders — allow ±1 step of jitter.
    expect(Math.abs(steps.length - expected)).toBeLessThanOrEqual(1);
    expect(steps[0]).toBe(0); // first tick at t=0
  });

  it("4x speed quadruples steps for the same wall-clock trace", () => {
    const at1x: number[] = [];
    const props1 = { ...makeProps((_f, t) => at1x.push(t)), initialSpeed: 1 };
    const h1 = renderHook(() => useLiveRaceSimulation(props1));
    pumpFrames(60, 1000 / 60);
    h1.unmount();

    const at4x: number[] = [];
    const props4 = { ...makeProps((_f, t) => at4x.push(t)), initialSpeed: 4 };
    renderHook(() => useLiveRaceSimulation(props4));
    pumpFrames(60, 1000 / 60);

    // 60 frames ≈ 1s: ~10 steps at 1x, ~40 at 4x. Accumulator boundary
    // residue can shift each total by ±1, so assert the theoretical ranges.
    expect(at1x.length).toBeGreaterThanOrEqual(9);
    expect(at1x.length).toBeLessThanOrEqual(11);
    expect(at4x.length).toBeGreaterThanOrEqual(38);
    expect(at4x.length).toBeLessThanOrEqual(41);
  });

  it("caps catch-up work at MAX_STEPS_PER_FRAME (no hidden-tab fast-forward)", () => {
    const steps: number[] = [];
    const props = makeProps((_f, t) => steps.push(t));
    renderHook(() => useLiveRaceSimulation(props));

    // A 30-second hidden-tab gap arrives as one frame — the accumulator must
    // not explode into thousands of catch-up steps in a single callback.
    pumpFrames(1, 30000);
    expect(steps.length).toBeLessThanOrEqual(SIMULATION_MAX_STEPS_PER_FRAME);
    expect(steps.length).toBe(SIMULATION_MAX_STEPS_PER_FRAME);
  });

  it("pause halts physics steps without stopping publication", () => {
    const steps: number[] = [];
    const props = makeProps((_f, t) => steps.push(t));
    const { result } = renderHook(() => useLiveRaceSimulation(props));
    pumpFrames(12, 1000 / 60);
    const before = steps.length;
    expect(before).toBeGreaterThan(0);

    act(() => result.current.setPaused(true));
    pumpFrames(30, 1000 / 60);
    expect(steps.length).toBe(before);

    act(() => result.current.setPaused(false));
    pumpFrames(12, 1000 / 60);
    expect(steps.length).toBeGreaterThan(before);
  });

  it("unmount cancels the pending RAF and stops all stepping", () => {
    const steps: number[] = [];
    const props = makeProps((_f, t) => steps.push(t));
    const { unmount } = renderHook(() => useLiveRaceSimulation(props));
    pumpFrames(6, 1000 / 60);
    unmount();
    expect(cancelled.size + rafCallbacks.size === 0 || cancelled.size > 0).toBe(true);
    const after = steps.length;
    pumpFrames(30, 1000 / 60);
    expect(steps.length).toBe(after);
  });

  it("publishes React state per frame, not per physics step", () => {
    const props = makeProps();
    const { result } = renderHook(() => useLiveRaceSimulation(props));
    const tickBefore = result.current.tick;
    pumpFrames(10, 1000 / 60);
    // One setTick per RAF callback regardless of how many fixed steps ran.
    expect(result.current.tick - tickBefore).toBe(10);
  });
});
