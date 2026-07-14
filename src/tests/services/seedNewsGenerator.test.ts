import { describe, it, expect } from "vitest";
import { seedGazetteNews } from "@/services/narrative/seedNewsGenerator";
import { createTestHorse, createTestStable, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";
import type { NewsCategory, NewsImportance } from "@/services/narrative/newsTypes";
import type { Race, Stable, Horse } from "@/game/types";
import type { PlayerProfile } from "@/core/stable/types";

const VALID_CATEGORIES: NewsCategory[] = ["racing", "market", "stable", "flavor", "milestone"];
const VALID_IMPORTANCE: NewsImportance[] = ["high", "medium", "low"];

function buildTestStables(n: number): Stable[] {
  return Array.from({ length: n }, (_, i) =>
    createTestStable({
      id: `stable-${i + 1}`,
      name: `Elite Stable ${i + 1}`,
      owner: `Owner ${i + 1}`,
      tier: "elite",
      isMajor: true,
      reputation: 90 - i * 5,
      description: `A prestigious stable with a rich history. Stable ${i + 1} has produced champions for decades.`,
      country: "USA",
    }),
  );
}

function buildTestNpcHorses(n: number): Horse[] {
  return Array.from({ length: n }, (_, i) =>
    createTestHorse({
      id: `npc-horse-${i + 1}`,
      name: `NPC Horse ${i + 1}`,
      owned: false,
      stableId: `stable-${(i % 7) + 1}`,
      age: 3 + (i % 5),
      fame: 80 - i * 3,
      stats: {
        speed: 85 - i * 2,
        stamina: 84 - i * 2,
        acceleration: 83 - i * 2,
        consistency: 82 - i * 2,
        temperament: 50,
        conformation: 50,
      },
      bloodline: i % 3 === 0 ? "Northern Dancer" : i % 3 === 1 ? "Mr. Prospector" : "Galileo",
      lifetimeEarnings: 1000000 - i * 50000,
    }),
  );
}

function buildTestRaces(): Race[] {
  const races: Race[] = [];
  for (let i = 0; i < 15; i++) {
    races.push({
      id: `race-${i + 1}`,
      name: `Test Race ${i + 1}`,
      day: 5 + i * 3,
      distance: 2000,
      raceClass: "Stakes",
      entryFee: 500,
      purse: 100000,
      fieldSize: 8,
      entries: [],
      resolved: false,
      graded:
        i % 5 === 0
          ? { key: `g1-${i}`, grade: "G1", track: "Track A", surface: "Dirt" }
          : i % 5 === 1
            ? { key: `g2-${i}`, grade: "G2", track: "Track B", surface: "Turf" }
            : i % 5 === 2
              ? { key: `g3-${i}`, grade: "G3", track: "Track C", surface: "Dirt" }
              : undefined,
    } as Race);
  }
  return races;
}

function buildTestProfile(): PlayerProfile {
  return {
    stableName: "Thunder Ranch",
    ownerName: "John Doe",
    silk: { pattern: "solid", primary: "#FF0000", secondary: "#FFFFFF", cap: "#000000" },
    backstoryId: "inheritor",
    founded: 1,
    country: "USA",
  };
}

describe("seedGazetteNews", () => {
  // Test Group 1 — Output shape
  describe("Output shape", () => {
    it("1.1 — Empty inputs still produce ≥1 article (season opener)", () => {
      const result = seedGazetteNews([], [], [], undefined, createTestRng());
      expect(result.news.length).toBeGreaterThanOrEqual(1);
    });

    it("1.2 — Full world data (7 elite stables, 20 horses, 15 races) produces 6+N articles", () => {
      const stables = buildTestStables(7);
      const horses = buildTestNpcHorses(20);
      const races = buildTestRaces();
      const result = seedGazetteNews(stables, horses, races, buildTestProfile(), createTestRng());
      expect(result.news.length).toBe(13);
    });

    it("1.3 — All items have id, day, category, headline, body, importance", () => {
      const stables = buildTestStables(7);
      const horses = buildTestNpcHorses(20);
      const races = buildTestRaces();
      const result = seedGazetteNews(stables, horses, races, buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(item.id).toBeTruthy();
        expect(item.day).toBeDefined();
        expect(item.category).toBeTruthy();
        expect(item.headline).toBeTruthy();
        expect(item.body).toBeTruthy();
        expect(item.importance).toBeTruthy();
      }
    });

    it("1.4 — All items have day === 1", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(item.day).toBe(1);
      }
    });

    it("1.5 — All IDs are unique", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const ids = result.news.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("1.6 — importance values are valid NewsImportance literals", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(VALID_IMPORTANCE).toContain(item.importance);
      }
    });

    it("1.7 — category values are valid NewsCategory literals", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(VALID_CATEGORIES).toContain(item.category);
      }
    });

    it("1.8 — introStableIds contains IDs of all elite+isMajor stables", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const s of stables) {
        expect(result.introStableIds).toContain(s.id);
      }
    });

    it("1.9 — All IDs are valid UUIDs", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(isValidUUID(item.id)).toBe(true);
      }
    });
  });

  // Test Group 2 — Determinism
  describe("Determinism", () => {
    it("2.1 — Same seed → identical output", () => {
      const stables = buildTestStables(7);
      const horses = buildTestNpcHorses(20);
      const races = buildTestRaces();
      const profile = buildTestProfile();

      const r1 = seedGazetteNews(stables, horses, races, profile, createTestRng("seed-x"));
      const r2 = seedGazetteNews(stables, horses, races, profile, createTestRng("seed-x"));
      expect(r1).toEqual(r2);
    });

    it("2.2 — Different seed → different IDs", () => {
      const stables = buildTestStables(7);
      const horses = buildTestNpcHorses(20);
      const races = buildTestRaces();
      const profile = buildTestProfile();

      const r1 = seedGazetteNews(stables, horses, races, profile, createTestRng("seed-a"));
      const r2 = seedGazetteNews(stables, horses, races, profile, createTestRng("seed-b"));
      expect(r1.news[0].id).not.toBe(r2.news[0].id);
    });

    it("2.3 — Undefined playerProfile: still produces articles, no crash", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), undefined, createTestRng());
      expect(result.news.length).toBeGreaterThan(0);
    });
  });

  // Test Group 3 — Slot A: Season Opener
  describe("Slot A: Season Opener", () => {
    it("3.1 — Exactly 1 flavor/high item", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const seasonOpeners = result.news.filter((n) => n.category === "flavor" && n.importance === "high");
      expect(seasonOpeners.length).toBe(1);
    });

    it("3.2 — When playerProfile.stableName is set, headline or body contains it", () => {
      const profile = buildTestProfile();
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), profile, createTestRng());
      const seasonOpener = result.news.find((n) => n.category === "flavor" && n.importance === "high");
      expect(seasonOpener).toBeDefined();
      const text = `${seasonOpener!.headline} ${seasonOpener!.body}`;
      expect(text).toContain("Thunder Ranch");
    });

    it("3.3 — When playerProfile is undefined, article still generated with generic text", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), undefined, createTestRng());
      const seasonOpener = result.news.find((n) => n.category === "flavor" && n.importance === "high");
      expect(seasonOpener).toBeDefined();
      expect(seasonOpener!.headline.length).toBeGreaterThan(0);
    });
  });

  // Test Group 4 — Slot B: Rival Intros
  describe("Slot B: Rival Intros", () => {
    it("4.1 — N items with category=stable and importance=low", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      expect(intros.length).toBe(7);
    });

    it("4.2 — Each article headline contains its stable name", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      for (const intro of intros) {
        const stable = stables.find((s) => intro.entityLinks?.some((el) => el.id === s.id));
        expect(stable).toBeDefined();
        expect(intro.headline).toContain(stable!.name);
      }
    });

    it("4.3 — Each article body contains stable owner name", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      for (const intro of intros) {
        const stable = stables.find((s) => intro.entityLinks?.some((el) => el.id === s.id));
        expect(stable).toBeDefined();
        expect(intro.body).toContain(stable!.owner);
      }
    });

    it("4.4 — With 0 elite stables: 0 intro articles, no crash", () => {
      const result = seedGazetteNews([], buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      expect(intros.length).toBe(0);
    });

    it("4.5 — With 1 elite stable: exactly 1 intro article", () => {
      const stables = buildTestStables(1);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      expect(intros.length).toBe(1);
    });

    it("4.6 — With 7 elite stables: exactly 7 intro articles", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      expect(intros.length).toBe(7);
    });

    it("4.7 — Stables ordered by reputation desc (first intro has highest reputation)", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const intros = result.news.filter((n) => n.category === "stable" && n.importance === "low");
      const firstStableId = intros[0].entityLinks?.find((el) => el.type === "stable")?.id;
      const firstStable = stables.find((s) => s.id === firstStableId);
      expect(firstStable?.reputation).toBe(90); // highest reputation
    });

    it("4.8 — introStableIds matches the stables that got articles", () => {
      const stables = buildTestStables(7);
      const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const introStableIdsFromNews = result.news
        .filter((n) => n.category === "stable" && n.importance === "low")
        .map((n) => n.entityLinks?.find((el) => el.type === "stable")?.id)
        .sort();
      expect(result.introStableIds.sort()).toEqual(introStableIdsFromNews);
    });

    it("4.9 — Body contains country when set; fallback string when undefined", () => {
      const stables = buildTestStables(1);
      const result = seedGazetteNews(stables, [], [], buildTestProfile(), createTestRng());
      const intro = result.news.find((n) => n.category === "stable" && n.importance === "low");
      expect(intro).toBeDefined();
      expect(intro!.body).toContain("USA");

      const stablesNoCountry = [createTestStable({ id: "s-nc", name: "No Country Stable", owner: "NC Owner", tier: "elite", isMajor: true, reputation: 80, country: undefined, description: "Desc" })];
      const result2 = seedGazetteNews(stablesNoCountry, [], [], buildTestProfile(), createTestRng());
      const intro2 = result2.news.find((n) => n.category === "stable" && n.importance === "low");
      expect(intro2).toBeDefined();
      expect(intro2!.body.length).toBeGreaterThan(0);
    });

    it("4.10 — Body contains description when set; fallback string when undefined", () => {
      const stablesNoDesc = [createTestStable({ id: "s-nd", name: "No Desc Stable", owner: "ND Owner", tier: "elite", isMajor: true, reputation: 80, country: "UK", description: undefined })];
      const result = seedGazetteNews(stablesNoDesc, [], [], buildTestProfile(), createTestRng());
      const intro = result.news.find((n) => n.category === "stable" && n.importance === "low");
      expect(intro).toBeDefined();
      expect(intro!.body.length).toBeGreaterThan(0);
    });

    it("4.11 — entityLinks contains { type: 'stable', id, name }", () => {
      const stables = buildTestStables(1);
      const result = seedGazetteNews(stables, [], [], buildTestProfile(), createTestRng());
      const intro = result.news.find((n) => n.category === "stable" && n.importance === "low");
      expect(intro).toBeDefined();
      expect(intro!.entityLinks).toBeDefined();
      expect(intro!.entityLinks).toContainEqual(expect.objectContaining({ type: "stable", id: stables[0].id, name: stables[0].name }));
    });
  });

  // Test Group 5 — Slot C: Power Rankings
  describe("Slot C: Power Rankings", () => {
    it("5.1 — Exactly 1 racing/high item (power rankings)", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const powerRankings = result.news.filter((n) => n.category === "racing" && n.importance === "high" && n.headline.toLowerCase().includes("power"));
      expect(powerRankings.length).toBe(1);
    });

    it("5.2 — Article body contains name of highest-rated horse", () => {
      const horses = buildTestNpcHorses(20);
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const powerRanking = result.news.find((n) => n.category === "racing" && n.importance === "high" && n.headline.toLowerCase().includes("power"));
      expect(powerRanking).toBeDefined();
      expect(powerRanking!.body).toContain("NPC Horse 1"); // highest rated
    });

    it("5.3 — With 0 NPC horses: article skipped, no crash", () => {
      const result = seedGazetteNews(buildTestStables(7), [], buildTestRaces(), buildTestProfile(), createTestRng());
      const powerRankings = result.news.filter((n) => n.category === "racing" && n.importance === "high" && n.headline.toLowerCase().includes("power"));
      expect(powerRankings.length).toBe(0);
    });

    it("5.4 — With <5 NPC horses: article still generated with available horses", () => {
      const horses = buildTestNpcHorses(3);
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const powerRankings = result.news.filter((n) => n.category === "racing" && n.importance === "high" && n.headline.toLowerCase().includes("power"));
      expect(powerRankings.length).toBe(1);
    });

    it("5.5 — Only NPC horses included (not player horses)", () => {
      const npcHorses = buildTestNpcHorses(5);
      const playerHorse = createTestHorse({ id: "player-horse", name: "Player Horse", owned: true, stableId: undefined, stats: { speed: 99, stamina: 99, acceleration: 99, consistency: 99, temperament: 50, conformation: 50 } });
      const result = seedGazetteNews(buildTestStables(7), [...npcHorses, playerHorse], buildTestRaces(), buildTestProfile(), createTestRng());
      const powerRanking = result.news.find((n) => n.category === "racing" && n.importance === "high" && n.headline.toLowerCase().includes("power"));
      expect(powerRanking).toBeDefined();
      expect(powerRanking!.body).not.toContain("Player Horse");
    });
  });

  // Test Group 6 — Slot D: G1 Spotlight
  describe("Slot D: G1 Spotlight", () => {
    it("6.1 — 1 racing/high item containing G1 race name", () => {
      const races = buildTestRaces();
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const g1Spotlights = result.news.filter((n) => n.category === "racing" && n.importance === "high" && !n.headline.toLowerCase().includes("power"));
      expect(g1Spotlights.length).toBe(1);
      const g1Race = races.find((r) => r.graded?.grade === "G1");
      expect(g1Race).toBeDefined();
      const text = `${g1Spotlights[0].headline} ${g1Spotlights[0].body}`;
      expect(text).toContain(g1Race!.name);
    });

    it("6.2 — entityLinks contains { type: 'race', id, name }", () => {
      const races = buildTestRaces();
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const g1Spotlight = result.news.find((n) => n.category === "racing" && n.importance === "high" && !n.headline.toLowerCase().includes("power"));
      expect(g1Spotlight).toBeDefined();
      expect(g1Spotlight!.entityLinks).toBeDefined();
      const raceLink = g1Spotlight!.entityLinks!.find((el) => el.type === "race");
      expect(raceLink).toBeDefined();
      expect(raceLink!.name).toBeTruthy();
    });

    it("6.3 — Picks nearest G1 by day (not last)", () => {
      const races = buildTestRaces();
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const g1Spotlight = result.news.find((n) => n.category === "racing" && n.importance === "high" && !n.headline.toLowerCase().includes("power"));
      expect(g1Spotlight).toBeDefined();
      const g1Races = races.filter((r) => r.graded?.grade === "G1").sort((a, b) => a.day - b.day);
      const nearestG1 = g1Races[0];
      const raceLink = g1Spotlight!.entityLinks!.find((el) => el.type === "race");
      expect(raceLink!.id).toBe(nearestG1.id);
    });

    it("6.4 — With no G1 races: slot skipped, no crash", () => {
      const races = buildTestRaces().map((r) => r.graded?.grade === "G1" ? { ...r, graded: { ...r.graded!, grade: "G3" as const } } : r);
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const g1Spotlights = result.news.filter((n) => n.category === "racing" && n.importance === "high" && !n.headline.toLowerCase().includes("power"));
      expect(g1Spotlights.length).toBe(0);
    });
  });

  // Test Group 7 — Slot E: Graded Preview
  describe("Slot E: Graded Preview", () => {
    it("7.1 — 1 racing/medium item", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const previews = result.news.filter((n) => n.category === "racing" && n.importance === "medium");
      expect(previews.length).toBe(1);
    });

    it("7.2 — Prefers G2 over G3 when both exist after G1", () => {
      const races = buildTestRaces();
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const preview = result.news.find((n) => n.category === "racing" && n.importance === "medium");
      expect(preview).toBeDefined();
      const raceLink = preview!.entityLinks?.find((el) => el.type === "race");
      expect(raceLink).toBeDefined();
      const previewRace = races.find((r) => r.id === raceLink!.id);
      expect(previewRace?.graded?.grade).toBe("G2");
    });

    it("7.3 — With no graded races after G1: slot skipped, no crash", () => {
      const races: Race[] = [
        { id: "r1", name: "Only G1", day: 5, distance: 2000, raceClass: "Stakes", entryFee: 500, purse: 100000, fieldSize: 8, entries: [], resolved: false, graded: { key: "g1", grade: "G1", track: "T", surface: "Dirt" } } as Race,
      ];
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), races, buildTestProfile(), createTestRng());
      const previews = result.news.filter((n) => n.category === "racing" && n.importance === "medium");
      expect(previews.length).toBe(0);
    });
  });

  // Test Group 8 — Slot F: Bloodline Insight
  describe("Slot F: Bloodline Insight", () => {
    it("8.1 — 1 flavor/low item (bloodline)", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      const bloodlineItems = result.news.filter((n) => n.category === "flavor" && n.importance === "low" && n.headline.toLowerCase().includes("bloodline"));
      expect(bloodlineItems.length).toBe(1);
    });

    it("8.2 — Article contains the mode bloodline string", () => {
      const horses = buildTestNpcHorses(20);
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const bloodlineItem = result.news.find((n) => n.category === "flavor" && n.importance === "low" && n.headline.toLowerCase().includes("bloodline"));
      expect(bloodlineItem).toBeDefined();
      // With 20 horses and 3 bloodlines (7 Northern Dancer, 7 Mr. Prospector, 6 Galileo), mode is Northern Dancer or Mr. Prospector
      const text = `${bloodlineItem!.headline} ${bloodlineItem!.body}`;
      const bloodlines = ["Northern Dancer", "Mr. Prospector", "Galileo"];
      const found = bloodlines.some((b) => text.includes(b));
      expect(found).toBe(true);
    });

    it("8.3 — With no elite horses: falls back to all NPC horses", () => {
      const horses = buildTestNpcHorses(5).map((h) => ({ ...h, stats: { ...h.stats, speed: 50, stamina: 50, acceleration: 50, consistency: 50 } }));
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const bloodlineItems = result.news.filter((n) => n.category === "flavor" && n.importance === "low" && n.headline.toLowerCase().includes("bloodline"));
      expect(bloodlineItems.length).toBe(1);
    });

    it("8.4 — With no horses at all: slot skipped, no crash", () => {
      const result = seedGazetteNews(buildTestStables(7), [], buildTestRaces(), buildTestProfile(), createTestRng());
      const bloodlineItems = result.news.filter((n) => n.category === "flavor" && n.importance === "low" && n.headline.toLowerCase().includes("bloodline"));
      expect(bloodlineItems.length).toBe(0);
    });
  });

  // Test Group 9 — Slot G: Veteran Champion
  describe("Slot G: Veteran Champion", () => {
    it("9.1 — 1 flavor/low item (veteran)", () => {
      const horses = buildTestNpcHorses(20);
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const veterans = result.news.filter((n) => n.category === "flavor" && n.importance === "low" && !n.headline.toLowerCase().includes("bloodline"));
      expect(veterans.length).toBe(1);
    });

    it("9.2 — Article contains name of highest-fame horse age ≥ 6", () => {
      const horses = buildTestNpcHorses(20);
      const veterans = horses.filter((h) => h.age >= 6);
      const expected = veterans.sort((a, b) => b.fame - a.fame)[0];
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const veteranNews = result.news.find((n) => n.category === "flavor" && n.importance === "low" && !n.headline.toLowerCase().includes("bloodline"));
      expect(veteranNews).toBeDefined();
      const text = `${veteranNews!.headline} ${veteranNews!.body}`;
      expect(text).toContain(expected.name);
    });

    it("9.3 — With no veterans (all horses age < 6): slot skipped, no crash", () => {
      const horses = buildTestNpcHorses(20).map((h) => ({ ...h, age: 3 }));
      const result = seedGazetteNews(buildTestStables(7), horses, buildTestRaces(), buildTestProfile(), createTestRng());
      const veterans = result.news.filter((n) => n.category === "flavor" && n.importance === "low" && !n.headline.toLowerCase().includes("bloodline"));
      expect(veterans.length).toBe(0);
    });
  });

  // Test Group 10 — Variety
  describe("Variety", () => {
    it("10.1 — Run 20 seeds; season-opener headlines have ≥4 distinct values", () => {
      const headlines = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng(`variety-${i}`));
        const seasonOpener = result.news.find((n) => n.category === "flavor" && n.importance === "high");
        if (seasonOpener) headlines.add(seasonOpener.headline);
      }
      expect(headlines.size).toBeGreaterThanOrEqual(4);
    });

    it("10.2 — Run 20 seeds; rival intro headlines have ≥4 distinct values for same stable", () => {
      const headlines = new Set<string>();
      const stables = buildTestStables(1);
      for (let i = 0; i < 20; i++) {
        const result = seedGazetteNews(stables, buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng(`variety-intro-${i}`));
        const intro = result.news.find((n) => n.category === "stable" && n.importance === "low");
        if (intro) headlines.add(intro.headline);
      }
      expect(headlines.size).toBeGreaterThanOrEqual(4);
    });

    it("10.3 — No headline contains unreplaced {placeholder} tokens", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(item.headline).not.toMatch(/\{.+\}/);
      }
    });

    it("10.4 — No body string is empty", () => {
      const result = seedGazetteNews(buildTestStables(7), buildTestNpcHorses(20), buildTestRaces(), buildTestProfile(), createTestRng());
      for (const item of result.news) {
        expect(item.body.length).toBeGreaterThan(0);
      }
    });
  });
});
