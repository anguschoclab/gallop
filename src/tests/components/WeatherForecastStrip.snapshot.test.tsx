/**
 * WeatherForecastStrip.snapshot.test.tsx — Snapshot tests for the WeatherForecastStrip
 * component, verifying consistent HTML output for each of the five weather patterns
 * (clear, overcast, shower, rain, storm) as well as edge cases.
 *
 * Approach:
 * - `useGame` is mocked via vi.mock so the component can render without a real Zustand
 *   store (compatible with renderToStaticMarkup + jsdom).
 * - Snapshots are inline (toMatchInlineSnapshot) so they are committed to git and
 *   reviewed as part of any PR that changes the component's output.
 * - The weather icon aria-labels are the canonical signal for pattern correctness.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── Module mocks (must be at top, hoisted by vitest) ─────────────────────────

// We mock @/game/store entirely so that `useGame` returns whatever we inject
// via the `__setStoreState` helper without needing a real Zustand instance.

let _mockForecast: any[] = [];
let _mockCurrent: any = undefined;

vi.mock("@/game/store", () => {
  return {
    useGame: (selector: (s: any) => any) => {
      const mockState = {
        weather: {
          byTrack: {
            "test-track": _mockCurrent ? [_mockCurrent] : [],
          },
          forecast: {
            "test-track": _mockForecast,
          },
        },
      };
      return selector(mockState);
    },
    useGameWithShallow: (selector: (s: any) => any) => {
      return selector({ horses: {} });
    },
    useGallopStore: (selector: (s: any) => any) => {
      const mockState = { weather: { byTrack: {}, forecast: {} } };
      return selector(mockState);
    },
  };
});

// Mock @tanstack/react-router so Link renders without a router context.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => createElement("a", props, children),
  createFileRoute: () => () => ({}),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import type { SimWeatherPattern } from "@/core/weather";
import type { TrackCondition } from "@/game/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const TRACK_ID = "test-track";

function makeWeatherState(pattern: SimWeatherPattern, day = 1) {
  return { trackId: TRACK_ID, day, pattern, tempC: 20, humidity: 0.65, windKph: 15 };
}

function makeForecast(pattern: SimWeatherPattern, length = 7): any[] {
  return Array.from({ length }, (_, i) => makeWeatherState(pattern, 100 + i));
}

function render(props: { trackId?: string; trackCondition?: TrackCondition }): string {
  return renderToStaticMarkup(createElement(WeatherForecastStrip, props));
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("WeatherForecastStrip — snapshot tests", () => {
  beforeEach(() => {
    _mockForecast = [];
    _mockCurrent = undefined;
  });

  // ── null guard ─────────────────────────────────────────────────────────────
  it("returns empty string (null) when trackId is undefined", () => {
    const html = render({});
    expect(html).toBe("");
  });

  // ── condition badge only ───────────────────────────────────────────────────
  it("renders only the condition badge when there is no forecast or current data", () => {
    const html = render({ trackId: TRACK_ID, trackCondition: "fast" });
    expect(html).toContain("fast");
    expect(html).not.toContain('aria-label="7-day forecast"');
    expect(html).toMatchSnapshot();
  });

  // ── per-pattern snapshot tests ─────────────────────────────────────────────

  const PATTERNS: SimWeatherPattern[] = ["clear", "overcast", "shower", "rain", "snow", "storm"];

  for (const pattern of PATTERNS) {
    it(`renders a 7-icon forecast strip for pattern: ${pattern}`, () => {
      _mockForecast = makeForecast(pattern, 7);
      _mockCurrent = makeWeatherState(pattern);

      const html = render({ trackId: TRACK_ID, trackCondition: "good" });

      // All 7 forecast icons must be present with the correct aria-label.
      const matches = [...html.matchAll(new RegExp(`aria-label="${pattern}"`, "g"))];
      expect(matches.length).toBe(7);

      // The 7-day forecast wrapper must be present.
      expect(html).toContain('aria-label="7-day forecast"');

      // The current weather readout should appear (temp + humidity).
      expect(html).toContain("°C");
      expect(html).toContain("%");

      // Snapshot the full markup.
      expect(html).toMatchSnapshot();
    });
  }

  // ── partial forecast (<7 days) ─────────────────────────────────────────────
  it("renders exactly the forecast entries provided when fewer than 7 days are available", () => {
    _mockForecast = makeForecast("rain", 3);
    _mockCurrent = makeWeatherState("rain");

    const html = render({ trackId: TRACK_ID, trackCondition: "soft" });

    const matches = [...html.matchAll(/aria-label="rain"/g)];
    expect(matches.length).toBe(3);
    expect(html).toMatchSnapshot();
  });

  // ── condition label variations ─────────────────────────────────────────────
  const CONDITIONS: TrackCondition[] = ["fast", "good", "soft", "heavy", "yielding"];

  for (const cond of CONDITIONS) {
    it(`condition badge shows "${cond}" for trackCondition="${cond}"`, () => {
      _mockForecast = makeForecast("clear", 7);
      _mockCurrent = makeWeatherState("clear");

      const html = render({ trackId: TRACK_ID, trackCondition: cond });
      // The badge text should contain the condition name (it's capitalised via CSS but the text node is lowercase).
      expect(html.toLowerCase()).toContain(cond.toLowerCase());
    });
  }

  // ── storm pattern — dedicated snapshot ────────────────────────────────────
  it("storm pattern snapshot — all 7 icons are CloudLightning (aria-label=storm)", () => {
    _mockForecast = makeForecast("storm", 7);
    _mockCurrent = makeWeatherState("storm");

    const html = render({ trackId: TRACK_ID, trackCondition: "heavy" });

    // The CloudLightning Lucide icon renders with aria-label="storm".
    const stormIcons = [...html.matchAll(/aria-label="storm"/g)];
    expect(stormIcons.length).toBe(7);
    expect(html).toContain("heavy");
    expect(html).toMatchSnapshot();
  });

  // ── determinism ───────────────────────────────────────────────────────────
  it("produces identical output on repeated renders for the same inputs", () => {
    _mockForecast = makeForecast("overcast", 7);
    _mockCurrent = makeWeatherState("overcast");

    const a = render({ trackId: TRACK_ID, trackCondition: "good" });
    const b = render({ trackId: TRACK_ID, trackCondition: "good" });
    expect(a).toBe(b);
  });
});
