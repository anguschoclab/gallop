import { describe, it, expect } from "vitest";
import {
  checkCareerArcTrigger,
  type CareerArcState,
} from "@/services/narrative/careerArcGenerator";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";
import type { Race } from "@/game/types";

function createG1Race(): Race {
  return {
    id: "race-g1",
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
  } as Race;
}

function createG2Race(): Race {
  return {
    id: "race-g2",
    name: "Breeders' Cup Mile",
    graded: { key: "bc-mile", grade: "G2", track: "Santa Anita", surface: "Turf" },
    raceClass: "Stakes",
    day: 10,
    distance: 2000,
    entryFee: 500,
    purse: 100000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as Race;
}

function createNonGradedRace(): Race {
  return {
    id: "race-maiden",
    name: "Maiden Special Weight",
    raceClass: "MaidenSpecialWeight",
    day: 10,
    distance: 2000,
    entryFee: 500,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as Race;
}

function createPlayerHorse(careerWins = 0): ReturnType<typeof createTestHorse> {
  return createTestHorse({
    id: "player-horse-1",
    name: "Thunder Strike",
    owned: true,
    stableId: undefined,
    careerWins,
  });
}

describe("checkCareerArcTrigger", () => {
  describe("Stage transitions", () => {
    it("15.1 — Stage 1 fires on 3rd win (careerWins=2, position 1 → computed 3)", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const result = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(result.newArcState.stage).toBe("rising_star");
    });

    it("15.2 — Stage 1 does NOT fire on 2nd win (careerWins=1, position 1 → computed 2)", () => {
      const horse = createPlayerHorse(1);
      const race = createNonGradedRace();
      const result = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng());
      expect(result.newsItem).toBeNull();
      expect(result.newArcState.stage).toBe("none");
    });

    it("15.3 — Stage 1 does NOT re-fire if already rising_star", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "rising_star",
        stage1Day: 5,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).toBeNull();
    });

    it("15.4 — Stage 2 fires on 5th win (careerWins=4, position 1 → computed 5)", () => {
      const horse = createPlayerHorse(4);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "rising_star",
        stage1Day: 5,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(result.newArcState.stage).toBe("contender");
    });

    it("15.5 — Stage 2 fires on first graded win (even if careerWins < 5)", () => {
      const horse = createPlayerHorse(3);
      const race = createG2Race();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "rising_star",
        stage1Day: 5,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(result.newArcState.stage).toBe("contender");
    });

    it("15.6 — Stage 2 does NOT re-fire if already contender", () => {
      const horse = createPlayerHorse(4);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "contender",
        stage1Day: 5,
        stage2Day: 8,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).toBeNull();
    });

    it("15.7 — Stage 3 champion path fires on first G1 win", () => {
      const horse = createPlayerHorse(5);
      const race = createG1Race();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "contender",
        stage1Day: 5,
        stage2Day: 8,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(result.newArcState.stage).toBe("champion_or_bust");
      expect(result.newsItem!.importance).toBe("high");
    });

    it("15.8 — Stage 3 bust path fires on 3rd consecutive loss at contender", () => {
      const horse = createPlayerHorse(5);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "contender",
        stage1Day: 5,
        stage2Day: 8,
        consecutiveLosses: 2,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 2, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(result.newArcState.stage).toBe("champion_or_bust");
      expect(result.newsItem!.importance).toBe("medium");
    });

    it("15.9 — Stage 3 bust path does NOT fire on 2nd consecutive loss", () => {
      const horse = createPlayerHorse(5);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "contender",
        stage1Day: 5,
        stage2Day: 8,
        consecutiveLosses: 1,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 2, 10, createTestRng());
      expect(result.newsItem).toBeNull();
      expect(result.newArcState.consecutiveLosses).toBe(2);
    });

    it("15.10 — complete stage: no articles, no transitions", () => {
      const horse = createPlayerHorse(10);
      const race = createG1Race();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "complete",
        stage1Day: 5,
        stage2Day: 8,
        stage3Day: 12,
        consecutiveLosses: 0,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newsItem).toBeNull();
      expect(result.newArcState.stage).toBe("complete");
    });

    it("15.11 — consecutiveLosses resets to 0 on win at any stage", () => {
      const horse = createPlayerHorse(5);
      const race = createNonGradedRace();
      const existing: CareerArcState = {
        horseId: horse.id,
        stage: "contender",
        stage1Day: 5,
        stage2Day: 8,
        consecutiveLosses: 2,
      };
      const result = checkCareerArcTrigger(horse, existing, race, 1, 10, createTestRng());
      expect(result.newArcState.consecutiveLosses).toBe(0);
    });
  });

  describe("Determinism", () => {
    it("16.1 — Same horse, race, seed → identical newsItem", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const r1 = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng("seed-x"));
      const r2 = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng("seed-x"));
      expect(r1).toEqual(r2);
    });

    it("16.2 — Different seed → different headline/body (from pool)", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const r1 = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng("seed-a"));
      const r2 = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng("seed-b"));
      expect(r1.newsItem!.id).not.toBe(r2.newsItem!.id);
    });

    it("16.3 — arcState with undefined stage treated as stage: 'none'", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const result = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng());
      expect(result.newArcState.stage).toBe("rising_star");
    });

    it("16.4 — id is valid UUID", () => {
      const horse = createPlayerHorse(2);
      const race = createNonGradedRace();
      const result = checkCareerArcTrigger(horse, undefined, race, 1, 10, createTestRng());
      expect(result.newsItem).not.toBeNull();
      expect(isValidUUID(result.newsItem!.id)).toBe(true);
    });
  });
});
