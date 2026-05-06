/**
 * Tests for pure functions in store.ts
 * These are business logic functions that don't depend on Zustand state
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  refreshMarket,
  generateUpcomingRaces,
  pruneOldRaces,
  resolvePregnancies,
  maybeRecalibratePars,
} from "./store";
import type { Horse, Race, Pregnancy } from "./types";
import { generateHorse } from "./horseGen";
import { generateRace } from "./horseGen";
import { createRng, hashStr } from "./rng";

describe("refreshMarket", () => {
  it("should keep market at 5 horses", () => {
    const market = [
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
    ];
    const refreshed = refreshMarket(market, createRng(hashStr("test")));
    expect(refreshed.length).toBe(5);
  });

  it("should remove oldest horses when market has more than 3", () => {
    const market = [
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
    ];
    const initialIds = market.map((h) => h.id);
    const refreshed = refreshMarket(market, createRng(hashStr("test")));
    const refreshedIds = refreshed.map((h) => h.id);
    // Should keep last 2 and add 3 new ones
    expect(refreshedIds).toContain(initialIds[2]);
    expect(refreshedIds).toContain(initialIds[3]);
    expect(refreshed.length).toBe(5);
  });

  it("should add horses when market has fewer than 5", () => {
    const market = [
      generateHorse({ tier: "budget", owned: false }),
      generateHorse({ tier: "budget", owned: false }),
    ];
    const refreshed = refreshMarket(market, createRng(hashStr("test")));
    expect(refreshed.length).toBe(5);
  });
});

describe("generateUpcomingRaces", () => {
  it("should generate races for upcoming days", () => {
    const currentRaces: Race[] = [];
    const newDay = 1;
    const races = generateUpcomingRaces(currentRaces, newDay, createRng(hashStr("test")));
    expect(races.length).toBeGreaterThan(0);
    expect(races.every((r) => r.day >= newDay)).toBe(true);
  });

  it("should preserve existing races", () => {
    const existingRace = generateRace(1);
    const currentRaces = [existingRace];
    const newDay = 2;
    const races = generateUpcomingRaces(currentRaces, newDay, createRng(hashStr("test")));
    expect(races).toContain(existingRace);
  });
});

describe("pruneOldRaces", () => {
  it("should keep graded races regardless of age", () => {
    const gradedRace: Race = {
      ...generateRace(1),
      graded: {
        key: "kentucky-derby",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "track-1",
        surface: "Dirt",
      },
      day: 1,
    };
    const currentDay = 10;
    const pruned = pruneOldRaces([gradedRace], currentDay);
    expect(pruned).toContain(gradedRace);
  });

  it("should keep races from last 3 days", () => {
    const recentRace: Race = { ...generateRace(8), day: 8 };
    const currentDay = 10;
    const pruned = pruneOldRaces([recentRace], currentDay);
    expect(pruned).toContain(recentRace);
  });

  it("should remove races older than 3 days if not graded", () => {
    const oldRace: Race = { ...generateRace(1), day: 1 };
    const currentDay = 10;
    const pruned = pruneOldRaces([oldRace], currentDay);
    expect(pruned).not.toContain(oldRace);
  });

  it("should remove races exactly 4 days old if not graded", () => {
    const oldRace: Race = { ...generateRace(6), day: 6 };
    const currentDay = 10;
    const pruned = pruneOldRaces([oldRace], currentDay);
    expect(pruned).not.toContain(oldRace);
  });
});

describe("resolvePregnancies", () => {
  it("should resolve pregnancy on due day", () => {
    const sire = generateHorse({ tier: "elite", owned: false });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", owned: true });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 3; // Younger mare for lower complication rate
    dam.hemisphere = "Northern";

    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, 31);

    // Pregnancy should be either resolved (live foal or complication)
    // or re-scheduled if live foal guarantee triggered
    expect(result.logs.length).toBeGreaterThan(0);
    if (result.pregnancies[0].resolved) {
      // Either a foal was born or a complication occurred
      expect(result.foals.length + result.logs.filter((l) => l.text.includes("💔")).length).toBe(1);
    } else {
      // Re-scheduled due to live foal guarantee
      expect(result.pregnancies[0].dueDay).toBeGreaterThan(31);
    }
  });

  it("should not resolve pregnancy before due day", () => {
    const sire = generateHorse({ tier: "elite", owned: false });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", owned: true });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 5;

    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, 30);

    expect(result.pregnancies[0].resolved).toBe(false);
    expect(result.foals.length).toBe(0);
  });

  it("should skip already resolved pregnancies", () => {
    const sire = generateHorse({ tier: "elite", owned: false });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", owned: true });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 5;

    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: true,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, 31);

    expect(result.foals.length).toBe(0);
  });

  it("should handle live foal guarantee on complication", () => {
    const sire = generateHorse({ tier: "elite", owned: false });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", owned: true });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 18; // Older mare for higher complication rate

    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: true,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, 31);

    // If complication occurred, should re-breed
    // If live foal, should resolve normally
    // Either way, should handle LFG correctly
    expect(result.logs.length).toBeGreaterThan(0);
  });
});

describe("maybeRecalibratePars", () => {
  it("should not recalibrate if less than season days have passed", () => {
    const currentPars = { 1000: 50 };
    const lastCalibrationDay = 1;
    const paceSamples = { 1000: [50, 51, 52] };
    const newDay = 20; // Less than 30 days

    const result = maybeRecalibratePars(currentPars, lastCalibrationDay, paceSamples, newDay);

    expect(result.calibratedPars).toBe(currentPars);
    expect(result.lastCalibrationDay).toBe(lastCalibrationDay);
    expect(result.log).toBeNull();
  });

  it("should recalibrate if season days have passed", () => {
    const currentPars = { 1000: 50 };
    const lastCalibrationDay = 1;
    const paceSamples = { 1000: [50, 51, 52, 53, 54, 55] };
    const newDay = 31; // 30 days have passed

    const result = maybeRecalibratePars(currentPars, lastCalibrationDay, paceSamples, newDay);

    expect(result.lastCalibrationDay).toBe(newDay);
    expect(result.log).not.toBeNull();
  });

  it("should not recalibrate if no pace samples", () => {
    const currentPars = { 1000: 50 };
    const lastCalibrationDay = 1;
    const paceSamples = {};
    const newDay = 31;

    const result = maybeRecalibratePars(currentPars, lastCalibrationDay, paceSamples, newDay);

    expect(result.calibratedPars).toBe(currentPars);
    expect(result.log).toBeNull();
  });
});
