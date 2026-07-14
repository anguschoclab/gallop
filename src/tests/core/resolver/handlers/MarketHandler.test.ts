import { describe, it, expect } from "vitest";
import { MarketHandler } from "@/core/resolver/handlers/MarketHandler";
import type { GameState } from "@/game/store/state";
import type {
  ScoutReportImpact,
  ConsignmentImpact,
  ConsignmentWithdrawalImpact,
  AuctionResolutionImpact,
} from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("MarketHandler", () => {
  it("scout_report pushes report to draft.scoutReports", () => {
    const handler = new MarketHandler();
    const state = { scoutReports: [], horses: {} } as unknown as GameState;

    const impact: ScoutReportImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "scout_report",
      report: {
        horseId: "horse-1",
        stableId: "stable-1",
        day: 10,
        rating: 85,
        notes: "Good horse",
      } as any,
      reason: "Scout report",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.scoutReports).toHaveLength(1);
    expect(draft.scoutReports[0].horseId).toBe("horse-1");
  });

  it("consignment sets horse.consignedSaleId and adds lot to auction", () => {
    const handler = new MarketHandler();
    const state = {
      scoutReports: [],
      horses: h2r([{ id: "horse-1", name: "Star" }] as unknown as Horse[]),
      auctions: [{ id: "sale-1", lots: [] }],
    } as unknown as GameState;

    const impact: ConsignmentImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "consignment",
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 50000,
      consignorStableId: "player",
      breezeSeconds: 11.2,
      reason: "Consigned to sale",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses[0].consignedSaleId).toBe("sale-1");
    expect(draft.auctions[0].lots).toHaveLength(1);
    expect(draft.auctions[0].lots[0].horseId).toBe("horse-1");
    expect(draft.auctions[0].lots[0].reservePrice).toBe(50000);
  });

  it("consignment_withdrawal clears horse.consignedSaleId and removes lot", () => {
    const handler = new MarketHandler();
    const state = {
      scoutReports: [],
      horses: h2r([{ id: "horse-1", name: "Star", consignedSaleId: "sale-1" }] as unknown as Horse[]),
      auctions: [
        {
          id: "sale-1",
          lots: [
            { id: "lot-1", horseId: "horse-1", saleId: "sale-1", passed: false, withdrawn: false },
          ],
        },
      ],
    } as unknown as GameState;

    const impact: ConsignmentWithdrawalImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "managementResolution",
      logLevel: "always",
      type: "consignment_withdrawal",
      horseId: "horse-1",
      saleId: "sale-1",
      reason: "Withdrawn",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses[0].consignedSaleId).toBeUndefined();
    expect(draft.auctions[0].lots).toHaveLength(0);
  });

  it("auction_resolution updates lot with hammer price and soldToStableId", () => {
    const handler = new MarketHandler();
    const state = {
      scoutReports: [],
      horses: {},
      auctions: [
        {
          id: "sale-1",
          lots: [
            { id: "lot-1", horseId: "horse-1", saleId: "sale-1", passed: false, withdrawn: false },
          ],
        },
      ],
    } as unknown as GameState;

    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "raceResolution",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 75000,
      soldToStableId: "stable-2",
      passed: false,
      bidHistory: [
        { stableId: "s1", amount: 70000, tick: 1 },
        { stableId: "stable-2", amount: 75000, tick: 2 },
      ],
      wasPlayerConsignment: false,
      reason: "Auction resolved",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const lot = draft.auctions[0].lots[0];
    expect(lot.hammerPrice).toBe(75000);
    expect(lot.soldToStableId).toBe("stable-2");
    expect(lot.passed).toBe(false);
    expect(lot.bidHistory).toHaveLength(2);
  });

  it("auction_resolution with wasPlayerConsignment clears horse.consignedSaleId", () => {
    const handler = new MarketHandler();
    const state = {
      scoutReports: [],
      horses: h2r([{ id: "horse-1", name: "Star", consignedSaleId: "sale-1" }] as unknown as Horse[]),
      auctions: [
        {
          id: "sale-1",
          lots: [
            { id: "lot-1", horseId: "horse-1", saleId: "sale-1", passed: false, withdrawn: false },
          ],
        },
      ],
    } as unknown as GameState;

    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "raceResolution",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 0,
      soldToStableId: undefined,
      passed: true,
      wasPlayerConsignment: true,
      reason: "Auction passed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses[0].consignedSaleId).toBeUndefined();
    expect(draft.auctions[0].lots[0].passed).toBe(true);
  });

  it("canHandle returns true for market impact types only", () => {
    const handler = new MarketHandler();
    expect(handler.canHandle("scout_report")).toBe(true);
    expect(handler.canHandle("consignment")).toBe(true);
    expect(handler.canHandle("consignment_withdrawal")).toBe(true);
    expect(handler.canHandle("auction_resolution")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});
