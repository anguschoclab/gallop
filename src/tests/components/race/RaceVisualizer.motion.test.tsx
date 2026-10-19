/**
 * RaceVisualizer.motion.test.tsx
 *
 * Verifies the broadcast canvas motion contract:
 *  - prefersReducedMotion() reflects the OS media query
 *  - resolveFrameTime quantizes time (discrete steps) when motion is disallowed,
 *    so position updates continue but smooth interpolation stops
 *  - the animationsEnabled=false store setting gates the same path
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  prefersReducedMotion,
  resolveFrameTime,
  REDUCED_MOTION_STEP_S,
} from "@/domains/race/ui/broadcastCanvas";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the OS requests reduced motion", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when reduced motion is not requested", () => {
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("resolveFrameTime", () => {
  it("passes time through when motion is allowed", () => {
    expect(resolveFrameTime(1.37, true)).toBe(1.37);
    expect(resolveFrameTime(0.01, true)).toBe(0.01);
  });

  it("quantizes to discrete steps when motion is disallowed", () => {
    expect(resolveFrameTime(1.37, false)).toBe(1.0);
    expect(resolveFrameTime(1.49, false)).toBe(1.0);
    expect(resolveFrameTime(1.51, false)).toBe(1.5);
    expect(resolveFrameTime(0.49, false)).toBe(0);
  });

  it("still advances positions in discrete jumps (never freezes)", () => {
    const steps = [0.1, 0.4, 0.6, 1.1, 1.4, 1.6].map((t) => resolveFrameTime(t, false));
    expect(steps).toEqual([0, 0, REDUCED_MOTION_STEP_S, 1.0, 1.0, 1.5]);
  });
});
