import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";
import { generateUUID } from "@/game/uuid";

export class MarketHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "scout_report",
      "consignment",
      "consignment_withdrawal",
      "auction_resolution"
    ].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void {
    switch (impact.type) {
      case "scout_report": {
        const { report } = impact;
        draft.scoutReports.push(report);
        break;
      }

      case "consignment": {
        const { horseId, saleId, reservePrice, consignorStableId, breezeSeconds } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.consignedSaleId = saleId;
        }
        const auction = draft.auctions?.find((a) => a.id === saleId);
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
        const { horseId, saleId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.consignedSaleId = undefined;
        }
        const auction = draft.auctions?.find((a) => a.id === saleId);
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
        } = impact;
        const auction = draft.auctions?.find((a) => a.id === saleId);
        if (auction) {
          const lot = auction.lots.find((l) => l.id === lotId);
          if (lot) {
            lot.hammerPrice = hammerPrice;
            lot.soldToStableId = soldToStableId;
            lot.passed = passed;
            if (bidHistory) lot.bidHistory = bidHistory;
            if (wasPlayerConsignment) {
              const horse = draft.horses.find((h) => h.id === lot.horseId);
              if (horse) horse.consignedSaleId = undefined;
            }
          }
        }
        break;
      }
    }
  }
}
