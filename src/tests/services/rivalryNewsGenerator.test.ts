import { describe, it, expect } from "vitest";
import {
  generateRivalryEmergenceNews,
  generateGrudgeMatchNews,
  generateRegionLostNews,
  generateRivalryEscalationNews,
} from "@/services/narrative/rivalryNewsGenerator";
import { isValidUUID } from "@/core/uuid";
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

describe("generateRivalryEmergenceNews", () => {
  it("returns null when friction < 60", () => {
    const rng = createTestRng("emergence-low");
    expect(generateRivalryEmergenceNews(stable, 59, DAY, rng)).toBeNull();
  });

  it("returns null when friction is exactly 59", () => {
    const rng = createTestRng("emergence-59");
    expect(generateRivalryEmergenceNews(stable, 59, DAY, rng)).toBeNull();
  });

  it("returns a NewsItem when friction >= 60", () => {
    const rng = createTestRng("emergence-60");
    const news = generateRivalryEmergenceNews(stable, 60, DAY, rng);
    expect(news).not.toBeNull();
  });

  it("headline contains the stable name", () => {
    const rng = createTestRng("emergence-headline");
    const news = generateRivalryEmergenceNews(stable, 75, DAY, rng);
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Bitter Creek Stables");
  });

  it("body contains the stable name", () => {
    const rng = createTestRng("emergence-body");
    const news = generateRivalryEmergenceNews(stable, 75, DAY, rng);
    expect(news).not.toBeNull();
    expect(news!.body).toContain("Bitter Creek Stables");
  });

  it("has category 'stable' and importance 'medium'", () => {
    const rng = createTestRng("emergence-fields");
    const news = generateRivalryEmergenceNews(stable, 60, DAY, rng);
    expect(news!.category).toBe("stable");
    expect(news!.importance).toBe("medium");
  });

  it("entityLinks contains the stable", () => {
    const rng = createTestRng("emergence-links");
    const news = generateRivalryEmergenceNews(stable, 60, DAY, rng);
    expect(news!.entityLinks).toEqual([{ type: "stable", id: "rival-1", name: "Bitter Creek Stables" }]);
  });

  it("day matches currentDay", () => {
    const rng = createTestRng("emergence-day");
    const news = generateRivalryEmergenceNews(stable, 60, DAY, rng);
    expect(news!.day).toBe(DAY);
  });

  it("id is a valid UUID", () => {
    const rng = createTestRng("emergence-uuid");
    const news = generateRivalryEmergenceNews(stable, 60, DAY, rng);
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const rng1 = createTestRng("emergence-det");
    const rng2 = createTestRng("emergence-det");
    const n1 = generateRivalryEmergenceNews(stable, 60, DAY, rng1);
    const n2 = generateRivalryEmergenceNews(stable, 60, DAY, rng2);
    expect(n1).toEqual(n2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createTestRng("seed-a");
    const rng2 = createTestRng("seed-b");
    const n1 = generateRivalryEmergenceNews(stable, 60, DAY, rng1);
    const n2 = generateRivalryEmergenceNews(stable, 60, DAY, rng2);
    expect(n1!.id).not.toBe(n2!.id);
  });
});

describe("generateGrudgeMatchNews", () => {
  it("player win: headline contains player horse name", () => {
    const rng = createTestRng("grudge-win");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Lightning Bolt");
  });

  it("player win: body mentions both horses", () => {
    const rng = createTestRng("grudge-win-body");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news!.body).toContain("Lightning Bolt");
    expect(news!.body).toContain("Dark Thunder");
  });

  it("player loss: headline contains rival horse name", () => {
    const rng = createTestRng("grudge-loss");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable);
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Dark Thunder");
  });

  it("player loss: body mentions both horses", () => {
    const rng = createTestRng("grudge-loss-body");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable);
    expect(news!.body).toContain("Lightning Bolt");
    expect(news!.body).toContain("Dark Thunder");
  });

  it("has category 'racing' and importance 'high'", () => {
    const rng = createTestRng("grudge-fields");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news!.category).toBe("racing");
    expect(news!.importance).toBe("high");
  });

  it("entityLinks contains 4 links: winner, loser, race, stable", () => {
    const rng = createTestRng("grudge-links");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news!.entityLinks).toHaveLength(4);
    const types = news!.entityLinks!.map((l) => l.type);
    expect(types).toContain("horse");
    expect(types).toContain("race");
    expect(types).toContain("stable");
  });

  it("entityLinks winner is playerHorse on win, rivalHorse on loss", () => {
    const rngWin = createTestRng("grudge-winner-win");
    const newsWin = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rngWin, stable);
    const winLinks = newsWin!.entityLinks!.filter((l) => l.type === "horse");
    expect(winLinks[0]).toEqual({ type: "horse", id: "ph-1", name: "Lightning Bolt" });

    const rngLoss = createTestRng("grudge-winner-loss");
    const newsLoss = generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rngLoss, stable);
    const lossLinks = newsLoss!.entityLinks!.filter((l) => l.type === "horse");
    expect(lossLinks[0]).toEqual({ type: "horse", id: "rh-1", name: "Dark Thunder" });
  });

  it("day matches currentDay", () => {
    const rng = createTestRng("grudge-day");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news!.day).toBe(DAY);
  });

  it("id is a valid UUID", () => {
    const rng = createTestRng("grudge-uuid");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const rng1 = createTestRng("grudge-det");
    const rng2 = createTestRng("grudge-det");
    const n1 = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng1, stable);
    const n2 = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng2, stable);
    expect(n1).toEqual(n2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createTestRng("grudge-seed-a");
    const rng2 = createTestRng("grudge-seed-b");
    const n1 = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng1, stable);
    const n2 = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng2, stable);
    expect(n1!.id).not.toBe(n2!.id);
  });

  it("entityLinks exact match on player win", () => {
    const rng = createTestRng("grudge-exact-win");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, true, DAY, rng, stable);
    expect(news!.entityLinks).toEqual([
      { type: "horse", id: "ph-1", name: "Lightning Bolt" },
      { type: "horse", id: "rh-1", name: "Dark Thunder" },
      { type: "race", id: "race-1", name: "Grand Stakes" },
      { type: "stable", id: "rival-1", name: "Bitter Creek Stables" },
    ]);
  });

  it("entityLinks exact match on player loss", () => {
    const rng = createTestRng("grudge-exact-loss");
    const news = generateGrudgeMatchNews(race, playerHorse, rivalHorse, false, DAY, rng, stable);
    expect(news!.entityLinks).toEqual([
      { type: "horse", id: "rh-1", name: "Dark Thunder" },
      { type: "horse", id: "ph-1", name: "Lightning Bolt" },
      { type: "race", id: "race-1", name: "Grand Stakes" },
      { type: "stable", id: "rival-1", name: "Bitter Creek Stables" },
    ]);
  });
});

