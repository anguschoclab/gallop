/**
 * handlers/MarketHandler.ts - Market impact handler
 *
 * This file handles market-related impacts including scout reports, consignments,
 * consignment withdrawals, and auction resolutions.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler), @/game/uuid (generateUUID)
 * Related files: ../resolver.ts (uses handler), ../impacts/miscImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler, LookupMaps } from "./types";
import type {
  ScoutReportImpact,
  ConsignmentImpact,
  ConsignmentWithdrawalImpact,
  AuctionResolutionImpact,
} from "../impacts/miscImpacts";
import { generateUUID } from "@/core/uuid";
import { makeUnowned } from "@/core/horse/ownership";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: LookupMaps,
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  scout_report: (draft, impact) => {
    const { report } = impact as ScoutReportImpact;
    draft.scoutReports.push(report);
  },

  consignment: (draft, impact, lookupMaps) => {
    const { horseId, saleId, reservePrice, consignorStableId, breezeSeconds } =
      impact as ConsignmentImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.consignedSaleId = saleId;
    }
    const auction =
      lookupMaps?.auctionMap.get(saleId) || draft.auctions?.find((a) => a.id === saleId);
    if (auction) {
      auction.lots.push({
        id: generateUUID(),
        horseId,
        saleId,
        consignorStableId,
        reservePrice,
        passed: false,
        withdrawn: false,
        breezeSeconds,
      });
    }
  },

  consignment_withdrawal: (draft, impact, lookupMaps) => {
    const { horseId, saleId } = impact as ConsignmentWithdrawalImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.consignedSaleId = undefined;
    }
    const auction =
      lookupMaps?.auctionMap.get(saleId) || draft.auctions?.find((a) => a.id === saleId);
    if (auction) {
      const index = auction.lots.findIndex((l) => l.horseId === horseId);
      if (index !== -1) {
        auction.lots.splice(index, 1);
      }
    }
  },

  auction_resolution: (draft, impact, lookupMaps) => {
    const { saleId, lotId, hammerPrice, soldToStableId, passed, bidHistory } =
      impact as AuctionResolutionImpact;
    const auction =
      lookupMaps?.auctionMap.get(saleId) || draft.auctions?.find((a) => a.id === saleId);
    if (auction) {
      const lot = auction.lots.find((l) => l.id === lotId);
      if (lot) {
        lot.hammerPrice = hammerPrice;
        lot.soldToStableId = soldToStableId;
        lot.passed = passed;
        if (bidHistory) lot.bidHistory = bidHistory;

        // Clear consignedSaleId for ALL lots, not just player consignments.
        // This fixes a pre-existing bug where NPC consigned horses remained
        // locked out of racing/training after auction resolution.
        const horse = lookupMaps?.horseMap.get(lot.horseId) || draft.horses[lot.horseId];
        if (horse) {
          horse.consignedSaleId = undefined;

          // For passed lots from a dissolved consignor (bankrupt stable),
          // the horse has no stable to return to — make it unowned.
          if (passed && lot.consignorStableId) {
            const consignorExists = draft.npcStables.some((s) => s.id === lot.consignorStableId);
            if (!consignorExists) {
              horse.ownership = makeUnowned();
            }
          }
        }
      }
    }
  },
};

export class MarketHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["scout_report", "consignment", "consignment_withdrawal", "auction_resolution"].includes(
      type,
    );
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
