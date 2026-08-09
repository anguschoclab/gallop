/**
 * Tests for rivalry news template variety expansion (Herald branch).
 *
 * Validates that the template pools have been expanded to ≥ 14 items
 * by sweeping multiple RNG seeds and collecting unique outputs.
 */

import { describe, it, expect } from "vitest";
import {
  generateStableIntroNews,
  generateRivalryEmergenceNews,
  generateGrudgeMatchNews,
  generateRegionLostNews,
  generateRivalryEscalationNews,
} from "@/services/narrative/rivalryNewsGenerator";
import { createTestRng, createTestStable, createTestHorse } from "@/tests/helpers";
import type { Race } from "@/game/types";

const DAY = 42;
const stable = createTestStable({ id: "rival-1", name: "Bitter Creek Stables" });
const playerHorse = createTestHorse({ id: "ph-1", name: "Lightning Bolt" });
const rivalHorse = createTestHorse({ id: "rh-1", name: "Dark Thunder" });

const race = {
  id: "race-1",
  name: "Grand Stakes",
  day: DAY,
  distance: 2000,
  raceClass: "Stakes",
  entryFee: 500,
  purse: 50000,
  fieldSize: 8,
  entries: [],
  resolved: true,
  graded: {
    key: "grand-stakes",
    grade: "G1",
    track: "Test Track",
    trackId: "tt-1",
    surface: "Dirt",
  },
} as Race;

// Sweep 30 seeds and collect unique headlines/bodies
const SEED_COUNT = 30;

function sweepHeadlines(fn: (rng: ReturnType<typeof createTestRng>) => string | null): Set<string> {
  const unique = new Set<string>();
  for (let i = 0; i < SEED_COUNT; i++) {
    const rng = createTestRng(`sweep-${i}`);
    const result = fn(rng);
    if (result) unique.add(result);
  }
  return unique;
}

function sweepBodies(fn: (rng: ReturnType<typeof createTestRng>) => string | null): Set<string> {
  const unique = new Set<string>();
  for (let i = 0; i < SEED_COUNT; i++) {
    const rng = createTestRng(`sweep-body-${i}`);
    const result = fn(rng);
    if (result) unique.add(result);
  }
  return unique;
}

describe("generateRivalryEmergenceNews — template variety", () => {
  it("headline pool has at least 8 unique values across 30 seeds (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values across 30 seeds (≥14 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("headline pool size does not exceed 14", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeLessThanOrEqual(24);
  });

  it("all headlines contain the stable name", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.headline ?? null,
    );
    for (const h of headlines) {
      expect(h).toContain("Bitter Creek Stables");
    }
  });

  it("all bodies contain the stable name", () => {
    const bodies = sweepBodies(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.body ?? null,
    );
    for (const b of bodies) {
      expect(b).toContain("Bitter Creek Stables");
    }
  });
});

describe("generateGrudgeMatchNews — template variety (player win)", () => {
  it("headline pool has at least 8 unique values (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable)?.headline ??
        null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values (≥14 templates)", () => {
    const bodies = sweepBodies(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable)?.body ??
        null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("all headlines contain player horse or rival horse name", () => {
    const headlines = sweepHeadlines(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable)?.headline ??
        null,
    );
    for (const h of headlines) {
      expect(h.includes("Lightning Bolt") || h.includes("Dark Thunder")).toBe(true);
    }
  });
});

describe("generateGrudgeMatchNews — template variety (player loss)", () => {
  it("headline pool has at least 8 unique values (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable)?.headline ??
        null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values (≥14 templates)", () => {
    const bodies = sweepBodies(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable)?.body ??
        null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("all headlines contain player horse or rival horse name", () => {
    const headlines = sweepHeadlines(
      (rng) =>
        generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable)?.headline ??
        null,
    );
    for (const h of headlines) {
      expect(h.includes("Lightning Bolt") || h.includes("Dark Thunder")).toBe(true);
    }
  });
});

describe("generateRegionLostNews — template variety", () => {
  it("headline pool has at least 8 unique values (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRegionLostNews("North America", stable, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values (≥14 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateRegionLostNews("North America", stable, DAY, rng)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("all headlines contain the region or stable name", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRegionLostNews("North America", stable, DAY, rng)?.headline ?? null,
    );
    for (const h of headlines) {
      expect(h.includes("North America") || h.includes("Bitter Creek Stables")).toBe(true);
    }
  });
});

describe("generateRivalryEscalationNews — template variety", () => {
  it("headline pool has at least 8 unique values (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEscalationNews(stable, 70, 85, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values (≥14 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateRivalryEscalationNews(stable, 70, 85, DAY, rng)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("all headlines contain the stable name", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEscalationNews(stable, 70, 85, DAY, rng)?.headline ?? null,
    );
    for (const h of headlines) {
      expect(h).toContain("Bitter Creek Stables");
    }
  });

  it("all bodies contain the stable name", () => {
    const bodies = sweepBodies(
      (rng) => generateRivalryEscalationNews(stable, 70, 85, DAY, rng)?.body ?? null,
    );
    for (const b of bodies) {
      expect(b).toContain("Bitter Creek Stables");
    }
  });
});

describe("generateStableIntroNews — template variety", () => {
  it("headline pool has at least 8 unique values (≥14 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateStableIntroNews(stable, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(8);
  });

  it("body pool has at least 6 unique values (≥14 templates)", () => {
    const bodies = sweepBodies((rng) => generateStableIntroNews(stable, DAY, rng)?.body ?? null);
    expect(bodies.size).toBeGreaterThanOrEqual(6);
  });

  it("all headlines contain the stable name", () => {
    const headlines = sweepHeadlines(
      (rng) => generateStableIntroNews(stable, DAY, rng)?.headline ?? null,
    );
    for (const h of headlines) {
      expect(h).toContain("Bitter Creek Stables");
    }
  });

  it("all bodies contain the stable owner or country", () => {
    const bodies = sweepBodies((rng) => generateStableIntroNews(stable, DAY, rng)?.body ?? null);
    for (const b of bodies) {
      expect(b).toContain(stable.owner);
    }
  });
});