describe("generateRegionLostNews", () => {
  const region = "North America (East)";

  it("headline contains region name", () => {
    const rng = createTestRng("region-headline");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("North America (East)");
  });

  it("headline contains stable name", () => {
    const rng = createTestRng("region-headline-stable");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.headline).toContain("Bitter Creek Stables");
  });

  it("body contains region name", () => {
    const rng = createTestRng("region-body");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.body).toContain("North America (East)");
  });

  it("body contains stable name", () => {
    const rng = createTestRng("region-body-stable");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.body).toContain("Bitter Creek Stables");
  });

  it("has category 'stable' and importance 'high'", () => {
    const rng = createTestRng("region-fields");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.category).toBe("stable");
    expect(news!.importance).toBe("high");
  });

  it("entityLinks contains the stable", () => {
    const rng = createTestRng("region-links");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.entityLinks).toEqual([{ type: "stable", id: "rival-1", name: "Bitter Creek Stables" }]);
  });

  it("day matches currentDay", () => {
    const rng = createTestRng("region-day");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(news!.day).toBe(DAY);
  });

  it("id is a valid UUID", () => {
    const rng = createTestRng("region-uuid");
    const news = generateRegionLostNews(region, stable, DAY, rng);
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const rng1 = createTestRng("region-det");
    const rng2 = createTestRng("region-det");
    const n1 = generateRegionLostNews(region, stable, DAY, rng1);
    const n2 = generateRegionLostNews(region, stable, DAY, rng2);
    expect(n1).toEqual(n2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createTestRng("region-seed-a");
    const rng2 = createTestRng("region-seed-b");
    const n1 = generateRegionLostNews(region, stable, DAY, rng1);
    const n2 = generateRegionLostNews(region, stable, DAY, rng2);
    expect(n1!.id).not.toBe(n2!.id);
  });

  it("handles empty region string", () => {
    const rng = createTestRng("region-empty");
    const news = generateRegionLostNews("", stable, DAY, rng);
    expect(news).not.toBeNull();
    expect(news!.body).toContain("Bitter Creek Stables");
  });
});

