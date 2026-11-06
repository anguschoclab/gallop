import { describe, it, expect } from "vitest";
import {
  validateSyndicateCreation,
  validateSharePurchase,
  validateShareSale,
  computeBuyoutPrice,
} from "@/domains/breeding/simulation/syndicateActions";
import type { Horse } from "@/platform/game/types";

describe("syndicateActions", () => {
  describe("validateSyndicateCreation", () => {
    it("fails if stallion is not provided", () => {
      const result = validateSyndicateCreation({
        stallion: undefined,
        existingSyndicate: null,
      });
      expect(result).toEqual({ ok: false, reason: "Stallion not found." });
    });

    it("fails if stallion has no G1 wins", () => {
      const result = validateSyndicateCreation({
        stallion: { raceHistory: [] } as unknown as Horse,
        existingSyndicate: null,
      });
      expect(result).toEqual({ ok: false, reason: "Stallion must be a G1 winner to syndicate." });
    });

    it("fails if stallion is already syndicated", () => {
      const result = validateSyndicateCreation({
        stallion: { raceHistory: [{ grade: "G1", position: 1 }] } as unknown as Horse,
        existingSyndicate: {},
      });
      expect(result).toEqual({ ok: false, reason: "Stallion is already syndicated." });
    });

    it("succeeds if valid G1 winner and not syndicated", () => {
      const result = validateSyndicateCreation({
        stallion: { raceHistory: [{ grade: "G1", position: 1 }] } as unknown as Horse,
        existingSyndicate: null,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateSharePurchase", () => {
    it("fails if syndicate does not exist", () => {
      const result = validateSharePurchase({
        syndicateExists: false,
        cash: 1000,
        shares: 1,
        pricePerShare: 100,
      });
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("fails if insufficient cash", () => {
      const result = validateSharePurchase({
        syndicateExists: true,
        cash: 100,
        shares: 2,
        pricePerShare: 100,
      });
      expect(result).toEqual({ ok: false, reason: "Insufficient cash to purchase shares." });
    });

    it("succeeds with valid purchase", () => {
      const result = validateSharePurchase({
        syndicateExists: true,
        cash: 500,
        shares: 2,
        pricePerShare: 100,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateShareSale", () => {
    it("fails if syndicate does not exist", () => {
      const result = validateShareSale({
        syndicateExists: false,
        playerShares: 5,
        shares: 2,
      });
      expect(result).toEqual({ ok: false, reason: "Syndicate not found." });
    });

    it("fails if selling more shares than owned", () => {
      const result = validateShareSale({
        syndicateExists: true,
        playerShares: 1,
        shares: 2,
      });
      expect(result).toEqual({ ok: false, reason: "You don't own enough shares." });
    });

    it("succeeds with valid sale", () => {
      const result = validateShareSale({
        syndicateExists: true,
        playerShares: 5,
        shares: 2,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("computeBuyoutPrice", () => {
    it("calculates price correctly with partial satisfaction", () => {
      const result = computeBuyoutPrice({
        sharePrice: 1000,
        investorShares: 5,
        investorSatisfaction: 50,
      });
      expect(result).toEqual({ price: 6500 });
    });

    it("calculates price correctly with max satisfaction", () => {
      const result = computeBuyoutPrice({
        sharePrice: 1000,
        investorShares: 5,
        investorSatisfaction: 100,
      });
      expect(result).toEqual({ price: 9000 });
    });

    it("calculates price correctly with zero satisfaction", () => {
      const result = computeBuyoutPrice({
        sharePrice: 1000,
        investorShares: 5,
        investorSatisfaction: 0,
      });
      expect(result).toEqual({ price: 4000 });
    });
  });
});
