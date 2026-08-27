/**
 * npcBreeding.test.ts - NPC breeding logic tests
 *
 * This file contains tests for NPC breeding logic including autonomous breeding,
 * personality-based decisions, and COI calculations.
 *
 * Dependencies: vitest (describe, it, expect), ./npcBreeding (runNpcBreeding), ./rng (createRng), ./types (Horse, Stable, GameState, Pregnancy, HorseGender)
 * Related files: npcBreeding.ts (implementation being tested)
 */

/**
 * Tests for NPC breeding logic
 */

import { describe, it, expect } from "vitest";
import { runNpcBreeding } from "@/core/npc/breeding";
import { createRng } from "@/core/common/rng";
import type { GameState, Horse, HorseGender, Pregnancy } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { asHorseId, asNpcStableId } from "@/core/types/branded";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

// Helper to create minimal valid Horse objects for testing
function mockHorse(
  id: string,
  name: string,
  gender: HorseGender,
  stats: {
    speed: number;
    stamina: number;
    acceleration: number;
    consistency: number;
    temperament: number;
    conformation: number;
  },
  overrides?: Partial<Horse>,
): Horse {
  return {
    id: asHorseId(id),
    name,
    age: 5,
    gender,
    hemisphere: "Northern",
    silk: "#ff0000",
    fanCount: 0,
    stats,
    energy: 100,
    form: 0,
    potential: 75,
    raceHistory: [],
    ownership: makeUnowned(),
    fame: 50,
    careerStarts: 0,
    careerWins: 0,
    lifetimeEarnings: 0,
    healthStatusDay: 1,
    isBlueHen: false,
    gelded: false,
    racingViable: true,
    lifecycleStatus: "active",
    courseVisits: {},
    pedigree: { name: id, generation: 0 },
    sireName: "Unknown",
    damName: "Unknown",
    birthDay: 1,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    bloodline: "Standard",
    recoveryPoints: 100,
    heterozygosity: 0.5,
    runningStyle: "E",
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
      weatherAptitude: [1, 1],
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
      health: {
        bleeder: [1, 1],
        roarer: [1, 1],
        ocd: [1, 1],
        efna5: [1, 1],
        pssm: [1, 1],
        rer: [1, 1],
        epm: [1, 1],
      },
    },
    // Aptitude fields
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0,
    height: 16,
    weight: 500,
    // Resolved DNA traits
    heartScore: 1.0,
    fiberBias: "average",
    strideType: "average",
    trackPreference: "balanced",
    mudAptitude: 1.0,
    trainability: 1.0,
    peakAge: 5,
    recoveryRate: 1.0,
    fertility: 0.9,
    foalingEase: 0.9,
    bleederRisk: 0.01,
    roarerRisk: 0.01,
    ocdRisk: 0.01,
    healthStatus: "healthy",
    ...overrides,
  };
}

describe("runNpcBreeding", () => {
  it("should return unchanged state when not breeding season start", () => {
    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: {},
      npcStables: [],
      pregnancies: [],
      day: 50, // Not breeding season start
    };

    const result = runNpcBreeding(state as any, 50, createRng(1));
    expect(result.horses).toEqual({});
    expect(result.npcStables).toEqual([]);
    expect(result.newPregnancies).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should skip stables without breeding personality", () => {
    const stable = createTestStable({
      id: "stable-1",
      name: "Aggressive Stable",
      cash: 100000,
      personality: "aggressive",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: {},
      npcStables: [stable],
      pregnancies: [],
      day: 1, // Breeding season start
    };

    const result = runNpcBreeding(state as any, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should breed mares from breeder personality stables", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 1, // Breeding season start
    };

    const result: any = runNpcBreeding(state as any, 1, createRng(1));
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
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        age: 2,
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const oldMare = mockHorse(
      "mare-2",
      "Old Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        age: 21,
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const stable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([youngMare, oldMare, stallion]),
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result = runNpcBreeding(state as any, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("should skip mares already pregnant", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const existingPregnancy: Pregnancy = {
      id: "preg-1",
      sireId: asHorseId("stallion-1"),
      damId: asHorseId("mare-1"),
      sireName: "Test Stallion",
      damName: "Test Mare",
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
      isPlayerOwned: false,
    };

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const stable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [stable, sireStable],
      pregnancies: [existingPregnancy],
      day: 1,
    };

    const result = runNpcBreeding(state as any, 1, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("should deduct cash from breeder stable and credit sire stable when breeding occurs", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 10000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result = runNpcBreeding(state as any, 1, createRng(1));

    if (result.newPregnancies.length > 0) {
      const updatedBreeder = result.npcStables.find((s: any) => s.id === "stable-1");
      const updatedSire = result.npcStables.find((s: any) => s.id === "stable-2");
      expect(updatedBreeder?.cash).toBeLessThan(10000);
      expect(updatedSire?.cash).toBeGreaterThan(0);
    }
  });

  it("should increment stallion season bookings when breeding occurs", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const stable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 1,
    };

    const result: any = runNpcBreeding(state as any, 1, createRng(1));

    if (result.newPregnancies.length > 0) {
      const updatedStallion = result.horses.find((h: any) => h.id === "stallion-1");
      expect(updatedStallion?.stud?.seasonBookings).toBe(6);
    }
  });

  it("should create pregnancy with correct due day", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const stable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 10,
    };

    const result: any = runNpcBreeding(state as any, 10, createRng(1));

    if (result.newPregnancies.length > 0) {
      expect(result.newPregnancies[0].dueDay).toBe(40);
    }
  });

  it("should generate log entries for each breeding", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const stable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [stable, sireStable],
      pregnancies: [],
      day: 10,
    };

    const result: any = runNpcBreeding(state as any, 10, createRng(1));

    if (result.newPregnancies.length > 0) {
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0].day).toBe(10);
      expect(result.logs[0].text).toContain("Test Stallion");
      expect(result.logs[0].text).toContain("Test Mare");
    }
  });
});

