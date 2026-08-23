import { describe, it, expect } from "vitest";
import { createInitialState } from "@/game/store/initialization";
import { BACKSTORIES } from "@/core/common/backstories";
import { UPKEEP_PER_HORSE } from "@/constants";
import { isPlayerOwned } from "@/core/horse/ownership";
import { calculateTotalMaintenance } from "@/core/facilities/facilityDefaults";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { buildAuctionImpacts } from "@/core/auction/auctionRunnerImpacts";
import { netProceeds } from "@/core/auction/engine";
import type { LotState } from "@/core/auction/auctionRunnerTypes";
import type { GameState, AuctionSale, Horse } from "@/game/types";
import type { NewGameOptions } from "@/game/store/state";
import type { CashImpact, AnyImpact } from "@/core/resolver/impacts/index";

const ALLOWED_POSITIVE_SOURCES = [
  "auction_proceeds_player",
  "Distressed sale of",
  "NPC bankruptcy",
  "LFG refund",
] as const;

const mockProfile = {
  stableName: "Test Stable",
  ownerName: "Test Owner",
  silk: { pattern: "solid" as const, primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" },
  backstoryId: "inheritor" as const,
  founded: 1,
};

function makeOptions(backstoryId: string): NewGameOptions {
  const backstory = BACKSTORIES.find((b) => b.id === backstoryId)!;
  return {
    profile: { ...mockProfile, backstoryId: backstory.id as any },
    backstory,
    worldSize: "small" as const,
  };
}

const CASH_CEILING_MULTIPLIER = 3;
const CASH_CEILING_FLAT = 5_000_000;
const CASH_FLOOR = -150_000;
const MAX_DAILY_DELTA = 10_000_000;
const RUN_DAYS = 90;

describe("Economy Invariant Tests", () => {
  describe("Test A — 90-day cash band per backstory", () => {
    for (const backstory of BACKSTORIES) {
      it(`${backstory.id}: cash stays within [${CASH_FLOOR}, startingCash * ${CASH_CEILING_MULTIPLIER} + $${CASH_CEILING_FLAT.toLocaleString()}] after ${RUN_DAYS} days`, () => {
        const options = makeOptions(backstory.id);
        const state = createInitialState(options);
        const startingCash = backstory.startingCash;
        const ceiling = startingCash * CASH_CEILING_MULTIPLIER + CASH_CEILING_FLAT;

        const { state: finalState } = runPipelineForDays(state, RUN_DAYS);

        expect(finalState.cash).toBeGreaterThanOrEqual(CASH_FLOOR);
        expect(finalState.cash).toBeLessThanOrEqual(ceiling);

        if (finalState.runEnded) {
          expect(finalState.runEndSnapshot).toBeDefined();
        }
      });
    }
  });

  describe("Test B — No horse billed to two owners", () => {
    it("inheritor: no horse appears in duplicate expenses per day and player upkeep matches exact daily cost", () => {
      const options = makeOptions("inheritor");
      const state = createInitialState(options);
      const { perDay } = runPipelineForDays(state, RUN_DAYS);

      let stateBefore = state;

      for (const dayResult of perDay) {
        const dayExpenses = (dayResult.state.expenses ?? []).filter((e) => e.day === dayResult.day);

        const horseIdsByDay = new Map<string, number>();
        for (const expense of dayExpenses) {
          const hid = expense.horseId;
          if (hid) {
            horseIdsByDay.set(hid, (horseIdsByDay.get(hid) ?? 0) + 1);
          }
        }

        for (const [horseId, count] of horseIdsByDay) {
          expect(count).toBe(1);
        }

        const playerHorseCount = Object.values(stateBefore.horses).filter(
          (h) => isPlayerOwned(h) && (!h.lifecycleStatus || h.lifecycleStatus === "active"),
        ).length;

        const facilityMaintenance = stateBefore.facilities
          ? calculateTotalMaintenance(stateBefore.facilities)
          : 0;

        const playerStaff = (stateBefore.hiredStaff ?? []).filter((s) => s.stableId === "");
        const playerStaffSalaries = playerStaff.reduce((sum, s) => sum + s.salary, 0);

        const expectedDailyCost =
          playerHorseCount * UPKEEP_PER_HORSE + facilityMaintenance + playerStaffSalaries;

        const upkeepCashImpact = dayResult.impacts.find(
          (i): i is CashImpact =>
            i.type === "cash_change" &&
            i.entityId === "player" &&
            i.phase === "upkeep" &&
            (i as CashImpact).amount < 0,
        );

        if (expectedDailyCost > 0) {
          expect(upkeepCashImpact).toBeDefined();
          expect(Math.abs(upkeepCashImpact!.amount)).toBe(expectedDailyCost);
        }

        stateBefore = dayResult.state;
      }
    });
  });

  describe("Test C — Per-day cash delta sanity", () => {
    it("inheritor: daily cash delta never exceeds $10M and positive deltas come from known sources", () => {
      const options = makeOptions("inheritor");
      const state = createInitialState(options);
      const { perDay } = runPipelineForDays(state, RUN_DAYS);

      for (const dayResult of perDay) {
        const delta = dayResult.cashAfter - dayResult.cashBefore;
        expect(Math.abs(delta)).toBeLessThanOrEqual(MAX_DAILY_DELTA);

        if (delta > 0) {
          const positivePlayerImpacts = dayResult.impacts.filter(
            (i): i is CashImpact =>
              i.type === "cash_change" &&
              (i.entityId === "player" || i.entityId === undefined) &&
              (i as CashImpact).amount > 0,
          );

          expect(positivePlayerImpacts.length).toBeGreaterThan(0);

          for (const impact of positivePlayerImpacts) {
            const isKnownSource = ALLOWED_POSITIVE_SOURCES.some((src) =>
              impact.reason?.includes(src),
            );
            expect(isKnownSource).toBe(true);
          }
        }
      }
    });
  });

  describe("Test G — Auction entityId bug regression", () => {
    it("player auction purchase cash_change uses entityId === 'player'", () => {
      const playerHorse = createTestHorse({
        id: "player-bought-horse" as any,
        name: "Bought Horse",
        ownership: { type: "unowned" } as any,
      });

      const horseMap = new Map<string, Horse>([[playerHorse.id, playerHorse]]);

      const sale: AuctionSale = {
        id: "test-sale",
        name: "Test Sale",
        day: 2,
        kind: "mixed",
        lots: [],
        resolved: false,
      };

      const lotState: LotState = {
        lot: {
          id: "lot-1",
          horseId: playerHorse.id as any,
          consignorStableId: "npc-consignor-1" as any,
          saleId: sale.id,
          reservePrice: 1000,
          hammerPrice: 50_000,
          soldToStableId: undefined,
          passed: false,
          withdrawn: false,
        },
        currentBid: 50_000,
        leadingBidder: undefined,
        bidHistory: [],
        chant: "sold",
        silentSteps: 0,
        consecutiveBidders: [],
      };

      const impacts = buildAuctionImpacts([lotState], sale, horseMap, false, 2, "auctions");

      const purchaseImpact = impacts.find(
        (i): i is CashImpact => i.type === "cash_change" && i.reason === "auction_purchase_player",
      );

      expect(purchaseImpact).toBeDefined();
      expect(purchaseImpact!.entityId).toBe("player");
      expect(purchaseImpact!.amount).toBe(-50_000);
    });

    it("player auction proceeds cash_change uses entityId === 'player'", () => {
      const playerHorse = createTestHorse({
        id: "player-sold-horse" as any,
        name: "Sold Horse",
        ownership: { type: "player" } as any,
      });

      const horseMap = new Map<string, Horse>([[playerHorse.id, playerHorse]]);

      const sale: AuctionSale = {
        id: "test-sale-2",
        name: "Test Sale 2",
        day: 2,
        kind: "mixed",
        lots: [],
        resolved: false,
      };

      const lotState: LotState = {
        lot: {
          id: "lot-2",
          horseId: playerHorse.id as any,
          consignorStableId: undefined,
          saleId: sale.id,
          reservePrice: 1000,
          hammerPrice: 80_000,
          soldToStableId: "npc-buyer-1" as any,
          passed: false,
          withdrawn: false,
        },
        currentBid: 80_000,
        leadingBidder: "npc-buyer-1",
        bidHistory: [],
        chant: "sold",
        silentSteps: 0,
        consecutiveBidders: [],
      };

      const impacts = buildAuctionImpacts([lotState], sale, horseMap, false, 2, "auctions");

      const proceedsImpact = impacts.find(
        (i): i is CashImpact => i.type === "cash_change" && i.reason === "auction_proceeds_player",
      );

      expect(proceedsImpact).toBeDefined();
      expect(proceedsImpact!.entityId).toBe("player");
      expect(proceedsImpact!.amount).toBe(netProceeds(80_000));
    });
  });
});
