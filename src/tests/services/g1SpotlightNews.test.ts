import { describe, it, expect } from "vitest";
import { generateG1SpotlightNews } from "@/services/narrative/newsGenerator";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";
import type { Race } from "@/game/types";

function createG1Race(overrides?: Partial<Race>): Race {
  return {
    id: "race-g1-1",
    name: "Kentucky Derby",
    graded: {
      key: "ky-derby",
      grade: "G1",
      track: "Churchill Downs",
      trackId: "churchill-downs",
      surface: "Dirt",
    },
    raceClass: "Stakes",
    day: 10,
    distance: 2000,
    entryFee: 500,
    purse: 100000,
    minStat: 70,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

function createG2Race(): Race {
  return createG1Race({
    id: "race-g2-1",
    name: "Breeders' Cup Mile",
    graded: {
      key: "bc-mile",
      grade: "G2",
      track: "Santa Anita",
      trackId: "santa-anita",
      surface: "Turf",
    },
  });
}

function createEliteHorse(id = "elite-horse", name = "Thunder Strike"): ReturnType<typeof createTestHorse> {
  return createTestHorse({
    id,
    name,
    stats: {
      speed: 92,
      stamina: 91,
      acceleration: 90,
      consistency: 89,
      temperament: 50,
      conformation: 50,
    },
  });
}

function createAverageHorse(id = "avg-horse", name = "Average Joe"): ReturnType<typeof createTestHorse> {
  return createTestHorse({
    id,
    name,
    stats: {
      speed: 75,
      stamina: 74,
      acceleration: 73,
      consistency: 72,
      temperament: 50,
      conformation: 50,
    },
  });
}

describe("generateG1SpotlightNews", () => {
  it("generates news for a G1 win with overall rating >= 90", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    expect(news!.category).toBe("racing");
    expect(news!.importance).toBe("high");
    expect(news!.day).toBe(10);
  });

  it("mentions the horse's overall rating in the headline", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    // Overall rating should be 90 or 91 depending on rounding
    const rating = Math.round((92 + 91 + 90 + 89) / 4);
    expect(news!.headline).toContain(String(rating));
  });

  it("mentions the overall rating in the body", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    const rating = Math.round((92 + 91 + 90 + 89) / 4);
    expect(news!.body).toContain(String(rating));
  });

  it("mentions the horse name in headline and body", () => {
    const race = createG1Race();
    const horse = createEliteHorse("h1", "Lightning Bolt");
    const result = [{ horseId: "h1", position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Lightning Bolt");
    expect(news!.body).toContain("Lightning Bolt");
  });

  it("mentions the race name in headline or body", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    const text = `${news!.headline} ${news!.body}`;
    expect(text).toContain("Kentucky Derby");
  });

  it("returns null for a G2 race even with rating >= 90", () => {
    const race = createG2Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).toBeNull();
  });

  it("returns null for a G1 win with overall rating < 90", () => {
    const race = createG1Race();
    const horse = createAverageHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).toBeNull();
  });

  it("returns null for a non-graded race", () => {
    const race = createG1Race({ graded: undefined, raceClass: "Maiden" });
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).toBeNull();
  });

  it("returns null when there is no winner", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 2 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).toBeNull();
  });

  it("returns null when winner is not found in horses array", () => {
    const race = createG1Race();
    const result = [{ horseId: "missing-horse", position: 1 }];

    const news = generateG1SpotlightNews(race, result, [], 10, createTestRng());

    expect(news).toBeNull();
  });

  it("works with Map<string, Horse> for horses parameter", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];
    const horseMap = new Map([[horse.id, horse]]);

    const news = generateG1SpotlightNews(race, result, horseMap, 10, createTestRng());

    expect(news).not.toBeNull();
    expect(news!.headline).toContain(horse.name);
  });

  it("includes entityLinks for horse and race", () => {
    const race = createG1Race();
    const horse = createEliteHorse("h-123", "Champion X");
    const result = [{ horseId: "h-123", position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    expect(news!.entityLinks).toBeDefined();
    expect(news!.entityLinks).toHaveLength(2);
    expect(news!.entityLinks!).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "horse", id: "h-123", name: "Champion X" }),
        expect.objectContaining({ type: "race", id: "race-g1-1", name: "Kentucky Derby" }),
      ]),
    );
  });

  it("generates a valid UUID for the news item id", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const rng1 = createTestRng();
    const rng2 = createTestRng();

    const news1 = generateG1SpotlightNews(race, result, [horse], 10, rng1);
    const news2 = generateG1SpotlightNews(race, result, [horse], 10, rng2);

    expect(news1).toEqual(news2);
  });

  it("produces different headlines with different seeds", () => {
    const race = createG1Race();
    const horse = createEliteHorse();
    const result = [{ horseId: horse.id, position: 1 }];

    const news1 = generateG1SpotlightNews(race, result, [horse], 10, createTestRng("seed-1"));
    const news2 = generateG1SpotlightNews(race, result, [horse], 10, createTestRng("seed-2"));

    expect(news1).not.toBeNull();
    expect(news2).not.toBeNull();
    // IDs will differ due to different RNG state
    expect(news1!.id).not.toBe(news2!.id);
  });

  it("fires at exactly rating 90", () => {
    const race = createG1Race();
    const horse = createTestHorse({
      id: "exact-90",
      name: "Mr Ninety",
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = [{ horseId: "exact-90", position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).not.toBeNull();
    expect(news!.headline).toContain("90");
  });

  it("does not fire at rating 89", () => {
    const race = createG1Race();
    const horse = createTestHorse({
      id: "rating-89",
      name: "Almost Elite",
      stats: {
        speed: 89,
        stamina: 89,
        acceleration: 89,
        consistency: 89,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = [{ horseId: "rating-89", position: 1 }];

    const news = generateG1SpotlightNews(race, result, [horse], 10, createTestRng());

    expect(news).toBeNull();
  });
});
