import { describe, it, expect, vi } from "vitest";
import {
  validateConsignment,
  validateWithdrawal,
  validateBookBid,
  validateBuyNow,
  buildBookBidLogText,
  buildAuctionResolutionLogText,
} from "@/core/auction/auctionActions";
import type { Horse, AuctionSale, AuctionLot } from "@/game/types";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";

vi.mock("@/core/horse/pricing", () => ({
  horseMarketValue: vi.fn(() => 10000),
}));

describe("auctionActions", () => {
  describe("validateConsignment", () => {
    it("fails if horse is missing", () => {
      const result = validateConsignment({
        horse: undefined,
        sale: {} as AuctionSale,
        allHorses: [],
      });
      expect(result).toEqual({ ok: false, reason: "Horse not found." });
    });

    it("fails if horse is already consigned", () => {
      const result = validateConsignment({
        horse: { consignedSaleId: "sale-1" } as Horse,
        sale: {} as AuctionSale,
        allHorses: [],
      });
      expect(result).toEqual({ ok: false, reason: "Already consigned to a sale." });
    });

    it("fails if sale is missing", () => {
      const result = validateConsignment({
        horse: {} as Horse,
        sale: undefined,
        allHorses: [],
      });
      expect(result).toEqual({ ok: false, reason: "Sale not found." });
    });

    it("fails if sale is resolved", () => {
      const result = validateConsignment({
        horse: {} as Horse,
        sale: { resolved: true } as AuctionSale,
        allHorses: [],
      });
      expect(result).toEqual({ ok: false, reason: "Sale already resolved." });
    });

    it("succeeds and computes reserve price", () => {
      const result = validateConsignment({
        horse: {} as Horse,
        sale: { resolved: false } as AuctionSale,
        allHorses: [],
      });
      expect(result).toEqual({
        ok: true,
        reservePrice: Math.round(10000 * DEFAULT_PLAYER_RESERVE_RATIO),
      });
    });

    it("uses provided reservePrice if available", () => {
      const result = validateConsignment({
        horse: {} as Horse,
        sale: { resolved: false } as AuctionSale,
        allHorses: [],
        reservePrice: 15000,
      });
      expect(result).toEqual({
        ok: true,
        reservePrice: 15000,
      });
    });
  });

  describe("validateWithdrawal", () => {
    it("fails if horse is missing", () => {
      const result = validateWithdrawal({ horse: undefined, sale: {} as AuctionSale });
      expect(result).toEqual({ ok: false, reason: "Horse not found." });
    });

    it("fails if horse is not consigned", () => {
      const result = validateWithdrawal({ horse: {} as Horse, sale: {} as AuctionSale });
      expect(result).toEqual({ ok: false, reason: "Horse not consigned." });
    });

    it("fails if sale is missing", () => {
      const result = validateWithdrawal({
        horse: { consignedSaleId: "sale-1" } as Horse,
        sale: undefined,
      });
      expect(result).toEqual({ ok: false, reason: "Sale not found." });
    });

    it("fails if sale is resolved", () => {
      const result = validateWithdrawal({
        horse: { consignedSaleId: "sale-1" } as Horse,
        sale: { resolved: true } as AuctionSale,
      });
      expect(result).toEqual({ ok: false, reason: "Sale already resolved." });
    });

    it("succeeds when conditions are met", () => {
      const result = validateWithdrawal({
        horse: { consignedSaleId: "sale-1" } as Horse,
        sale: { resolved: false } as AuctionSale,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateBookBid", () => {
    it("fails if sale is missing", () => {
      const result = validateBookBid({
        sale: undefined,
        lot: {} as AuctionLot,
        cash: 1000,
        amount: 500,
      });
      expect(result).toEqual({ ok: false, reason: "Sale not found." });
    });

    it("fails if sale is resolved", () => {
      const result = validateBookBid({
        sale: { resolved: true } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 1000,
        amount: 500,
      });
      expect(result).toEqual({ ok: false, reason: "Sale already resolved." });
    });

    it("fails if lot is missing", () => {
      const result = validateBookBid({
        sale: { resolved: false } as AuctionSale,
        lot: undefined,
        cash: 1000,
        amount: 500,
      });
      expect(result).toEqual({ ok: false, reason: "Lot not found." });
    });

    it("fails if lot is withdrawn", () => {
      const result = validateBookBid({
        sale: { resolved: false } as AuctionSale,
        lot: { withdrawn: true } as AuctionLot,
        cash: 1000,
        amount: 500,
      });
      expect(result).toEqual({ ok: false, reason: "Lot not available." });
    });

    it("fails if cash is insufficient", () => {
      const result = validateBookBid({
        sale: { resolved: false } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 100,
        amount: 500,
      });
      expect(result).toEqual({ ok: false, reason: "Insufficient funds." });
    });

    it("succeeds when conditions are met", () => {
      const result = validateBookBid({
        sale: { resolved: false } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 1000,
        amount: 500,
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe("validateBuyNow", () => {
    it("fails if sale is missing", () => {
      const result = validateBuyNow({ sale: undefined, lot: {} as AuctionLot, cash: 10000 });
      expect(result).toEqual({ ok: false, reason: "sale_not_found" });
    });

    it("fails if sale is resolved", () => {
      const result = validateBuyNow({
        sale: { resolved: true } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "sale_resolved" });
    });

    it("fails if sale is broodmare", () => {
      const result = validateBuyNow({
        sale: { resolved: false, kind: "broodmare" } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "buy_now_unavailable" });
    });

    it("fails if lot is missing", () => {
      const result = validateBuyNow({
        sale: { resolved: false } as AuctionSale,
        lot: undefined,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "lot_not_found" });
    });

    it("fails if lot has no buyNowPrice", () => {
      const result = validateBuyNow({
        sale: { resolved: false } as AuctionSale,
        lot: {} as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "buy_now_unavailable" });
    });

    it("fails if cash is insufficient", () => {
      const result = validateBuyNow({
        sale: { resolved: false } as AuctionSale,
        lot: { buyNowPrice: 20000 } as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "insufficient_funds" });
    });

    it("fails if lot is withdrawn", () => {
      const result = validateBuyNow({
        sale: { resolved: false } as AuctionSale,
        lot: { buyNowPrice: 5000, withdrawn: true } as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: false, reason: "lot_not_available" });
    });

    it("succeeds when conditions are met", () => {
      const result = validateBuyNow({
        sale: { resolved: false } as AuctionSale,
        lot: { buyNowPrice: 5000 } as AuctionLot,
        cash: 10000,
      });
      expect(result).toEqual({ ok: true, buyNowPrice: 5000 });
    });
  });

  describe("buildBookBidLogText", () => {
    it("returns correct formatted string", () => {
      expect(buildBookBidLogText(5000, "lot1", "My Sale")).toBe(
        "Book bid of $5,000 placed on lot lot1 in My Sale.",
      );
    });
  });

  describe("buildAuctionResolutionLogText", () => {
    it("returns correct formatted string", () => {
      expect(buildAuctionResolutionLogText("My Sale")).toBe("Auction My Sale resolved.");
    });
  });
});
