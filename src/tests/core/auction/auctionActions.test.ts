import { describe, it, expect, vi } from "vitest";
import {
  validateConsignment,
  validateWithdrawal,
  validateBookBid,
  validateBuyNow,
  buildBookBidLogText,
  buildAuctionResolutionLogText
} from "@/core/auction/auctionActions";
import type { Horse, AuctionSale, AuctionLot } from "@/game/types";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";

// Mock the external pricing function so we don't have to construct full Horse objects
vi.mock("@/core/horse/pricing", () => ({
  horseMarketValue: vi.fn(() => 10000),
}));

// Setup mocks
const mockHorse = { id: "h1", consignedSaleId: null } as unknown as Horse;
const mockConsignedHorse = { id: "h2", consignedSaleId: "s1" } as unknown as Horse;
const mockSale = { id: "s1", resolved: false, kind: "yearling" } as unknown as AuctionSale;
const mockBroodmareSale = { id: "s2", resolved: false, kind: "broodmare" } as unknown as AuctionSale;
const mockResolvedSale = { id: "s3", resolved: true } as unknown as AuctionSale;
const mockLot = { id: "lot1", withdrawn: false, passed: false, buyNowPrice: 1000, hammerPrice: undefined } as unknown as AuctionLot;
const mockWithdrawnLot = { id: "lot2", withdrawn: true, passed: false, buyNowPrice: 1000 } as unknown as AuctionLot;
const mockPassedLot = { id: "lot3", withdrawn: false, passed: true, buyNowPrice: 1000, hammerPrice: undefined } as unknown as AuctionLot;
const mockSoldLot = { id: "lot4", withdrawn: false, passed: false, buyNowPrice: 1000, hammerPrice: 800 } as unknown as AuctionLot;

describe("auctionActions", () => {
  describe("validateConsignment", () => {
    it("returns ok for valid input", () => {
      const result = validateConsignment({
        horse: mockHorse,
        sale: mockSale,
        allHorses: [mockHorse],
        reservePrice: 5000,
      });
      expect(result.ok).toBe(true);
      expect(result.reservePrice).toBe(5000);
    });

    it("computes reserve price if not provided based on DEFAULT_PLAYER_RESERVE_RATIO", () => {
      const result = validateConsignment({
        horse: mockHorse,
        sale: mockSale,
        allHorses: [mockHorse],
      });
      expect(result.ok).toBe(true);
      expect(result.reservePrice).toBe(10000 * DEFAULT_PLAYER_RESERVE_RATIO);
    });

    it("fails if horse already consigned", () => {
      const result = validateConsignment({
        horse: mockConsignedHorse,
        sale: mockSale,
        allHorses: [mockConsignedHorse],
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Already consigned to a sale.");
    });

    it("fails if sale is resolved", () => {
      const result = validateConsignment({
        horse: mockHorse,
        sale: mockResolvedSale,
        allHorses: [mockHorse],
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale already resolved.");
    });

    it("fails if horse is missing", () => {
      const result = validateConsignment({
        horse: undefined,
        sale: mockSale,
        allHorses: [],
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Horse not found.");
    });

    it("fails if sale is missing", () => {
      const result = validateConsignment({
        horse: mockHorse,
        sale: undefined,
        allHorses: [mockHorse],
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale not found.");
    });
  });

  describe("validateWithdrawal", () => {
    it("returns ok for valid withdrawal", () => {
      const result = validateWithdrawal({ horse: mockConsignedHorse, sale: mockSale });
      expect(result.ok).toBe(true);
    });

    it("fails if horse not consigned", () => {
      const result = validateWithdrawal({ horse: mockHorse, sale: mockSale });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Horse not consigned.");
    });

    it("fails if horse is missing", () => {
      const result = validateWithdrawal({ horse: undefined, sale: mockSale });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Horse not found.");
    });

    it("fails if sale is missing", () => {
      const result = validateWithdrawal({ horse: mockConsignedHorse, sale: undefined });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale not found.");
    });

    it("fails if sale is already resolved", () => {
      const result = validateWithdrawal({ horse: mockConsignedHorse, sale: mockResolvedSale });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale already resolved.");
    });
  });

  describe("validateBookBid", () => {
    it("returns ok for valid bid", () => {
      const result = validateBookBid({ sale: mockSale, lot: mockLot, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(true);
    });

    it("fails on insufficient funds", () => {
      const result = validateBookBid({ sale: mockSale, lot: mockLot, cash: 1000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Insufficient funds.");
    });

    it("fails if lot is withdrawn", () => {
      const result = validateBookBid({ sale: mockSale, lot: mockWithdrawnLot, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Lot not available.");
    });

    it("fails if lot is passed", () => {
      const result = validateBookBid({ sale: mockSale, lot: mockPassedLot, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Lot not available.");
    });

    it("fails if sale is missing", () => {
      const result = validateBookBid({ sale: undefined, lot: mockLot, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale not found.");
    });

    it("fails if sale is resolved", () => {
      const result = validateBookBid({ sale: mockResolvedSale, lot: mockLot, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Sale already resolved.");
    });

    it("fails if lot is missing", () => {
      const result = validateBookBid({ sale: mockSale, lot: undefined, cash: 5000, amount: 2000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Lot not found.");
    });
  });

  describe("validateBuyNow", () => {
    it("returns ok for valid buy now", () => {
      const result = validateBuyNow({ sale: mockSale, lot: mockLot, cash: 5000 });
      expect(result.ok).toBe(true);
      expect(result.buyNowPrice).toBe(1000);
    });

    it("fails for broodmare sale", () => {
      const result = validateBuyNow({ sale: mockBroodmareSale, lot: mockLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("buy_now_unavailable");
    });

    it("fails if sale is missing", () => {
      const result = validateBuyNow({ sale: undefined, lot: mockLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("sale_not_found");
    });

    it("fails if sale is resolved", () => {
      const result = validateBuyNow({ sale: mockResolvedSale, lot: mockLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("sale_resolved");
    });

    it("fails if lot is missing", () => {
      const result = validateBuyNow({ sale: mockSale, lot: undefined, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("lot_not_found");
    });

    it("fails if lot has no buyNowPrice", () => {
      const noBuyNowLot = { id: "lot1", withdrawn: false, passed: false, hammerPrice: undefined } as unknown as AuctionLot;
      const result = validateBuyNow({ sale: mockSale, lot: noBuyNowLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("buy_now_unavailable");
    });

    it("fails on insufficient funds", () => {
      const result = validateBuyNow({ sale: mockSale, lot: mockLot, cash: 500 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("insufficient_funds");
    });

    it("fails if lot is withdrawn", () => {
      const result = validateBuyNow({ sale: mockSale, lot: mockWithdrawnLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("lot_not_available");
    });

    it("fails if lot is passed", () => {
      const result = validateBuyNow({ sale: mockSale, lot: mockPassedLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("lot_not_available");
    });

    it("fails if lot is already sold", () => {
      const result = validateBuyNow({ sale: mockSale, lot: mockSoldLot, cash: 5000 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("lot_not_available");
    });
  });

  describe("buildBookBidLogText", () => {
    it("builds the correct log text", () => {
      expect(buildBookBidLogText(5000, "lot-123", "Spring Yearling Sale")).toBe(
        "Book bid of $5,000 placed on lot lot-123 in Spring Yearling Sale."
      );
    });
  });

  describe("buildAuctionResolutionLogText", () => {
    it("builds the correct log text", () => {
      expect(buildAuctionResolutionLogText("Spring Yearling Sale")).toBe(
        "Auction Spring Yearling Sale resolved."
      );
    });
  });
});
