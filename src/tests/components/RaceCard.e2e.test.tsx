/**
 * RaceCard.e2e.test.tsx — End-to-end integration test for the RaceCard component.
 *
 * Verifies that RaceCard:
 *  1. Renders the correct WeatherForecastStrip forecast icons (storm pattern)
 *     when the store reports a storm pattern for the race's track.
 *  2. Shows the correct condition label ("heavy") in the WeatherForecastStrip badge.
 *  3. Renders the race name, purse, distance, and surface.
 *  4. Adapts correctly when no weather data is available (graceful fallback).
 *
 * Approach: mirrors the JockeyAvatar test — uses renderToStaticMarkup (SSR-safe,
 * no hooks at render time) with vi.mock to stub the Zustand store and the
 * TanStack Router Link component (which requires a router context).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── Store state control ────────────────────────────────────────────────────────

let _mockWeatherByTrack: Record<string, any[]> = {};
let _mockForecast: Record<string, any[]> = {};
let _mockHorses: any[] = [];

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => {
    const mockState = {
      weather: {
        byTrack: _mockWeatherByTrack,
        forecast: _mockForecast,
      },
      horses: _mockHorses,
    };
    return selector(mockState);
  },
  useGameWithShallow: (selector: (s: any) => any) => {
    return selector({ horses: _mockHorses });
  },
  useGallopStore: (selector: (s: any) => any) => {
    return selector({
      weather: { byTrack: _mockWeatherByTrack, forecast: _mockForecast },
      horses: _mockHorses,
    });
  },
  shallow: (a: any, b: any) => a === b,
}));

// Mock TanStack Router — Link renders as a plain <a> without a router context.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, className }: any) =>
    createElement("a", { href: to, className }, children),
  createFileRoute: () => () => ({}),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────
import { RaceCard } from "@/components/race/RaceCard";
import type { Race } from "@/game/types";

// ── helpers ────────────────────────────────────────────────────────────────────

const STORM_TRACK_ID = "belmont-park";

function makeStormForecast(trackId: string, length = 7) {
  return Array.from({ length }, (_, i) => ({
    trackId,
    day: 50 + i,
    pattern: "storm",
    tempC: 12,
    humidity: 0.95,
    windKph: 55,
  }));
}

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-belmont-stakes",
    name: "Belmont Stakes",
    day: 50,
    distance: 2400,
    surface: "Dirt",
    raceClass: "G1",
    entryFee: 0,
    purse: 1_500_000,
    fieldSize: 12,
    entries: [],
    resolved: false,
    trackId: STORM_TRACK_ID,
    trackCondition: "heavy",
    graded: {
      key: "belmont-stakes",
      grade: "G1",
      track: "Belmont Park",
      trackId: STORM_TRACK_ID,
      surface: "Dirt",
    },
    ...overrides,
  } as unknown as Race;
}

function render(race: Race, onEnter?: () => void): string {
  return renderToStaticMarkup(createElement(RaceCard, { race, onEnter }));
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe("RaceCard — end-to-end integration with WeatherForecastStrip", () => {
  beforeEach(() => {
    _mockHorses = [];
    _mockWeatherByTrack = {};
    _mockForecast = {};
  });

  // ── storm pattern ─────────────────────────────────────────────────────────
  it("renders the storm WeatherForecastStrip when the store has a storm pattern forecast", () => {
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };
    _mockWeatherByTrack = {
      [STORM_TRACK_ID]: [
        { trackId: STORM_TRACK_ID, day: 50, pattern: "storm", tempC: 12, humidity: 0.95, windKph: 55 },
      ],
    };

    const html = render(makeRace());

    // The 7-day forecast strip must be present.
    expect(html).toContain('aria-label="7-day forecast"');

    // All 7 forecast icons must be storm icons.
    const stormIcons = [...html.matchAll(/aria-label="storm"/g)];
    expect(stormIcons.length).toBe(7);

    // The current weather readout (temp) must be present.
    expect(html).toContain("°C");
  });

  it("shows the 'heavy' condition label badge when trackCondition is heavy", () => {
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };
    _mockWeatherByTrack = {
      [STORM_TRACK_ID]: [
        { trackId: STORM_TRACK_ID, day: 50, pattern: "storm", tempC: 12, humidity: 0.95, windKph: 55 },
      ],
    };

    const html = render(makeRace({ trackCondition: "heavy" }));

    // The condition badge text must be "heavy" (lowercase; capitalize is CSS-only).
    expect(html.toLowerCase()).toContain("heavy");
  });

  it("renders the race name, purse, distance and surface", () => {
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };

    const html = render(makeRace());

    expect(html).toContain("Belmont Stakes");
    expect(html).toContain("2400"); // distance
    expect(html).toContain("Dirt"); // surface
    // Purse — formatted as currency
    expect(html).toContain("1,500,000");
  });

  it("renders the G1 grade badge", () => {
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };

    const html = render(makeRace());
    expect(html).toContain("G1");
  });

  // ── pattern jump from clear to storm ─────────────────────────────────────
  it("shows storm forecast even when a race was previously clear (pattern jump scenario)", () => {
    // Simulate: byTrack has yesterday=clear, today=storm (pattern jump occurred)
    _mockWeatherByTrack = {
      [STORM_TRACK_ID]: [
        { trackId: STORM_TRACK_ID, day: 49, pattern: "clear", tempC: 20, humidity: 0.5, windKph: 12 },
        { trackId: STORM_TRACK_ID, day: 50, pattern: "storm", tempC: 12, humidity: 0.95, windKph: 55 },
      ],
    };
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };

    const html = render(makeRace({ trackCondition: "heavy" }));

    const stormIcons = [...html.matchAll(/aria-label="storm"/g)];
    expect(stormIcons.length).toBe(7);
    expect(html.toLowerCase()).toContain("heavy");
  });

  // ── no weather data fallback ───────────────────────────────────────────────
  it("renders gracefully with no weather data — condition badge only, no forecast strip", () => {
    // Leave _mockForecast and _mockWeatherByTrack empty (default: {}).

    const html = render(makeRace({ trackCondition: "good" }));

    // Condition badge should still appear.
    expect(html.toLowerCase()).toContain("good");

    // Forecast strip should NOT be rendered.
    expect(html).not.toContain('aria-label="7-day forecast"');

    // Component should not throw — valid HTML output.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Belmont Stakes");
  });

  // ── owned horses ──────────────────────────────────────────────────────────
  it("shows 'Entered' badge when the race has owned entries", () => {
    _mockForecast = { [STORM_TRACK_ID]: makeStormForecast(STORM_TRACK_ID, 7) };
    _mockHorses = [
      {
        id: "horse-1",
        name: "Thunder Run",
        stats: { speed: 75, stamina: 70, acceleration: 72, grit: 68, temperament: 65 },
        form: 0,
      },
    ];

    const raceWithOwned = makeRace({
      entries: [{ horseId: "horse-1", owned: true, jockeyId: null }] as any,
    });
    const html = render(raceWithOwned);

    expect(html).toContain("Entered");
  });

  // ── different patterns ────────────────────────────────────────────────────
  const PATTERNS = ["clear", "overcast", "shower", "rain", "snow", "storm"] as const;

  for (const pattern of PATTERNS) {
    it(`WeatherForecastStrip renders the correct icon for the ${pattern} pattern`, () => {
      _mockForecast = {
        [STORM_TRACK_ID]: Array.from({ length: 7 }, (_, i) => ({
          trackId: STORM_TRACK_ID,
          day: 50 + i,
          pattern,
          tempC: 18,
          humidity: 0.6,
          windKph: 20,
        })),
      };
      _mockWeatherByTrack = {
        [STORM_TRACK_ID]: [{ trackId: STORM_TRACK_ID, day: 50, pattern, tempC: 18, humidity: 0.6, windKph: 20 }],
      };

      const html = render(makeRace());

      const icons = [...html.matchAll(new RegExp(`aria-label="${pattern}"`, "g"))];
      expect(icons.length).toBe(7);
    });
  }
});
