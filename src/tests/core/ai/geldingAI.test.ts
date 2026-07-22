import { describe, it, expect } from "vitest";
import { createGeldingAIState, shouldGeldHorse } from "@/core/ai/geldingAI";
import type { Stable, Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { hashStr } from "@/core/common/rng";

function mkStable(personality: Stable["personality"]): Stable {
  return {
    id: "s1",
    name: "Test Stable",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 1000,
    horses: [],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality,
    owner: "Owner",
    staff: { veterinarian: null, farrier: null, nutritionist: null, groom: null, trainer: null },
    outposts: [],
  };
}

describe("geldingAI", () => {
  describe("createGeldingAIState", () => {
    it("initializes state based on stable personality", () => {
      const stable = mkStable("aggressive");
      const state = createGeldingAIState(stable);
      expect(state.personalityState.personality).toBe("aggressive");
    });
  });

  describe("shouldGeldHorse", () => {
    it("rejects non-male horses", () => {
      const stable = mkStable("conservative");
      const aiState = createGeldingAIState(stable);

      const filly = createTestHorse({ id: "h1", gender: "filly", age: 3, potential: 50 });
      const mare = createTestHorse({ id: "h2", gender: "mare", age: 4, potential: 50 });
      const gelding = createTestHorse({ id: "h3", gender: "gelding", age: 3, potential: 50 });
      const geldedColt = createTestHorse({
        id: "h4",
        gender: "colt",
        gelded: true,
        age: 3,
        potential: 50,
      });

      // We need to match the deterministic day for these IDs
      const getValidDay = (id: string) => Math.abs(hashStr(id + "_gelding")) % 30;

      expect(shouldGeldHorse(aiState, filly, getValidDay("h1"))).toBe(false);
      expect(shouldGeldHorse(aiState, mare, getValidDay("h2"))).toBe(false);
      expect(shouldGeldHorse(aiState, gelding, getValidDay("h3"))).toBe(false);
      expect(shouldGeldHorse(aiState, geldedColt, getValidDay("h4"))).toBe(false);
    });

    it("rejects horses standing at stud", () => {
      const stable = mkStable("aggressive");
      const aiState = createGeldingAIState(stable);

      const horse = createTestHorse({
        id: "h1",
        gender: "horse",
        age: 5,
        potential: 50,
        stud: {
          atStud: true,
          standingFee: 1000,
          bookSize: 100,
          seasonBookings: 0,
          lifetimeFoals: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
        },
      });
      const day = Math.abs(hashStr("h1_gelding")) % 30;

      expect(shouldGeldHorse(aiState, horse, day)).toBe(false);
    });

    it("rejects horses outside age 2-5", () => {
      const stable = mkStable("conservative");
      const aiState = createGeldingAIState(stable);

      const yearling = createTestHorse({ id: "h1", gender: "colt", age: 1, potential: 50 });
      const oldHorse = createTestHorse({ id: "h2", gender: "horse", age: 6, potential: 50 });

      expect(shouldGeldHorse(aiState, yearling, Math.abs(hashStr("h1_gelding")) % 30)).toBe(false);
      expect(shouldGeldHorse(aiState, oldHorse, Math.abs(hashStr("h2_gelding")) % 30)).toBe(false);
    });

    it("respects breeder potential threshold (70)", () => {
      const stable = mkStable("breeder");
      const aiState = createGeldingAIState(stable);

      const coltUnder = createTestHorse({ id: "h1", gender: "colt", age: 3, potential: 69 });
      const coltOver = createTestHorse({ id: "h2", gender: "colt", age: 3, potential: 70 });

      expect(shouldGeldHorse(aiState, coltUnder, Math.abs(hashStr("h1_gelding")) % 30)).toBe(true);
      expect(shouldGeldHorse(aiState, coltOver, Math.abs(hashStr("h2_gelding")) % 30)).toBe(false);
    });

    it("respects aggressive potential threshold (78)", () => {
      const stable = mkStable("aggressive");
      const aiState = createGeldingAIState(stable);

      const coltUnder = createTestHorse({ id: "h1", gender: "colt", age: 3, potential: 77 });
      const coltOver = createTestHorse({ id: "h2", gender: "colt", age: 3, potential: 78 });

      expect(shouldGeldHorse(aiState, coltUnder, Math.abs(hashStr("h1_gelding")) % 30)).toBe(true);
      expect(shouldGeldHorse(aiState, coltOver, Math.abs(hashStr("h2_gelding")) % 30)).toBe(false);
    });

    it("respects default/conservative potential threshold (75)", () => {
      const stable = mkStable("conservative");
      const aiState = createGeldingAIState(stable);

      const coltUnder = createTestHorse({ id: "h1", gender: "colt", age: 3, potential: 74 });
      const coltOver = createTestHorse({ id: "h2", gender: "colt", age: 3, potential: 75 });

      expect(shouldGeldHorse(aiState, coltUnder, Math.abs(hashStr("h1_gelding")) % 30)).toBe(true);
      expect(shouldGeldHorse(aiState, coltOver, Math.abs(hashStr("h2_gelding")) % 30)).toBe(false);
    });

    it("staggers decisions via day hash", () => {
      const stable = mkStable("conservative");
      const aiState = createGeldingAIState(stable);

      const colt = createTestHorse({ id: "h1", gender: "colt", age: 3, potential: 50 });

      const targetDay = Math.abs(hashStr("h1_gelding")) % 30;

      expect(shouldGeldHorse(aiState, colt, targetDay)).toBe(true);
      expect(shouldGeldHorse(aiState, colt, targetDay + 1)).toBe(false);
    });
  });
});