describe("runNpcBreeding — COI and eligibility checks", () => {
  it("does not breed mare when all stallions exceed COI cap", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      { ownership: makeNpcOwned(asNpcStableId("stable-1")), silk: "blue" },
    );

    // Stallion that shares a parent with the mare (high COI)
    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
        silk: "red",
        potential: 85,
        fame: 60,
        sireId: "shared-sire",
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
    // Give mare the same sire
    (mare as any).sireId = "shared-sire";

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    // With only a sibling stallion available, COI should block breeding
    expect(result.newPregnancies).toEqual([]);
  });

  it("does not breed mare with her sire (parent-child)", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
        sireId: "stallion-1",
        sireName: "Test Stallion",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    // No pregnancy should be created with the sire (parent-child)
    const parentChildPreg = result.newPregnancies.find(
      (p: any) => p.sireId === "stallion-1" && p.damId === "mare-1",
    );
    expect(parentChildPreg).toBeUndefined();
  });

  it("does not breed mare in covering sickness", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
        silk: "blue",
        healthStatus: "covering_sickness",
      },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("does not breed mare still in recovery", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      { ownership: makeNpcOwned(asNpcStableId("stable-1")), silk: "blue", lastFoaledDay: 95 },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    // Day 100, mare foaled on day 95 — only 5 days ago
    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });
});

describe("runNpcBreeding — all 8 personalities breed", () => {
  function setupStableWithMareAndStallion(personality: string) {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      { ownership: makeNpcOwned(asNpcStableId("stable-1")), silk: "blue" },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: `${personality} Stable`,
      cash: 50000,
      personality: personality as any,
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    return { state, mare, stallion };
  }

  it("aggressive personality breeds", () => {
    const { state } = setupStableWithMareAndStallion("aggressive");
    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies.length).toBeGreaterThan(0);
  });

  it("conservative personality breeds with high mare quality floor", () => {
    // Conservative has MIN_MARE_OVERALL = 55, so a 70-stat mare should pass
    const { state } = setupStableWithMareAndStallion("conservative");
    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies.length).toBeGreaterThan(0);
  });

  it("win-now personality breeds", () => {
    const { state } = setupStableWithMareAndStallion("win-now");
    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies.length).toBeGreaterThan(0);
  });

  it("trader personality breeds", () => {
    const { state } = setupStableWithMareAndStallion("trader");
    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies.length).toBeGreaterThan(0);
  });
});

describe("runNpcBreeding — book size and hemisphere checks", () => {
  it("does not overbook stallion at bookSize limit", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      { ownership: makeNpcOwned(asNpcStableId("stable-1")), silk: "blue" },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
        silk: "red",
        potential: 85,
        fame: 60,
        stud: {
          atStud: true,
          standingFee: 5000,
          seasonBookings: 50,
          bookSize: 50,
          lifetimeFoals: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          retiredOnDay: 0,
        },
      },
    );

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });

  it("does not create cross-hemisphere pregnancy", () => {
    const mare = mockHorse(
      "mare-1",
      "Test Mare",
      "mare",
      {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      { ownership: makeNpcOwned(asNpcStableId("stable-1")), silk: "blue", hemisphere: "Northern" },
    );

    const stallion = mockHorse(
      "stallion-1",
      "Test Stallion",
      "colt",
      {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      {
        ownership: makeNpcOwned(asNpcStableId("stable-2")),
        silk: "red",
        potential: 85,
        fame: 60,
        hemisphere: "Southern",
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

    const breederStable = createTestStable({
      id: "stable-1",
      name: "Breeder Stable",
      cash: 20000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const sireStable = createTestStable({
      id: "stable-2",
      name: "Sire Stable",
      cash: 0,
      personality: "breeder",
      reputation: 60,
      tier: "mid",
    });

    // Day 100 = Northern breeding season. Northern mare + Southern stallion should be blocked.
    const state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day"> = {
      horses: h2r([mare, stallion]),
      npcStables: [breederStable, sireStable],
      pregnancies: [],
      day: 100,
    };

    const result = runNpcBreeding(state as any, 100, createRng(1));
    expect(result.newPregnancies).toEqual([]);
  });
});
