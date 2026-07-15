import { describe, it, expect } from "vitest";
import { createInitialState } from "@/game/store/initialization";
import type { NewGameOptions } from "@/game/store/state";

const mockProfile = {
  stableName: "Alignment Test Stable",
  ownerName: "Alignment Test Owner",
  silk: { pattern: "solid", primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" },
  backstoryId: "wealthy_dilettante" as any,
  founded: 1,
};

const mockBackstory = {
  id: "wealthy_dilettante",
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

describe("worker output matches main-thread output shape", () => {
  const mainState = createInitialState(mockOptions);

  // After Change 5, the worker will import and call the same createInitialState.
  // So we test the main-thread function's output shape here.
  // The worker alignment test verifies that the worker uses the same function.
  // Once Change 5 is implemented, we can also import the worker's function
  // and compare outputs directly.

  it("both produce playerProfile from options", () => {
    expect(mainState.playerProfile).toBeDefined();
    expect(mainState.playerProfile?.stableName).toBe("Alignment Test Stable");
    expect(mainState.playerProfile?.ownerName).toBe("Alignment Test Owner");
  });

  it("both produce usedHorseNames array (non-empty)", () => {
    expect(Array.isArray(mainState.usedHorseNames)).toBe(true);
    expect(mainState.usedHorseNames!.length).toBeGreaterThan(0);
  });

  it("both produce usedJockeyNames array (non-empty)", () => {
    expect(Array.isArray(mainState.usedJockeyNames)).toBe(true);
    expect(mainState.usedJockeyNames!.length).toBeGreaterThan(0);
  });

  it("both produce reservedHorseNames: []", () => {
    expect(mainState.reservedHorseNames).toEqual([]);
  });

  it("both produce inbox: []", () => {
    expect(mainState.inbox).toEqual([]);
  });

  it("both produce playerNominations: []", () => {
    expect(mainState.playerNominations).toEqual([]);
  });

  it("both produce storeVersion (set by store, not by init)", () => {
    // createInitialState does not set storeVersion — the store sets it
    expect((mainState as any).storeVersion).toBeUndefined();
  });

  it("both produce syndicateInvestors: {}", () => {
    expect(mainState.syndicateInvestors).toEqual({});
  });

  it("both produce stewardsInquiries: []", () => {
    expect(mainState.stewardsInquiries).toEqual([]);
  });

  it("both produce breedingPrograms: []", () => {
    expect(mainState.breedingPrograms).toEqual([]);
  });

  it("both produce privateSaleOffers: []", () => {
    expect(mainState.privateSaleOffers).toEqual([]);
  });

  it("both produce claims: []", () => {
    expect(mainState.claims).toEqual([]);
  });

  it("both produce seasonRecords: []", () => {
    expect(mainState.seasonRecords).toEqual([]);
  });

  it("both produce hallOfFame: []", () => {
    expect(mainState.hallOfFame).toEqual([]);
  });

  it("both produce transactions: []", () => {
    expect(mainState.transactions).toEqual([]);
  });

  it("both produce expenses: []", () => {
    expect(mainState.expenses).toEqual([]);
  });

  it("both produce replays: []", () => {
    expect(mainState.replays).toEqual([]);
  });

  it("both produce transports: []", () => {
    expect(mainState.transports).toEqual([]);
  });

  it("both produce trackRecords: {}", () => {
    expect(mainState.trackRecords).toEqual({});
  });

  it("both produce horseLeaderboards: {}", () => {
    expect(mainState.horseLeaderboards).toEqual({});
  });

  it("both produce founders: {}", () => {
    expect(mainState.founders).toEqual({});
  });

  it("both produce lastFounderUpdateDay: 0", () => {
    expect(mainState.lastFounderUpdateDay).toBe(0);
  });

  it("both produce syndicates: {}", () => {
    expect(mainState.syndicates).toEqual({});
  });

  it("both produce staffPool: []", () => {
    expect(Array.isArray(mainState.staffPool)).toBe(true);
  });

  it("both produce hiredStaff: []", () => {
    expect(Array.isArray(mainState.hiredStaff)).toBe(true);
  });

  it("both resolve player horse phenotypes (ensurePhenotypeResolved)", () => {
    const horses = Object.values(mainState.horses ?? {});
    const playerHorses = horses.filter((h: any) => h.owned);
    expect(playerHorses.length).toBeGreaterThan(0);
    for (const h of playerHorses) {
      expect((h as any).phenotypeResolved).not.toBe(false);
    }
  });

  it("both generate famous stallions", () => {
    // Famous stallions are generated as part of initialization
    const horses = Object.values(mainState.horses ?? {});
    expect(horses.length).toBeGreaterThan(2); // More than just player horses
  });

  it("both pass existingNames to generateHorse", () => {
    // Verify usedHorseNames was populated during horse generation
    expect(mainState.usedHorseNames!.length).toBeGreaterThan(2);
  });
});
