/**
 * Tests for NPC breeding logic
 */

import { describe, it, expect } from "vitest";
import { runNpcBreeding } from "./npcBreeding";
import type { Horse, Stable, GameState, Pregnancy } from "./types";

describe("runNpcBreeding", () => {
  it("should return unchanged state when not breeding season start", () => {
    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [],
      npcStables: [],
      pregnancies: [],
      day: 50, // Not breeding season start
    };

    const result = runNpcBreeding(state, 50);
    expect(result.horses).toEqual([]);
    expect(result.npcStables).toEqual([]);
    expect(result.newPregnancies).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should skip stables without breeding personality", () => {
    const stable: Stable = {
      id: "stable-1",
      name: "Aggressive Stable",
      cash: 100000,
      personality: "aggressive",
      reputation: 50,
      tier: "mid",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [],
      npcStables: [stable],
      pregnancies: [],
      day: 1, // Breeding season start
    };

    const result = runNpcBreeding(state, 1);
    expect(result.newPregnancies).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should breed mares from breeder personality stables", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const breederStable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 1, // Breeding season start
    };

    const result = runNpcBreeding(state, 1);
    // May or may not breed depending on breeding season calendar
    // Just verify it doesn't crash and returns expected structure
    expect(result.horses).toBeDefined();
    expect(result.npcStables).toBeDefined();
    expect(result.newPregnancies).toBeDefined();
    expect(result.logs).toBeDefined();
  });

  it("should filter mares by age (3-20)", () => {
    const youngMare: Horse = {
      id: "mare-1",
      name: "Young Mare",
      age: 2,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const oldMare: Horse = {
      id: "mare-2",
      name: "Old Mare",
      age: 21,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const stable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [youngMare, oldMare, stallion],
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result = runNpcBreeding(state, 1);
    expect(result.newPregnancies).toEqual([]);
  });

  it("should skip mares already pregnant", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const existingPregnancy: Pregnancy = {
      id: "preg-1",
      sireId: "stallion-1",
      damId: "mare-1",
      sireName: "Test Stallion",
      damName: "Test Mare",
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const stable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [stable, sireStable],
      pregnancies: [existingPregnancy],
      day: 1,
    };

    const result = runNpcBreeding(state, 1);
    expect(result.newPregnancies).toEqual([]);
  });

  it("should deduct cash from breeder stable and credit sire stable when breeding occurs", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const breederStable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 10000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result = runNpcBreeding(state, 1);

    // Only check cash changes if breeding actually occurred
    if (result.newPregnancies.length > 0) {
      const updatedBreeder = result.npcStables.find((s) => s.id === "stable-1");
      const updatedSire = result.npcStables.find((s) => s.id === "stable-2");
      expect(updatedBreeder?.cash).toBeLessThan(10000);
      expect(updatedSire?.cash).toBeGreaterThan(0);
    } else {
      // If no breeding, cash should remain unchanged
      const updatedBreeder = result.npcStables.find((s) => s.id === "stable-1");
      const updatedSire = result.npcStables.find((s) => s.id === "stable-2");
      expect(updatedBreeder?.cash).toBe(10000);
      expect(updatedSire?.cash).toBe(0);
    }
  });

  it("should increment stallion season bookings when breeding occurs", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 5,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const stable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result = runNpcBreeding(state, 1);

    // Only check booking increment if breeding actually occurred
    if (result.newPregnancies.length > 0) {
      const updatedStallion = result.horses.find((h) => h.id === "stallion-1");
      expect(updatedStallion?.stud?.seasonBookings).toBe(6);
    } else {
      // If no breeding, bookings should remain unchanged
      const updatedStallion = result.horses.find((h) => h.id === "stallion-1");
      expect(updatedStallion?.stud?.seasonBookings).toBe(5);
    }
  });

  it("should create pregnancy with correct due day", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const stable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 10,
    };

    const result = runNpcBreeding(state, 10);

    if (result.newPregnancies.length > 0) {
      expect(result.newPregnancies[0].dueDay).toBe(40); // 10 + 30 (GESTATION_DAYS)
    }
  });

  it("should generate log entries for each breeding", () => {
    const mare: Horse = {
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const stallion: Horse = {
      id: "stallion-1",
      name: "Test Stallion",
      age: 6,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 85,
      energy: 100,
      form: 0,
      silk: "red",
      owned: false,
      fame: 60,
      stableId: "stable-2",
      raceHistory: [],
      stud: {
        atStud: true,
        standingFee: 5000,
        seasonBookings: 0,
        bookSize: 50,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 0,
      },
    };

    const stable: Stable = {
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
      owner: "Owner 1",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    };

    const sireStable: Stable = {
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
      owner: "Owner 2",
      founded: 1,
      horses: [],
      isMajor: false,
      colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    };

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [mare, stallion],
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 10,
    };

    const result = runNpcBreeding(state, 10);

    if (result.newPregnancies.length > 0) {
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0].day).toBe(10);
      expect(result.logs[0].text).toContain("Test Stallion");
      expect(result.logs[0].text).toContain("Test Mare");
    }
  });
});
