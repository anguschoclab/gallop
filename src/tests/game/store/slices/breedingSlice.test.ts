import { describe, it, expect, vi } from "vitest";
import { createBreedingSlice } from "@/game/store/slices/breedingSlice";
import { buildDefaultExpectations } from "@/core/breeding/investorTypes";
import type { StoreGet } from "@/game/store/types";

function makeMockState(overrides: Record<string, any> = {}) {
  return {
    day: 10,
    cash: 500000,
    horses: [],
    horseMap: new Map(),
    log: [],
    syndicates: {
      "syn-1": {
        id: "syn-1",
        stallionId: "h1",
        stallionName: "Champion",
        totalShares: 40,
        shareHolders: { player: 20 },
        sharePrice: 50000,
        studFee: 20000,
        isPublic: true,
        lifetimeEarnings: 0,
      },
    },
    syndicateInvestors: {},
    ...overrides,
  };
}

function makeMockStore(initialState: Record<string, any>) {
  let state = makeMockState(initialState);
  const get: StoreGet = () => state as any;
  const set = vi.fn((partial: any) => {
    if (typeof partial === "function") {
      state = { ...state, ...partial(state) };
    } else {
      state = { ...state, ...partial };
    }
  });
  const enqueueIntent = vi.fn();
  const slice = createBreedingSlice(set as any, get, enqueueIntent);
  return { slice, getState: () => state, set, enqueueIntent };
}

describe("breedingSlice — solicitInvestor", () => {
  describe("success path", () => {
    it("returns ok with investorId", () => {
      const { slice } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 5);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.investorId).toBe("string");
        expect(result.investorId).toMatch(/^inv-/);
      }
    });

    it("creates investor record in syndicateInvestors", () => {
      const { slice, getState } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 5);
      if (!result.ok) throw new Error("should succeed");
      const investors = (getState() as any).syndicateInvestors;
      const investor = investors[result.investorId];
      expect(investor).toBeDefined();
      expect(investor.syndicateId).toBe("syn-1");
      expect(investor.shares).toBe(5);
      expect(investor.investedCash).toBe(250000);
      expect(investor.joinedDay).toBe(10);
      expect(investor.satisfaction).toBe(70);
      expect(investor.stableId).toBe(result.investorId);
    });

    it("transfers shares from player to investor", () => {
      const { slice, getState } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 5);
      if (!result.ok) throw new Error("should succeed");
      const syndicate = (getState() as any).syndicates["syn-1"];
      expect(syndicate.shareHolders.player).toBe(15);
      expect(syndicate.shareHolders[result.investorId]).toBe(5);
    });

    it("adds cash to player", () => {
      const { slice, getState } = makeMockStore({});
      slice.solicitInvestor("syn-1", 5);
      expect((getState() as any).cash).toBe(750000);
    });

    it("adds a log entry", () => {
      const { slice, getState } = makeMockStore({});
      slice.solicitInvestor("syn-1", 5);
      const log = (getState() as any).log;
      expect(log).toHaveLength(1);
      expect(log[0].day).toBe(10);
      expect(log[0].text).toContain("shares");
      expect(log[0].text).toContain("Champion");
    });

    it("expectations are built via buildDefaultExpectations", () => {
      const { slice, getState } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 5);
      if (!result.ok) throw new Error("should succeed");
      const investor = (getState() as any).syndicateInvestors[result.investorId];
      const expected = buildDefaultExpectations(investor.personality, 5, 50000);
      expect(investor.expectations).toEqual(expected);
    });
  });

  describe("failure paths", () => {
    it("non-existent syndicate", () => {
      const { slice } = makeMockStore({});
      const result = slice.solicitInvestor("nonexistent", 5);
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("sharesOffered <= 0", () => {
      const { slice } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 0);
      expect(result).toEqual({ ok: false, reason: "Must offer at least one share." });
    });

    it("player shares < sharesOffered", () => {
      const { slice } = makeMockStore({});
      const result = slice.solicitInvestor("syn-1", 100);
      expect(result).toEqual({ ok: false, reason: "You don't own that many shares to sell." });
    });
  });
});

