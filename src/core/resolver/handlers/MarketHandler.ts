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
import type { ImpactHandler } from "./types";
import { generateUUID } from "@/core/uuid";

export class MarketHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["scout_report", "consignment", "consignment_withdrawal", "auction_resolution"].includes(
      type,
    );
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
      raceMap: Map<string, WritableDraft<any>>;
      jockeyMap: Map<string, WritableDraft<any>>;
      auctionMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const impactAny = impact as any;

    switch (impact.type) {
      case "scout_report": {
        const { report } = impactAny;
        draft.scoutReports.push(report);
        break;
      }

      case "consignment": {
        const { horseId, saleId, reservePrice, consignorStableId, breezeSeconds } = impactAny;
        const horse =
          lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
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
        break;
      }

      case "consignment_withdrawal": {
        const { horseId, saleId } = impactAny;
        const horse =
          lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
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
        break;
      }

      case "auction_resolution": {
        const {
          saleId,
          lotId,
          hammerPrice,
          soldToStableId,
          passed,
          bidHistory,
          wasPlayerConsignment,
        } = impactAny;
        const auction =
          lookupMaps?.auctionMap.get(saleId) || draft.auctions?.find((a) => a.id === saleId);
        if (auction) {
          const lot = auction.lots.find((l) => l.id === lotId);
          if (lot) {
            lot.hammerPrice = hammerPrice;
            lot.soldToStableId = soldToStableId;
            lot.passed = passed;
            if (bidHistory) lot.bidHistory = bidHistory;
            if (wasPlayerConsignment) {
              const horse =
                lookupMaps?.horseMap.get(lot.horseId) ||
                draft.horses.find((h) => h.id === lot.horseId);
              if (horse) horse.consignedSaleId = undefined;
            }
          }
        }
        break;
      }
    }
  }
}
