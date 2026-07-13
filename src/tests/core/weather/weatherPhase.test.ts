/**
 * weatherPhase.test.ts — End-to-end drama-alert flow for the weather phase.
 *
 * Verifies:
 *   1. A ≥2 severity pattern jump on a Graded race day produces an
 *      `inbox_message` impact with category=system, priority=action.
 *   2. The race's trackCondition is updated through calculateConditionChange.
 *   3. The weather buffer + forecast are populated on state.
 */
import { describe, it, expect } from "vitest";
import { weatherPhase } from "@/core/time/phases/weatherPhase";
import { stepWeather, PATTERN_SEVERITY, type WeatherState } from "@/core/weather";
import type { Race } from "@/core/race/types";
import { createRng } from "@/core/common/rng";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

const TRACK_ID = "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"; // Churchill Downs

/** Find a day where stepping from a "clear" yesterday lands a ≥2-pattern jump. */
function findDramaDay(): { yesterday: WeatherState; dayToday: number } {
  for (let day = 2; day < 5000; day++) {
    const yesterday: WeatherState = {
      trackId: TRACK_ID,
      day: day - 1,
      pattern: "clear",
      tempC: 18,
      humidity: 0.6,
      windKph: 12,
    };
    const today = stepWeather(yesterday, TRACK_ID, day);
    if (PATTERN_SEVERITY[today.pattern] - PATTERN_SEVERITY[yesterday.pattern] >= 2) {
      return { yesterday, dayToday: day };
    }
  }
  throw new Error("No drama-jump day found within search horizon");
}

function buildContext(dramaDay: number, yesterday: WeatherState) {
  const race = {
    id: "race-derby",
    name: "Kentucky Derby",
    day: dramaDay,
    distance: 2000,
    raceClass: "G1",
    entryFee: 0,
    purse: 3_000_000,
    fieldSize: 12,
    entries: [],
    resolved: false,
    trackId: TRACK_ID,
    graded: {
      key: "kentucky-derby",
      grade: "G1",
      track: "Churchill Downs",
      trackId: TRACK_ID,
      surface: "Dirt",
    },
    trackCondition: "fast",
  } as unknown as Race;

  return {
    previousDay: dramaDay - 1,
    newDay: dramaDay,
    state: {
      day: dramaDay,
      races: r2r([race]),
      log: [],
      weather: { byTrack: { [TRACK_ID]: [yesterday] }, forecast: {} },
    } as any,
    logs: [],
    dailyRng: createRng(1),
    intents: [],
    impacts: [],
    impactLog: [],
  } as any;
}

describe("weatherPhase — drama alert end-to-end", () => {
  it("emits an inbox_message impact on a ≥2 severity jump for a Graded race", () => {
    const { yesterday, dayToday } = findDramaDay();
    const ctx = buildContext(dayToday, yesterday);

    const out = weatherPhase.execute(ctx);

    const inboxImpacts = out.impacts.filter((i: any) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);

    const msg = (inboxImpacts[0] as any).message;
    expect(msg.category).toBe("system");
    expect(msg.priority).toBe("action");
    expect(msg.title).toMatch(/Weather Alert/);
    expect(msg.body).toMatch(/Kentucky Derby/);
    expect(msg.cta?.route).toBe("race.$raceId");
    expect(msg.cta?.params?.raceId).toBe("race-derby");
  });

  it("updates the race trackCondition through calculateConditionChange", () => {
    const { yesterday, dayToday } = findDramaDay();
    const ctx = buildContext(dayToday, yesterday);

    const out = weatherPhase.execute(ctx);
    const race = Object.values(out.state.races).find((r: any) => r.id === "race-derby");
    expect(race).toBeDefined();
    // Drama jump → wet weather → fast track should degrade off "fast"
    const tiers = ["fast", "good", "soft", "heavy", "yielding"];
    expect(tiers.indexOf(race!.trackCondition!)).toBeGreaterThan(0);
  });

  it("populates the weather buffer and a 7-day forecast on state", () => {
    const { yesterday, dayToday } = findDramaDay();
    const ctx = buildContext(dayToday, yesterday);

    const out = weatherPhase.execute(ctx);
    const weather = (out.state as any).weather;
    expect(weather.byTrack[TRACK_ID].length).toBeGreaterThanOrEqual(2);
    expect(weather.byTrack[TRACK_ID].at(-1).day).toBe(dayToday);
    expect(weather.forecast[TRACK_ID].length).toBe(7);
  });

  it("does NOT emit an inbox message when the jump is <2", () => {
    // Use a quiet day from the same matrix where step likely stays near clear.
    const calm: WeatherState = {
      trackId: TRACK_ID,
      day: 99,
      pattern: "clear",
      tempC: 20,
      humidity: 0.5,
      windKph: 10,
    };
    const today = stepWeather(calm, TRACK_ID, 100);
    if (PATTERN_SEVERITY[today.pattern] - PATTERN_SEVERITY[calm.pattern] >= 2) {
      // Day 100 happened to be dramatic — skip this assertion for that seed.
      return;
    }
    const ctx = buildContext(100, calm);
    const out = weatherPhase.execute(ctx);
    expect(out.impacts.filter((i: any) => i.type === "inbox_message")).toHaveLength(0);
  });
});
