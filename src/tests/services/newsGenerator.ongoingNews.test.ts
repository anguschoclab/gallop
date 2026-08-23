import { describe, it, expect } from "vitest";
import {
  generateWeeklyFlavorNews,
  generateFollowUpRaceNews,
} from "@/services/narrative/newsGenerator";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";
import type { Race, Horse } from "@/game/types";

function createG1Race(overrides?: Partial<Race>): Race {
  return {
    id: "race-g1-1",
    name: "Kentucky Derby",
    graded: { key: "ky-derby", grade: "G1", track: "Churchill Downs", surface: "Dirt" },
    raceClass: "Stakes",
    day: 10,
    distance: 2000,
    entryFee: 500,
    purse: 100000,
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
    graded: { key: "bc-mile", grade: "G2", track: "Santa Anita", surface: "Turf" },
  });
}

function createG3Race(): Race {
  return createG1Race({
    id: "race-g3-1",
    name: "Sunset Handicap",
    graded: { key: "sunset", grade: "G3", track: "Santa Anita", surface: "Turf" },
  });
}

function createPlayerHorse(id = "player-horse", name = "Thunder Strike"): Horse {
  return createTestHorse({ id, name, ownership: { type: "player" }, stableId: undefined });
}

function createNpcHorse(id = "npc-horse", name = "NPC Runner"): Horse {
  return createTestHorse({
    id,
    name,
    ownership: { type: "npc", stableId: asNpcStableId("npc-stable-1") },
  });
}

describe("generateWeeklyFlavorNews", () => {
  it("11.1 — Returns valid NewsItem with category === 'flavor'", () => {
    const news = generateWeeklyFlavorNews([], 7, createTestRng());
    expect(news).toBeDefined();
    expect(news.category).toBe("flavor");
  });

  it("11.2 — When horses array has entries, body references top-earning horse name", () => {
    const horses = [
      createTestHorse({ id: "h1", name: "Low Earner", lifetimeEarnings: 10000 }),
      createTestHorse({ id: "h2", name: "High Earner", lifetimeEarnings: 5000000 }),
    ];
    const news = generateWeeklyFlavorNews(horses, 7, createTestRng());
    expect(news.body).toContain("High Earner");
  });

  it("11.3 — When horses array is empty, article still generated with generic body", () => {
    const news = generateWeeklyFlavorNews([], 7, createTestRng());
    expect(news).toBeDefined();
    expect(news.body.length).toBeGreaterThan(0);
  });

  it("11.4 — importance === 'low'", () => {
    const news = generateWeeklyFlavorNews([], 7, createTestRng());
    expect(news.importance).toBe("low");
  });

  it("11.5 — Deterministic with same seed", () => {
    const horses = [createTestHorse({ id: "h1", name: "Test Horse", lifetimeEarnings: 100000 })];
    const n1 = generateWeeklyFlavorNews(horses, 7, createTestRng("seed-x"));
    const n2 = generateWeeklyFlavorNews(horses, 7, createTestRng("seed-x"));
    expect(n1).toEqual(n2);
  });

  it("11.6 — Different seed → different headline/body (from pool)", () => {
    const horses = [createTestHorse({ id: "h1", name: "Test Horse", lifetimeEarnings: 100000 })];
    const n1 = generateWeeklyFlavorNews(horses, 7, createTestRng("seed-a"));
    const n2 = generateWeeklyFlavorNews(horses, 7, createTestRng("seed-b"));
    expect(n1.id).not.toBe(n2.id);
  });
});

describe("generateFollowUpRaceNews", () => {
  it("12.1 — Fires for player-owned horse (!stableId) in position 1 of G1", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).not.toBeNull();
  });

  it("12.2 — Fires for player-owned horse in position 3 of G2", () => {
    const race = createG2Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 3, 10, createTestRng());
    expect(news).not.toBeNull();
  });

  it("12.3 — Does NOT fire for position 4", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 4, 10, createTestRng());
    expect(news).toBeNull();
  });

  it("12.4 — Does NOT fire for NPC-owned horse (stableId set)", () => {
    const race = createG1Race();
    const horse = createNpcHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).toBeNull();
  });

  it("12.5 — Does NOT fire for G3 race", () => {
    const race = createG3Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).toBeNull();
  });

  it("12.6 — Does NOT fire for non-graded race", () => {
    const race = createG1Race({ graded: undefined, raceClass: "Maiden" });
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).toBeNull();
  });

  it("12.7 — entityLinks contains horse and race links", () => {
    const race = createG1Race();
    const horse = createPlayerHorse("h-123", "Champion X");
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.entityLinks).toBeDefined();
    expect(news!.entityLinks).toHaveLength(2);
    expect(news!.entityLinks).toContainEqual(
      expect.objectContaining({ type: "horse", id: "h-123", name: "Champion X" }),
    );
    expect(news!.entityLinks).toContainEqual(
      expect.objectContaining({ type: "race", id: "race-g1-1", name: "Kentucky Derby" }),
    );
  });

  it("12.8 — category === 'racing', importance === 'medium'", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 2, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.category).toBe("racing");
    expect(news!.importance).toBe("medium");
  });

  it("12.9 — Headline contains horse name", () => {
    const race = createG1Race();
    const horse = createPlayerHorse("h1", "Lightning Bolt");
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Lightning Bolt");
  });

  it("12.10 — Body contains race name", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.body).toContain("Kentucky Derby");
  });

  it("12.11 — Deterministic with same seed", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const n1 = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng("seed-x"));
    const n2 = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng("seed-x"));
    expect(n1).toEqual(n2);
  });

  it("12.12 — id is valid UUID", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("12.13 — Grammar fix: no body contains 'effort' after the grammar correction", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    for (let i = 0; i < 100; i++) {
      const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng(`seed-${i}`));
      expect(news).not.toBeNull();
      expect(news!.body).not.toContain("effort");
    }
  });

  it("12.14 — Grammar fix: position 1 body reads as 'performance to secure a victory'", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    for (let i = 0; i < 100; i++) {
      const news = generateFollowUpRaceNews(race, horse, 1, 10, createTestRng(`p1-${i}`));
      if (news!.body.includes("performance to secure a")) {
        expect(news!.body).toContain("performance to secure a victory");
        return;
      }
    }
    throw new Error("Did not roll the grammar-corrected body template in 100 tries");
  });

  it("12.15 — Grammar fix: position 2 body reads as 'performance to secure a runner-up finish'", () => {
    const race = createG1Race();
    const horse = createPlayerHorse();
    for (let i = 0; i < 100; i++) {
      const news = generateFollowUpRaceNews(race, horse, 2, 10, createTestRng(`p2-${i}`));
      if (news!.body.includes("performance to secure a")) {
        expect(news!.body).toContain("performance to secure a runner-up finish");
        return;
      }
    }
    throw new Error("Did not roll the grammar-corrected body template in 100 tries");
  });
});