describe("breedingSlice — buyoutInvestor", () => {
  function makeStateWithInvestor(satisfaction: number, shares: number) {
    const investorId = "inv-test1";
    return {
      syndicates: {
        "syn-1": {
          id: "syn-1",
          stallionId: "h1",
          stallionName: "Champion",
          totalShares: 40,
          shareHolders: { player: 10, [investorId]: shares },
          sharePrice: 50000,
          studFee: 20000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
      syndicateInvestors: {
        [investorId]: {
          id: investorId,
          syndicateId: "syn-1",
          name: "Test Investor",
          stableId: investorId,
          personality: "conservative",
          shares,
          investedCash: shares * 50000,
          joinedDay: 5,
          satisfaction,
          expectations: [],
        },
      },
    };
  }

  describe("success path", () => {
    it("removes investor from syndicateInvestors", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(50, 5));
      const result = slice.buyoutInvestor("inv-test1");
      expect(result).toEqual({ ok: true });
      const investors = (getState() as any).syndicateInvestors;
      expect(investors["inv-test1"]).toBeUndefined();
    });

    it("returns investor shares to player", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(50, 5));
      slice.buyoutInvestor("inv-test1");
      const syndicate = (getState() as any).syndicates["syn-1"];
      expect(syndicate.shareHolders["inv-test1"]).toBeUndefined();
      expect(syndicate.shareHolders.player).toBe(15);
    });

    it("deducts cash correctly for satisfaction=50", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(50, 5));
      slice.buyoutInvestor("inv-test1");
      // price = round(50000 * 5 * (0.8 + 50/100)) = round(50000 * 5 * 1.3) = 325000
      expect((getState() as any).cash).toBe(500000 - 325000);
    });

    it("returns ok true", () => {
      const { slice } = makeMockStore(makeStateWithInvestor(50, 5));
      expect(slice.buyoutInvestor("inv-test1")).toEqual({ ok: true });
    });

    it("adds log entry with investor name and price", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(50, 5));
      slice.buyoutInvestor("inv-test1");
      const log = (getState() as any).log;
      expect(log).toHaveLength(1);
      expect(log[0].text).toContain("Test Investor");
      expect(log[0].text).toContain("325,000");
    });
  });

  describe("failure paths", () => {
    it("non-existent investor", () => {
      const { slice } = makeMockStore(makeStateWithInvestor(50, 5));
      const result = slice.buyoutInvestor("nonexistent");
      expect(result).toEqual({ ok: false, reason: "Investor not found." });
    });

    it("missing syndicate", () => {
      const { slice } = makeMockStore({
        ...makeStateWithInvestor(50, 5),
        syndicates: {},
      });
      const result = slice.buyoutInvestor("inv-test1");
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("insufficient cash", () => {
      const { slice } = makeMockStore({
        ...makeStateWithInvestor(50, 5),
        cash: 100,
      });
      const result = slice.buyoutInvestor("inv-test1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain("Insufficient cash");
        expect(result.reason).toContain("325,000");
      }
    });
  });

  describe("satisfaction factor", () => {
    it("satisfaction 100 → factor 1.8 (max price)", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(100, 5));
      slice.buyoutInvestor("inv-test1");
      // price = round(50000 * 5 * (0.8 + 100/100)) = round(50000 * 5 * 1.8) = 450000
      expect((getState() as any).cash).toBe(500000 - 450000);
    });

    it("satisfaction 0 → factor 0.8 (min price)", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(0, 5));
      slice.buyoutInvestor("inv-test1");
      // price = round(50000 * 5 * (0.8 + 0/100)) = round(50000 * 5 * 0.8) = 200000
      expect((getState() as any).cash).toBe(500000 - 200000);
    });

    it("satisfaction 50 → factor 1.3", () => {
      const { slice, getState } = makeMockStore(makeStateWithInvestor(50, 5));
      slice.buyoutInvestor("inv-test1");
      // price = round(50000 * 5 * 1.3) = 325000
      expect((getState() as any).cash).toBe(500000 - 325000);
    });
  });
});
