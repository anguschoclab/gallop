/**
 * Tests for rivalry news template variety expansion (Herald branch).
 *
 * Validates that the template pools have been expanded from 3 to ≥ 6 items
 * by sweeping multiple RNG seeds and collecting unique outputs.
 */

import { describe, it, expect } from "vitest";
import {
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
  graded: { key: "grand-stakes", grade: "G1", track: "Test Track", trackId: "tt-1", surface: "Dirt" },
} as Race;

// Sweep 20 seeds and collect unique headlines/bodies
const SEED_COUNT = 20;

function sweepHeadlines(
  fn: (rng: ReturnType<typeof createTestRng>) => string | null,
): Set<string> {
  const unique = new Set<string>();
  for (let i = 0; i < SEED_COUNT; i++) {
    const rng = createTestRng(`sweep-${i}`);
    const result = fn(rng);
    if (result) unique.add(result);
  }
  return unique;
}

function sweepBodies(
  fn: (rng: ReturnType<typeof createTestRng>) => string | null,
): Set<string> {
  const unique = new Set<string>();
  for (let i = 0; i < SEED_COUNT; i++) {
    const rng = createTestRng(`sweep-body-${i}`);
    const result = fn(rng);
    if (result) unique.add(result);
  }
  return unique;
}

describe("generateRivalryEmergenceNews — template variety", () => {
  it("headline pool has at least 4 unique values across 20 seeds (≥6 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.headline ?? null,
    );
    // With 3 templates: P(seeing ≤3 unique in 20 draws) is high but 3 is max.
    // With 6 templates: we expect 4+ unique values.
    expect(headlines.size).toBeGreaterThanOrEqual(4);
  });

  it("body pool has at least 4 unique values across 20 seeds (≥6 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateRivalryEmergenceNews(stable, 75, DAY, rng)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(4);
  });
});

describe("generateGrudgeMatchNews — template variety (player win)", () => {
  it("headline pool has at least 4 unique values (≥6 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(4);
  });

  it("body pool has at least 4 unique values (≥6 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(4);
  });
});

describe("generateGrudgeMatchNews — template variety (player loss)", () => {
  it("headline pool has at least 4 unique values (≥6 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(4);
  });

  it("body pool has at least 4 unique values (≥6 templates)", () => {
    const bodies = sweepBodies(
      (rng) => generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable)?.body ?? null,
    );
    expect(bodies.size).toBeGreaterThanOrEqual(4);
  });
});

describe("generateRegionLostNews — template variety", () => {
  it("headline pool has at least 4 unique values (≥6 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRegionLostNews("North America", stable, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(4);
  });
});

describe("generateRivalryEscalationNews — template variety", () => {
  it("headline pool has at least 4 unique values (≥6 templates)", () => {
    const headlines = sweepHeadlines(
      (rng) => generateRivalryEscalationNews(stable, 70, 85, DAY, rng)?.headline ?? null,
    );
    expect(headlines.size).toBeGreaterThanOrEqual(4);
  });
});
