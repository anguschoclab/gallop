import { describe, it, expect } from "vitest";
import { generateRace } from "@/core/race/generation/raceGen";
import { generateNorthAmericanRaceCard } from "@/core/race/generation/northAmerica";
import { generateEuropeanRaceCard } from "@/core/race/generation/europe";
import { generateAustralianRaceCard } from "@/core/race/generation/australia";
import { generateAsianRaceCard } from "@/core/race/generation/asia";
import { generateSouthAmericanRaceCard } from "@/core/race/generation/southAmerica";
import { createRng } from "@/core/common/rng";
import type { Track } from "@/data/tracks";
import type { Race } from "@/game/types";

function mkTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "test-track-1",
    name: "Test Track",
    country: "USA",
    courses: [
      {
        surface: "Dirt",
        circumference: 2000,
        straightLength: 400,
        sections: [
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
        ],
      },
    ],
    ...overrides,
  };
}

function mkTurfTrack(country: string): Track {
  return mkTrack({
    country,
    courses: [
      {
        surface: "Turf",
        circumference: 2000,
        straightLength: 400,
        sections: [
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
        ],
      },
    ],
  });
}

function filterMaidens(races: Race[]): Race[] {
  return races.filter((r) => r.raceClass.toLowerCase().includes("maiden"));
}

describe("Regional generators produce maiden races with no restrictions", () => {
  it("North American generator maiden has no restrictions", () => {
    const track = mkTrack({ country: "USA" });
    const rng = createRng("na-maiden-test");
    const races = generateNorthAmericanRaceCard(track, 10, 100, rng);
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("European generator maiden has no restrictions", () => {
    const track = mkTurfTrack("UK");
    const rng = createRng("eu-maiden-test");
    const races = generateEuropeanRaceCard(track, 10, 100, rng);
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("Australian generator maiden has no restrictions", () => {
    const track = mkTurfTrack("Australia");
    const rng = createRng("au-maiden-test");
    const races = generateAustralianRaceCard(track, 10, 100, rng);
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("Asian generator maiden has no restrictions", () => {
    const track = mkTurfTrack("Japan");
    const rng = createRng("asia-maiden-test");
    const races = generateAsianRaceCard(track, 10, 100, rng);
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("South American generator maiden has no restrictions", () => {
    const track = mkTrack({ country: "Brazil" });
    const rng = createRng("sa-maiden-test");
    const races = generateSouthAmericanRaceCard(track, 10, 100, rng);
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("Generic generateRace maiden has no restrictions", () => {
    const rng = createRng("generic-maiden-test");
    const races: Race[] = [];
    for (let i = 0; i < 200; i++) {
      races.push(generateRace(10, rng));
    }
    const maidens = filterMaidens(races);
    expect(maidens.length).toBeGreaterThan(0);
    for (const m of maidens) {
      expect(m.restrictions).toBeUndefined();
    }
  });
});
