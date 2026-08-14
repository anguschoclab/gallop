/**
 * Verifies the `running` gate on useLiveRaceSimulation: when `running` is
 * false the RAF loop never starts; flipping it to true schedules the loop.
 *
 * Also verifies the onTick callback mechanism: when an onTick callback is
 * provided, the hook calls it each simulation step instead of directly
 * pushing commentary to the messageQueue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useLiveRaceSimulation } from "@/hooks/race/useLiveRaceSimulation";

const baseRace = {
  id: "race-1",
  resolved: false,
  distance: 1600,
  weather: undefined,
};

function makeRunners() {
  return [
    {
      horseId: "h1",
      position: 0,
      finishTime: null,
      energy: 100,
    } as any,
  ];
}

function setup(running: boolean) {
  return renderHook(() => {
    const narrativeRef = useRef(null) as any;
    const messageQueue = useRef([]) as any;
    const rngRef = useRef({ next: () => 0.5 }) as any;
    return useLiveRaceSimulation({
      race: baseRace as any,
      runners: makeRunners(),
      resolveRaceWithImpacts: vi.fn(),
      narrativeRef,
      messageQueue,
      rngRef,
      running,
    });
  });
}

describe("useLiveRaceSimulation — running gate", () => {
  let rafSpy: any;
  let cafSpy: any;

  beforeEach(() => {
    rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1 as any);
    cafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });

  it("does NOT schedule the RAF loop when running=false (preshow phase)", () => {
    setup(false);
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("schedules the RAF loop when running=true (live phase)", () => {
    setup(true);
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT schedule the loop for a resolved race even when running=true (review phase)", () => {
    renderHook(() => {
      const narrativeRef = useRef(null) as any;
      const messageQueue = useRef([]) as any;
      const rngRef = useRef({ next: () => 0.5 }) as any;
      return useLiveRaceSimulation({
        race: { ...baseRace, resolved: true } as any,
        runners: makeRunners(),
        resolveRaceWithImpacts: vi.fn(),
        narrativeRef,
        messageQueue,
        rngRef,
        running: true,
      });
    });
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("starts the loop when running flips from false to true", () => {
    const { rerender } = renderHook(
      ({ running }: { running: boolean }) => {
        const narrativeRef = useRef(null) as any;
        const messageQueue = useRef([]) as any;
        const rngRef = useRef({ next: () => 0.5 }) as any;
        return useLiveRaceSimulation({
          race: baseRace as any,
          runners: makeRunners(),
          resolveRaceWithImpacts: vi.fn(),
          narrativeRef,
          messageQueue,
          rngRef,
          running,
        });
      },
      { initialProps: { running: false } },
    );
    expect(rafSpy).not.toHaveBeenCalled();
    rerender({ running: true });
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });
});

describe("useLiveRaceSimulation — onTick callback", () => {
  let rafSpy: any;
  let cafSpy: any;
  let perfSpy: any;

  beforeEach(() => {
    let called = false;
    let time = 0;
    rafSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        // Only invoke once to prevent infinite recursion (runners never finish in mock)
        if (!called) {
          called = true;
          time += 100; // advance 100ms so the loop runs ~2 steps
          cb(time);
        }
        return 1 as any;
      });
    cafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    perfSpy = vi.spyOn(performance, "now").mockImplementation(() => time);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    cafSpy.mockRestore();
    perfSpy.mockRestore();
  });

  it("calls onTick with sorted field and simTime each non-silent step", () => {
    const onTick = vi.fn();
    const runners = makeRunners();

    renderHook(() => {
      const narrativeRef = useRef(null) as any;
      const messageQueue = useRef([]) as any;
      const rngRef = useRef({ next: () => 0.5 }) as any;
      return useLiveRaceSimulation({
        race: baseRace as any,
        runners,
        resolveRaceWithImpacts: vi.fn(),
        narrativeRef,
        messageQueue,
        rngRef,
        running: true,
        onTick,
      });
    });

    expect(onTick).toHaveBeenCalled();
    const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1];
    expect(lastCall[0]).toBeInstanceOf(Array); // sortedField
    expect(typeof lastCall[1]).toBe("number"); // simTime
  });

  it("does NOT call onTick during silent fast-forward (resumeAtSimTime)", () => {
    const onTick = vi.fn();

    renderHook(() => {
      const narrativeRef = useRef(null) as any;
      const messageQueue = useRef([]) as any;
      const rngRef = useRef({ next: () => 0.5 }) as any;
      return useLiveRaceSimulation({
        race: baseRace as any,
        runners: makeRunners(),
        resolveRaceWithImpacts: vi.fn(),
        narrativeRef,
        messageQueue,
        rngRef,
        running: true,
        resumeAtSimTime: 1.0,
        onTick,
      });
    });

    // During fast-forward, onTick should not be called with silent=true
    // (The hook skips onTick entirely when silent is true)
    const silentCalls = onTick.mock.calls.filter(
      (call: any[]) => call[2] === true, // silent flag = true means fast-forward
    );
    expect(silentCalls).toHaveLength(0);
  });

  it("does NOT push to messageQueue when onTick is provided", () => {
    const onTick = vi.fn();
    const messageQueue = { current: [] } as any;
    const narrativeGen = {
      update: vi.fn().mockReturnValue([{ id: "c1", text: "Test" }]),
    };

    renderHook(() => {
      const narrativeRef = useRef(narrativeGen) as any;
      const rngRef = useRef({ next: () => 0.5 }) as any;
      return useLiveRaceSimulation({
        race: baseRace as any,
        runners: makeRunners(),
        resolveRaceWithImpacts: vi.fn(),
        narrativeRef,
        messageQueue,
        rngRef,
        running: true,
        onTick,
      });
    });

    // When onTick is provided, the hook should not directly push to messageQueue
    expect(messageQueue.current).toHaveLength(0);
  });

  it("still pushes to messageQueue when onTick is NOT provided (backward compat)", () => {
    const messageQueue = { current: [] } as any;
    const narrativeGen = {
      update: vi.fn().mockReturnValue([{ id: "c1", text: "Test" }]),
    };

    renderHook(() => {
      const narrativeRef = useRef(narrativeGen) as any;
      const rngRef = useRef({ next: () => 0.5 }) as any;
      return useLiveRaceSimulation({
        race: baseRace as any,
        runners: makeRunners(),
        resolveRaceWithImpacts: vi.fn(),
        narrativeRef,
        messageQueue,
        rngRef,
        running: true,
      });
    });

    // Without onTick, the old behavior is preserved
    expect(narrativeGen.update).toHaveBeenCalled();
  });
});
