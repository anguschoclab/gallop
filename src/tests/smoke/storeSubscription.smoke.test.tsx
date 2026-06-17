/**
 * Mounts store-connected components against the REAL store so that an unstable
 * selector (fresh array/object each render) throws "Maximum update depth
 * exceeded". Router is mocked because routing context is incidental here.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { cleanup } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  getRouteApi: () => ({
    useSearch: () => ({}),
    useNavigate: () => () => {},
    useParams: () => ({}),
  }),
}));

import { renderWithStore } from "@/test-utils/renderWithStore";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";

afterEach(() => cleanup());

describe("store subscription stability (smoke)", () => {
  it("WeatherForecastStrip mounts without an update loop when a track has no forecast", () => {
    expect(() =>
      renderWithStore(
        createElement(WeatherForecastStrip, { trackId: "no-such-track", trackCondition: "fast" }),
      ),
    ).not.toThrow();
  });

  it("RacesTab feed mounts without a loop (empty weather/forecast)", async () => {
    const { RacesTab } = await import("@/components/racing/RacesTab");
    expect(() => renderWithStore(createElement(RacesTab))).not.toThrow();
  });
});
