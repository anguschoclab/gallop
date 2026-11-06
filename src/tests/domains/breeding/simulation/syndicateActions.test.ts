import { describe, it, expect } from "vitest";
import {
  validateSyndicateCreation,
  validateSharePurchase,
  validateShareSale,
  computeBuyoutPrice,
  buildBuyoutLogText,
  buildDevolutionLogText,
} from "@/domains/breeding/simulation/syndicateActions";
import type { Horse } from "@/platform/game/types";

describe("syndicateActions pure functions", () => {
  describe("validateSyndicateCreation", () => {
    it("rejects if stallion is undefined", () => {
      const result = validateSyndicateCreation({ stallion: undefined, existingSyndicate: null });
      expect(result).toEqual({ ok: false, reason: "Stallion not found." });
    });

    it("rejects if stallion has no G1 wins", () => {
      const stallion = { raceHistory: [] } as unknown as Horse;
      const result = validateSyndicateCreation({ stallion, existingSyndicate: null });
      expect(result).toEqual({ ok: false, reason: "Stallion must be a G1 winner to syndicate." });
    });

    it("rejects if syndicate already exists", () => {
      const stallion = {
        raceHistory: [{ grade: "G1", position: 1 }],
      } as unknown as Horse;
      const result = validateSyndicateCreation({ stallion, existingSyndicate: { id: "123" } });
      expect(result).toEqual({ ok: false, reason: "Stallion is already syndicated." });
    });

    it("allows valid stallion with G1 win and no existing syndicate", () => {
      const stallion = {
        raceHistory: [{ grade: "G1", position: 1 }],
      } as unknown as Horse;
      const result = validateSyndicateCreation({ stallion, existingSyndicate: null });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateSharePurchase", () => {
    it("rejects if syndicate does not exist", () => {
      const result = validateSharePurchase({
        syndicateExists: false,
        cash: 1000,
        shares: 1,
        pricePerShare: 100,
      });
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("rejects if player has insufficient cash", () => {
      const result = validateSharePurchase({
        syndicateExists: true,
        cash: 50,
        shares: 10,
        pricePerShare: 10,
      });
      expect(result).toEqual({ ok: false, reason: "Insufficient cash to purchase shares." });
    });

    it("allows if syndicate exists and player has sufficient cash", () => {
      const result = validateSharePurchase({
        syndicateExists: true,
        cash: 100,
        shares: 10,
        pricePerShare: 10,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateShareSale", () => {
    it("rejects if syndicate does not exist", () => {
      const result = validateShareSale({ syndicateExists: false, playerShares: 10, shares: 5 });
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("rejects if player tries to sell more shares than they own", () => {
      const result = validateShareSale({ syndicateExists: true, playerShares: 5, shares: 10 });
      expect(result).toEqual({ ok: false, reason: "You don't own enough shares." });
    });

    it("allows if syndicate exists and player has enough shares", () => {
      const result = validateShareSale({ syndicateExists: true, playerShares: 10, shares: 10 });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("computeBuyoutPrice", () => {
    it("computes buyout price based on share price, investor shares, and satisfaction", () => {
      // base factor = 0.8
      // MAX = 100
      // satisfaction = 50
      // factor = 0.8 + (50 / 100) = 1.3
      // price = Math.round(100 * 10 * 1.3) = 1300
      const result = computeBuyoutPrice({
        sharePrice: 100,
        investorShares: 10,
        investorSatisfaction: 50,
      });
      expect(result.price).toBe(1300); // 100 * 10 * (0.8 + 50/100) = 1300
    });
  });

  describe("buildBuyoutLogText", () => {
    it("builds the expected string", () => {
      expect(buildBuyoutLogText("John Doe", 1500, 10)).toBe(
        "Bought out John Doe for $1,500 (10 shares).",
      );
    });
  });

  describe("buildDevolutionLogText", () => {
    it("builds the expected string for 'player'", () => {
      expect(buildDevolutionLogText("Secretariat", "player")).toBe(
        "Syndicate: Secretariat ownership transferred to your stable (majority shareholder).",
      );
    });

    it("builds the expected string for other owners", () => {
      expect(buildDevolutionLogText("Secretariat", "NPC-123")).toBe(
        "Syndicate: Secretariat ownership transferred to NPC-123 (majority shareholder).",
      );
    });
  });
});
