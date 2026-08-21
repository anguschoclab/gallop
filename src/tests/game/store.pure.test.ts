/**
 * Tests for pure functions in store.ts
 * These are business logic functions that don't depend on Zustand state
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  refreshMarket,
  generateUpcomingScheduledRaces,
  pruneOldRaces,
} from "@/game/store/helpers/market";
import { resolvePregnancies } from "@/game/store/helpers/pregnancy";
import { maybeRecalibratePars } from "@/game/store/helpers/beyer";
import type { Horse, Race, Pregnancy } from "@/game/types";
import { generateHorse } from "@/core/horse/horseFactory";
import { generateRace } from "@/core/race/generation/raceGen";
import { createRng, hashStr } from "@/core/common/rng";

describe("refreshMarket", () => {
  it("should keep market at 5 horses", () => {
    const market = [
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
    ];
    const refreshed = refreshMarket(market, createRng(hashStr("test")));
    expect(refreshed.length).toBe(5);
  });

  it("should remove oldest horses when market has more than 3", () => {
    const market = [
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
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
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
      generateHorse({ tier: "budget", ownership: { type: "unowned" } }),
    ];
    const refreshed = refreshMarket(market, createRng(hashStr("test")));
    expect(refreshed.length).toBe(5);
  });
});

describe("generateUpcomingScheduledRaces", () => {
  it("should generate races for upcoming days", () => {
    const currentRaces: Race[] = [];
    const newDay = 1;
    const races = generateUpcomingScheduledRaces(currentRaces, newDay);
    expect(races.length).toBeGreaterThan(0);
    expect(races.every((r) => r.day >= newDay)).toBe(true);
  });

  it("should preserve existing races", () => {
    const existingRace = generateRace(1);
    const currentRaces = [existingRace];
    const newDay = 2;
    const races = generateUpcomingScheduledRaces(currentRaces, newDay);
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

  it("should keep races from last 30 days", () => {
    const recentRace: Race = { ...generateRace(270), day: 270 };
    const currentDay = 300;
    const pruned = pruneOldRaces([recentRace], currentDay);
    expect(pruned).toContain(recentRace);
  });

  it("should remove races older than 30 days if not graded", () => {
    const oldRace: Race = { ...generateRace(1), day: 1, resolved: true };
    const currentDay = 35;
    const pruned = pruneOldRaces([oldRace], currentDay);
    expect(pruned).not.toContain(oldRace);
  });

  it("should remove races exactly 31 days old if not graded", () => {
    const oldRace: Race = { ...generateRace(269), day: 269, resolved: true };
    const currentDay = 300;
    const pruned = pruneOldRaces([oldRace], currentDay);
    expect(pruned).not.toContain(oldRace);
  });
});

describe("resolvePregnancies", () => {
  it("should resolve pregnancy on due day", () => {
    const sire = generateHorse({ tier: "elite", ownership: { type: "unowned" } });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: { type: "player" } });
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
      isPlayerOwned: true,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 31);

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
    const sire = generateHorse({ tier: "elite", ownership: { type: "unowned" } });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: { type: "player" } });
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
      isPlayerOwned: true,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 30);

    expect(result.pregnancies[0].resolved).toBe(false);
    expect(result.foals.length).toBe(0);
  });

  it("should skip already resolved pregnancies", () => {
    const sire = generateHorse({ tier: "elite", ownership: { type: "unowned" } });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: { type: "player" } });
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
      isPlayerOwned: true,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 31);

    expect(result.foals.length).toBe(0);
  });

  it("should handle live foal guarantee on complication", () => {
    const sire = generateHorse({ tier: "elite", ownership: { type: "unowned" } });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: { type: "player" } });
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
      isPlayerOwned: true,
    };

    const horses = [sire, dam];
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 31);

    // If complication occurred, should re-breed
    // If live foal, should resolve normally
    // Either way, should handle LFG correctly
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it("should not mutate the input horses array or usedNames set", () => {
    const sire = generateHorse({ tier: "elite", ownership: { type: "unowned" } });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;
    sire.stud = {
      atStud: true,
      standingFee: 1000,
      seasonBookings: 0,
      bookSize: 40,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      lifetimeFoals: 0,
      retiredOnDay: 0,
    };

    const dam = generateHorse({ tier: "elite", ownership: { type: "player" } });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 3;

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
      isPlayerOwned: true,
    };

    const horses = [sire, dam];
    const originalLifetimeFoals = sire.stud?.lifetimeFoals;
    const originalFoalsProducedLength = dam.foalsProduced?.length ?? 0;
    const usedNames = new Set<string>();
    const result = resolvePregnancies([pregnancy], horses, [], usedNames, 31);

    // Should not mutate the original array or the objects inside it
    expect(sire.stud?.lifetimeFoals).toBe(originalLifetimeFoals);
    expect(dam.lastFoaledDay).toBeUndefined();
    expect(dam.foalsProduced?.length).toBe(originalFoalsProducedLength);
    expect(usedNames.size).toBe(0);

    // Result should carry the derived updates instead
    expect(result.mareFoalingUpdates.length).toBeGreaterThan(0);
    expect(result.studCareerUpdates.length).toBeGreaterThan(0);
    expect(result.usedNames.size).toBeGreaterThan(0);
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
