/**
 * inboxDramaFlow.test.ts — End-to-end inbox drama-alert flow.
 *
 * Simulates a storm pattern jump on a Graded race day, runs the weatherPhase,
 * pipes the resulting `inbox_message` impacts through `InboxHandler` to mutate
 * a draft state, and verifies the unread-badge count and filter results that
 * the `/inbox` route consumes.
 */
import { describe, it, expect } from "vitest";
import { produce } from "immer";
import { weatherPhase } from "@/core/time/phases/weatherPhase";
import { InboxHandler } from "@/core/resolver/handlers/InboxHandler";
import { stepWeather, PATTERN_SEVERITY, type WeatherState } from "@/core/weather";
import { createRng } from "@/core/common/rng";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

const TRACK_ID = "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"; // Churchill Downs

function findDramaDay() {
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
  throw new Error("No drama day found");
}

describe("Inbox drama-alert flow — weatherPhase → InboxHandler → /inbox state", () => {
  it("storm jump on Derby day produces an unread action message visible in filters", () => {
    const { yesterday, dayToday } = findDramaDay();

    const ctx: any = {
      previousDay: dayToday - 1,
      newDay: dayToday,
      state: {
        day: dayToday,
        inbox: [
          // Pre-existing read info message — should not pollute unread count.
          {
            id: "old-1",
            day: dayToday - 5,
            readAt: dayToday - 4,
            category: "system",
            priority: "info",
            title: "Welcome",
            body: "Old news.",
          },
        ],
        races: r2r([
          {
            id: "race-derby",
            name: "Kentucky Derby",
            day: dayToday,
            distance: 2000,
            raceClass: "G1" as any,
            entryFee: 0,
            purse: 3_000_000,
            fieldSize: 12,
            entries: [],
            resolved: false,
            trackId: TRACK_ID,
            trackCondition: "fast",
            graded: {
              key: "kentucky-derby",
              grade: "G1",
              track: "Churchill Downs",
              trackId: TRACK_ID,
              surface: "Dirt",
            },
          },
        ]),
        log: [],
        weather: { byTrack: { [TRACK_ID]: [yesterday] }, forecast: {} },
      },
      logs: [],
      dailyRng: createRng(1),
      intents: [],
      impacts: [],
      impactLog: [],
    };

    const out = weatherPhase.execute(ctx);
    const inboxImpacts = out.impacts.filter((i: any) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);

    // Apply impact via InboxHandler → mutate inbox via immer draft.
    const handler = new InboxHandler();
    const finalState = produce(out.state as any, (draft: any) => {
      for (const impact of inboxImpacts) handler.handle(draft, impact);
    }) as any;

    // Unread badge count (logic mirrors AppShell):
    const unread = finalState.inbox.filter((m: any) => !m.readAt).length;
    expect(unread).toBe(1);

    // "Action Required" filter (route /inbox):
    const actionRequired = finalState.inbox.filter((m: any) => m.priority !== "info");
    expect(actionRequired.length).toBe(1);
    expect(actionRequired[0].title).toBe("Weather Alert");
    expect(actionRequired[0].category).toBe("system");
    expect(actionRequired[0].cta?.params?.raceId).toBe("race-derby");

    // "Unread" filter:
    const unreadMessages = finalState.inbox.filter((m: any) => !m.readAt);
    expect(unreadMessages[0].body).toMatch(/Kentucky Derby/);
  });
});
