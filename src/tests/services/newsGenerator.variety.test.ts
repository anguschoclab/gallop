/**
 * Tests for newsGenerator template variety after herald branch union.
 * Validates that the combined template pool produces diverse output.
 */

import { describe, it, expect } from "vitest";
import {
  generateRaceNews,
  generateMarketNews,
  generateFlavorNews,
} from "@/services/narrative/newsGenerator";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import type { Race } from "@/game/types";

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
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
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("newsGenerator template variety (herald union)", () => {
  describe("generateRaceNews", () => {
    it("produces headlines from the combined pool (22+ templates)", () => {
      const race = mkRace();
      const horses = [createTestHorse({ id: "horse-1", name: "Secretariat" })];
      const result = [{ horseId: "horse-1", position: 1 }];

      const headlines = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateRaceNews(race, result, horses, 10, rng);
        if (news) headlines.add(news.headline);
      }

      expect(headlines.size).toBeGreaterThan(10);
    });

    it("all headlines contain winner name or race name", () => {
      const race = mkRace();
      const horses = [createTestHorse({ id: "horse-1", name: "Secretariat" })];
      const result = [{ horseId: "horse-1", position: 1 }];

      for (let i = 0; i < 100; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateRaceNews(race, result, horses, 10, rng);
        if (news) {
          expect(
            news.headline.includes("Secretariat") || news.headline.includes("Kentucky Derby"),
          ).toBe(true);
        }
      }
    });
  });

  describe("generateMarketNews", () => {
    it("produces headlines from combined pool (17+ templates)", () => {
      const horse = createTestHorse({ id: "horse-1", name: "Thunder" });

      const headlines = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateMarketNews(horse, 750000, 10, rng);
        headlines.add(news.headline);
      }

      expect(headlines.size).toBeGreaterThan(8);
    });

    it("all headlines contain horse name or price", () => {
      const horse = createTestHorse({ id: "horse-1", name: "Thunder" });

      for (let i = 0; i < 100; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateMarketNews(horse, 750000, 10, rng);
        expect(
          news.headline.includes("Thunder") || news.headline.includes("750,000"),
        ).toBe(true);
      }
    });

    it("importance is 'high' when price > 500000", () => {
      const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
      const rng = createTestRng();
      const news = generateMarketNews(horse, 750000, 10, rng);
      expect(news.importance).toBe("high");
    });

    it("importance is 'medium' when price <= 500000", () => {
      const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
      const rng = createTestRng();
      const news = generateMarketNews(horse, 300000, 10, rng);
      expect(news.importance).toBe("medium");
    });
  });

  describe("generateFlavorNews", () => {
    it("produces stories from combined pool (22+ templates)", () => {
      const headlines = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateFlavorNews(10, rng);
        headlines.add(news.headline);
      }

      expect(headlines.size).toBeGreaterThan(10);
    });

    it("all stories have headline, body, and category", () => {
      for (let i = 0; i < 50; i++) {
        const rng = createTestRng(`seed-${i}`);
        const news = generateFlavorNews(10, rng);
        expect(news.headline).toBeTruthy();
        expect(news.body).toBeTruthy();
        expect(news.category).toBe("flavor");
      }
    });
  });
});
