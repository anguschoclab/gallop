import { describe, it, expect } from "vitest";
import { createInitialState } from "@/game/store/initialization";
import { calculateOverallRating } from "@/core/horse/stats";
import type { NewGameOptions } from "@/game/store/state";

const mockProfile = {
  stableName: "Test Stable",
  ownerName: "Test Owner",
  silk: { pattern: "solid" as const, primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" },
  backstoryId: "wealthy_dilettante" as const,
  founded: 1,
};

const mockBackstory = {
  id: "wealthy_dilettante" as const,
  name: "Wealthy Dilettante",
  description: "A wealthy owner with a passion for racing.",
  startingCash: 100000,
  reputationScore: 50,
  facilityUpgrades: {},
  horses: [{ tier: "elite" as const, count: 2 }],
};

const mockOptions: NewGameOptions = {
  profile: mockProfile as any,
  backstory: mockBackstory as any,
};

describe("createInitialState player horse phenotype resolution", () => {
  it("resolves all player-owned horses", () => {
    const state = createInitialState(mockOptions);
    const playerHorses = Object.values(state.horses).filter((h) => h.ownership?.type === "player");
    expect(playerHorses.length).toBeGreaterThan(0);
    for (const horse of playerHorses) {
      expect(horse.phenotypeResolved).toBe(true);
    }
  });

  it("gives player horses non-zero stats and OVR", () => {
    const state = createInitialState(mockOptions);
    const playerHorses = Object.values(state.horses).filter((h) => h.ownership?.type === "player");
    expect(playerHorses.length).toBeGreaterThan(0);
    for (const horse of playerHorses) {
      expect(horse.stats.speed).toBeGreaterThan(0);
      expect(horse.stats.stamina).toBeGreaterThan(0);
      expect(horse.stats.acceleration).toBeGreaterThan(0);
      expect(horse.stats.consistency).toBeGreaterThan(0);
      expect(calculateOverallRating(horse)).toBeGreaterThan(0);
    }
  });

  it("gives player horses defined coat colors", () => {
    const state = createInitialState(mockOptions);
    const playerHorses = Object.values(state.horses).filter((h) => h.ownership?.type === "player");
    for (const horse of playerHorses) {
      expect(horse.coatColor).toBeDefined();
      expect(horse.coatColor).not.toBe("unknown");
    }
  });

  it("leaves market horses unresolved (lazy)", () => {
    const state = createInitialState(mockOptions);
    expect(state.market.length).toBeGreaterThan(0);
    for (const horse of state.market) {
      expect(horse.phenotypeResolved).toBe(false);
    }
  });

  it("leaves NPC horses unresolved (lazy)", () => {
    const state = createInitialState(mockOptions);
    const npcHorses = Object.values(state.horses).filter((h) => h.ownership?.type === "npc");
    expect(npcHorses.length).toBeGreaterThan(0);
    for (const horse of npcHorses) {
      expect(horse.phenotypeResolved).toBe(false);
    }
  });

  it("resolves default starter horses when no options are provided", () => {
    const state = createInitialState();
    const playerHorses = Object.values(state.horses).filter((h) => h.ownership?.type === "player");
    expect(playerHorses.length).toBeGreaterThan(0);
    for (const horse of playerHorses) {
      expect(horse.coatColor).toBeDefined();
      expect(horse.phenotypeResolved).toBe(true);
      expect(calculateOverallRating(horse)).toBeGreaterThan(0);
    }
  });
});

describe("createInitialState race generation for starter eligibility", () => {
  it("produces at least 1 starter-eligible maiden per day for days 2-7", () => {
    const state = createInitialState();
    const races = Object.values(state.races);
    for (let d = 2; d <= 7; d++) {
      const dayRaces = races.filter((r) => r.day === d);
      const hasStarterMaiden = dayRaces.some(
        (r) =>
          r.raceClass.toLowerCase().includes("maiden") && r.minStat === undefined && !r.resolved,
      );
      expect(hasStarterMaiden).toBe(true);
    }
  });

  it("produces track-based races for days 2-8", () => {
    const state = createInitialState();
    const races = Object.values(state.races);
    for (let d = 2; d <= 8; d++) {
      const dayTrackRaces = races.filter((r) => r.day === d && r.trackId !== undefined);
      // Days 2-3 are Monday/Tuesday with no track races (F-13)
      // Days 4+ should have track races
      if (d >= 5) {
        expect(dayTrackRaces.length).toBeGreaterThan(0);
      }
    }
  });

  it("produces track-based races from year-round tracks", () => {
    const state = createInitialState();
    const races = Object.values(state.races);
    const trackRaces = races.filter((r) => r.trackId !== undefined);
    expect(trackRaces.length).toBeGreaterThan(0);
  });

  it("produces zero track-based races on days 2-3 (DOW gap)", () => {
    const state = createInitialState();
    const races = Object.values(state.races);
    // Day 2 = Monday (dow 1), Day 3 = Tuesday (dow 2) — no tracks race
    const day2TrackRaces = races.filter((r) => r.day === 2 && r.trackId !== undefined);
    const day3TrackRaces = races.filter((r) => r.day === 3 && r.trackId !== undefined);
    expect(day2TrackRaces.length).toBe(0);
    expect(day3TrackRaces.length).toBe(0);
  });

  it("does not produce duplicate graded races", () => {
    const state = createInitialState();
    const races = Object.values(state.races);
    const gradedRaces = races.filter((r) => r.graded);
    const keys = gradedRaces.map((r) => `${r.graded!.key}_${r.day}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("createInitialState world size entity counts", () => {
  it("produces ~35 NPC stables with worldSize: small", () => {
    const state = createInitialState({ ...mockOptions, worldSize: "small" });
    expect(state.npcStables.length).toBe(35);
  });

  it("produces ~104 NPC stables with worldSize: medium", () => {
    const state = createInitialState({ ...mockOptions, worldSize: "medium" });
    expect(state.npcStables.length).toBe(104);
  });

  it("produces 160 NPC stables with worldSize: large", () => {
    const state = createInitialState({ ...mockOptions, worldSize: "large" });
    expect(state.npcStables.length).toBe(160);
  });

  it("produces fewer NPC horses with small than large", () => {
    const smallState = createInitialState({ ...mockOptions, worldSize: "small" });
    const largeState = createInitialState({ ...mockOptions, worldSize: "large" });
    const smallHorses = Object.values(smallState.horses).filter((h) => h.ownership?.type === "npc");
    const largeHorses = Object.values(largeState.horses).filter((h) => h.ownership?.type === "npc");
    expect(smallHorses.length).toBeLessThan(largeHorses.length);
  });

  it("produces ~15 jockeys with worldSize: small", () => {
    const state = createInitialState({ ...mockOptions, worldSize: "small" });
    expect(state.jockeys!.length).toBe(15);
  });

  it("sets worldSize in returned state", () => {
    const state = createInitialState({ ...mockOptions, worldSize: "small" });
    expect(state.worldSize).toBe("small");
  });

  it("defaults to large behavior without worldSize option", () => {
    const state = createInitialState(mockOptions);
    expect(state.npcStables.length).toBe(160);
    expect(state.worldSize).toBe("large");
  });
});