describe("generateRivalryEscalationNews", () => {
  it("returns null when newFriction < 80", () => {
    const rng = createTestRng("esc-low");
    expect(generateRivalryEscalationNews(stable, 50, 79, DAY, rng)).toBeNull();
  });

  it("returns null when oldFriction >= 80 (already escalated)", () => {
    const rng = createTestRng("esc-already");
    expect(generateRivalryEscalationNews(stable, 80, 90, DAY, rng)).toBeNull();
  });

  it("returns null when both conditions fail", () => {
    const rng = createTestRng("esc-both");
    expect(generateRivalryEscalationNews(stable, 85, 79, DAY, rng)).toBeNull();
  });

  it("returns NewsItem when newFriction >= 80 AND oldFriction < 80", () => {
    const rng = createTestRng("esc-valid");
    const news = generateRivalryEscalationNews(stable, 79, 80, DAY, rng);
    expect(news).not.toBeNull();
  });

  it("returns NewsItem at exact boundary (oldFriction 79, newFriction 80)", () => {
    const rng = createTestRng("esc-boundary");
    const news = generateRivalryEscalationNews(stable, 79, 80, DAY, rng);
    expect(news).not.toBeNull();
  });

  it("headline contains stable name", () => {
    const rng = createTestRng("esc-headline");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(news!.headline).toContain("Bitter Creek Stables");
  });

  it("body contains stable name", () => {
    const rng = createTestRng("esc-body");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(news!.body).toContain("Bitter Creek Stables");
  });

  it("has category 'stable' and importance 'high'", () => {
    const rng = createTestRng("esc-fields");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(news!.category).toBe("stable");
    expect(news!.importance).toBe("high");
  });

  it("entityLinks contains the stable", () => {
    const rng = createTestRng("esc-links");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(news!.entityLinks).toEqual([{ type: "stable", id: "rival-1", name: "Bitter Creek Stables" }]);
  });

  it("day matches currentDay", () => {
    const rng = createTestRng("esc-day");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(news!.day).toBe(DAY);
  });

  it("id is a valid UUID", () => {
    const rng = createTestRng("esc-uuid");
    const news = generateRivalryEscalationNews(stable, 70, 85, DAY, rng);
    expect(isValidUUID(news!.id)).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const rng1 = createTestRng("esc-det");
    const rng2 = createTestRng("esc-det");
    const n1 = generateRivalryEscalationNews(stable, 70, 85, DAY, rng1);
    const n2 = generateRivalryEscalationNews(stable, 70, 85, DAY, rng2);
    expect(n1).toEqual(n2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createTestRng("esc-seed-a");
    const rng2 = createTestRng("esc-seed-b");
    const n1 = generateRivalryEscalationNews(stable, 70, 85, DAY, rng1);
    const n2 = generateRivalryEscalationNews(stable, 70, 85, DAY, rng2);
    expect(n1!.id).not.toBe(n2!.id);
  });

  it("handles extreme friction jump from 0 to 100", () => {
    const rng = createTestRng("esc-extreme");
    const news = generateRivalryEscalationNews(stable, 0, 100, DAY, rng);
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Bitter Creek Stables");
  });

  it("returns null when newFriction is exactly 79", () => {
    const rng = createTestRng("esc-79");
    expect(generateRivalryEscalationNews(stable, 50, 79, DAY, rng)).toBeNull();
  });
});
