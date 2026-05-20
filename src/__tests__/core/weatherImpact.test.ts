import { describe, it, expect, vi } from "vitest";
import { weatherPhase } from "@/core/time/phases/weatherPhase";
import * as weatherSim from "@/core/weather";
import type { PipelineContext } from "@/core/time/pipeline";

// Mock the weather sim functions to control outcomes
vi.mock("@/core/weather", async () => {
  const actual = await vi.importActual("@/core/weather");
  return {
    ...actual,
    stepWeather: vi.fn(),
    getTrackClimate: vi.fn(() => "temperate"),
  };
});

describe("Weather Phase - Storm Jump Logic", () => {
  const mockContext = (overrides = {}): PipelineContext => ({
    newDay: 10,
    state: {
      day: 9,
      races: [
        {
          id: "race-1",
          name: "The G1 Storm Stakes",
          day: 10,
          trackId: "track-1",
          graded: { grade: "G1", track: "Track 1" },
          entries: [],
          resolved: false,
        },
        {
          id: "race-2",
          name: "The G2 Thunder Plate",
          day: 10,
          trackId: "track-2",
          graded: { grade: "G2", track: "Track 2" },
          entries: [],
          resolved: false,
        }
      ],
      weather: {
        byTrack: {
          "track-1": [{ day: 9, pattern: "clear", trackId: "track-1", tempC: 20, humidity: 0.5 }],
          "track-2": [{ day: 9, pattern: "clear", trackId: "track-2", tempC: 20, humidity: 0.5 }],
        },
        forecast: {},
      },
      log: [],
      horses: [],
    } as any,
    impacts: [],
    ...overrides,
  });

  it("generates multiple inbox messages when multiple tracks have storm jumps", () => {
    // Force a jump from clear (0) to storm (4) for both tracks
    (weatherSim.stepWeather as any).mockImplementation((last: any, trackId: string, day: number) => ({
      trackId,
      day,
      pattern: "storm",
      tempC: 15,
      humidity: 0.9,
    }));

    const result = weatherPhase.execute(mockContext());

    const messages = result.impacts.filter(i => i.type === "inbox_message");
    expect(messages.length).toBe(2);
    
    // Verify aggregation properties (priority and category)
    messages.forEach(m => {
      expect(m.message.priority).toBe("action");
      expect(m.message.category).toBe("system");
      expect(m.message.title).toBe("Weather Alert");
      expect(m.message.body).toContain("Storm forecast");
    });

    // Verify track-specific info in body
    expect(messages[0].message.body).toContain("Track 1");
    expect(messages[1].message.body).toContain("Track 2");
  });

  it("does NOT generate alert if the jump is < 2", () => {
    // Jump from clear (0) to overcast (1)
    (weatherSim.stepWeather as any).mockImplementation((last: any, trackId: string, day: number) => ({
      trackId,
      day,
      pattern: "overcast",
      tempC: 18,
      humidity: 0.6,
    }));

    const result = weatherPhase.execute(mockContext());
    const messages = result.impacts.filter(i => i.type === "inbox_message");
    expect(messages.length).toBe(0);
  });

  it("does NOT generate alert for non-graded races", () => {
    (weatherSim.stepWeather as any).mockImplementation((last: any, trackId: string, day: number) => ({
      trackId,
      day,
      pattern: "storm",
      tempC: 15,
      humidity: 0.9,
    }));

    const context = mockContext();
    // Remove grading from race 1
    delete context.state.races[0].graded;
    // Remove race 2
    context.state.races = [context.state.races[0]];

    const result = weatherPhase.execute(context);
    const messages = result.impacts.filter(i => i.type === "inbox_message");
    expect(messages.length).toBe(0);
  });
});
