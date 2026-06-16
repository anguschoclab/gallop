/**
 * WeatherForecastStrip.loop.test.tsx — Regression test for an infinite
 * re-render loop.
 *
 * Unlike the snapshot test (which fully mocks `useGame` and uses
 * renderToStaticMarkup), this test wires the component to a REAL Zustand store
 * so that Zustand's `useSyncExternalStore` is actually exercised. That is the
 * only setup that surfaces the "getSnapshot should be cached / Maximum update
 * depth exceeded" loop caused by a selector returning a fresh array each render.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, cleanup } from "@testing-library/react";
import { create } from "zustand";

// A real Zustand store whose `weather.forecast` has NO entry for the track we
// render — this is the case that triggered the bug (the `?? []` fallback fires).
const useRealStore = create(() => ({
  weather: {
    forecast: {} as Record<string, unknown[]>,
    byTrack: {} as Record<string, unknown[]>,
  },
}));

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: unknown) => unknown) => useRealStore(selector as never),
  useGameWithShallow: (selector: (s: unknown) => unknown) => useRealStore(selector as never),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";

afterEach(() => cleanup());

describe("WeatherForecastStrip — store subscription stability", () => {
  it("renders without an infinite update loop when a track has no forecast", () => {
    // With an unstable selector (returns a fresh [] each render), React throws
    // "Maximum update depth exceeded". A stable empty-array fallback renders once.
    expect(() =>
      render(
        createElement(WeatherForecastStrip, {
          trackId: "track-without-forecast",
          trackCondition: "fast",
        }),
      ),
    ).not.toThrow();
  });
});
