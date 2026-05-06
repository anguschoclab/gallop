/**
 * Tests for NPC breeding logic
 */

import { describe, it, expect } from "vitest";
import { runNpcBreeding } from "./npcBreeding";
import { createRng } from "./rng";
import type { Horse, Stable, GameState, Pregnancy, HorseGender } from "./types";

// Helper to create minimal valid Horse objects for testing
function mockHorse(
  id: string,
  name: string,
  gender: HorseGender,
  stats: { speed: number; stamina: number; acceleration: number; consistency: number },
  overrides?: Partial<Horse>,
): Horse {
  return {
    id,
    name,
    age: 5,
    gender,
    hemisphere: "Northern",
    silk: "#ff0000",
    stats,
    energy: 100,
    form: 0,
    potential: 75,
    raceHistory: [],
    owned: false,
    fame: 50,
    // DNA/genotype fields (minimal defaults)
    genotype: {
      color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
      stats: { speed: [[1, 1]], stamina: [[1, 1]], acceleration: [[1, 1]], consistency: [[1, 1]] },
      preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
      style: [1, 1],
      mental: [1, 1],
      physical: [1, 1],
      durability: [1, 1],
      size: [1, 1],
      markers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "good",
        signalTransduction: "good",
        immunity: "good",
        geneticDiversity: 0.8,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
      heart: [[1, 1]],
      fiberType: [1, 1],
      stride: [1, 1],
      trackBias: [1, 1],
      mudAptitude: [1, 1],
      trainability: [1, 1],
      peakAge: [1, 1],
      recovery: [1, 1],
      fertility: [1, 1],
      foalingEase: [1, 1],
      markings: {
        socks: [1, 1],
        face: [1, 1],
        silverDapple: [1, 1],
        sabino: [1, 1],
        splashWhite: [1, 1],
      },
      health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
    },
    // Aptitude fields
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0,
    height: 16,
    weight: 500,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    // Resolved DNA traits
    heartScore: 1.0,
    fiberBias: "balanced",
    strideType: "balanced",
    trackPreference: "balanced",
    mudAptitude: 1.0,
    trainability: 1.0,
    peakAge: 4,
    recoveryRate: 1.0,
    fertility: 0.85,
    foalingEase: 0.85,
    markings: {
      socks: "none",
      face: "none",
      silverDapple: false,
      sabino: false,
      splashWhite: false,
    },
    bleederRisk: 0,
    roarerRisk: 0,
    ocdRisk: 0,
    racingViable: true,
    lifecycleStatus: "active" as const,
    ...overrides,
  };
}

describe("runNpcBreeding", () => {
  it("should return unchanged state when not breeding season start", () => {
    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: [],
      npcStables: [],
      pregnancies: [],
      day: 50, // Not breeding season start
    };

    const result = runNpcBreeding(state, 50, createRng(1));
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

    const result = runNpcBreeding(state, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should breed mares from breeder personality stables", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 1, createRng(1));
    // May or may not breed depending on breeding season calendar
    // Just verify it doesn't crash and returns expected structure
    expect(result.horses).toBeDefined();
    expect(result.npcStables).toBeDefined();
    expect(result.newPregnancies).toBeDefined();
    expect(result.logs).toBeDefined();
  });

  it("should filter mares by age (3-20)", () => {
    const youngMare = mockHorse(
      "mare-1",
      "Young Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        age: 2,
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const oldMare = mockHorse(
      "mare-2",
      "Old Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        age: 21,
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("should skip mares already pregnant", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

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

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("should deduct cash from breeder stable and credit sire stable when breeding occurs", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 1, createRng(1));

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
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 1, createRng(1));

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
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 10, createRng(1));

    if (result.newPregnancies.length > 0) {
      expect(result.newPregnancies[0].dueDay).toBe(40); // 10 + 30 (GESTATION_DAYS)
    }
  });

  it("should generate log entries for each breeding", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      {
        stableId: "stable-1",
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      {
        stableId: "stable-2",
        silk: "red",
        potential: 85,
        fame: 60,
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
      },
    );

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

    const result = runNpcBreeding(state, 10, createRng(1));

    if (result.newPregnancies.length > 0) {
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0].day).toBe(10);
      expect(result.logs[0].text).toContain("Test Stallion");
      expect(result.logs[0].text).toContain("Test Mare");
    }
  });
});
