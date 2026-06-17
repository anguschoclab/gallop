/**
 * Verifies the `running` gate on useLiveRaceSimulation: when `running` is
 * false the RAF loop never starts; flipping it to true schedules the loop.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
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
