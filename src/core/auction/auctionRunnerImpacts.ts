import { generateUUID } from "@/core/uuid";
import type { AuctionSale, AuctionLot, Horse } from "@/game/types";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { netProceeds } from "./engine";
import type { LotState } from "./auctionRunnerTypes";

export function buildAuctionImpacts(
  lots: LotState[],
  sale: AuctionSale,
  horseMap: Map<string, Horse>,
  liveMode: boolean,
  day: number,
  phase: string,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  for (const state of lots) {
    const lot = state.lot;
    if (lot.withdrawn) continue;
    const isPlayerConsignment = !lot.consignorStableId;

    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase,
      logLevel: "always",
      type: "auction_resolution",
      saleId: sale.id,
      lotId: lot.id,
      hammerPrice: lot.hammerPrice,
      soldToStableId: lot.soldToStableId,
      passed: !!lot.passed,
      bidHistory: state.bidHistory,
      wasPlayerConsignment: isPlayerConsignment,
      reason: lot.passed ? "auction_passed" : "auction_sold",
    });

    if (lot.passed || !lot.hammerPrice) continue;

    const winnerStableId = lot.soldToStableId;
    const consignorStableId = lot.consignorStableId;

    if (winnerStableId) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "conditional",
        type: "cash_change",
        entityId: winnerStableId,
        amount: -lot.hammerPrice,
        reason: "auction_purchase",
      });
    }

    if (!winnerStableId && !liveMode) {
      const horse = horseMap.get(lot.horseId);
      const horseName = horse?.name || "Unknown Horse";

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "inbox_message",
        message: {
          day,
          category: "auction",
          priority: "info",
          title: `Auction Won: ${horseName}`,
          body: `Congratulations! You purchased ${horseName} for $${lot.hammerPrice.toLocaleString()} at ${
            sale.name
          }.`,
          cta: {
            label: "View Horse",
            route: "stable.$horseId",
            params: { horseId: lot.horseId },
          },
        },
      });

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "cash_change",
        entityId: undefined as unknown as string,
        amount: -lot.hammerPrice,
        reason: "auction_purchase_player",
      });
    }

    const proceeds = netProceeds(lot.hammerPrice);
    if (consignorStableId) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "conditional",
        type: "cash_change",
        entityId: consignorStableId,
        amount: proceeds,
        reason: "auction_proceeds",
      });
    } else {
      const horse = horseMap.get(lot.horseId);
      const horseName = horse?.name || "Unknown Horse";

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "inbox_message",
        message: {
          day,
          category: "auction",
          priority: "info",
          title: `Horse Sold: ${horseName}`,
          body: `${horseName} was sold for $${lot.hammerPrice.toLocaleString()} at ${
            sale.name
          }. Your net proceeds: $${proceeds.toLocaleString()}.`,
          cta: {
            label: "View Sale",
            route: "auction.$saleId",
            params: { saleId: sale.id },
          },
        },
      });

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "cash_change",
        entityId: undefined as unknown as string,
        amount: proceeds,
        reason: "auction_proceeds_player",
      });
    }

    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase,
      logLevel: "always",
      type: "horse_transfer",
      horseId: lot.horseId,
      fromStableId: consignorStableId,
      toStableId: winnerStableId,
      price: lot.hammerPrice,
      reason: "auction_transfer",
    });
  }

  for (const entry of lots) {
    const lot = entry.lot;
    if (!lot.passed) continue;
    if (lot.consignorStableId === "") {
      const horse = horseMap.get(lot.horseId);
      const horseName = horse?.name || "Unknown Horse";

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "inbox_message",
        message: {
          day,
          category: "auction",
          priority: "info",
          title: `Horse Passed: ${horseName}`,
          body: `${horseName} failed to meet its reserve price at ${sale.name} and has returned to your stable.`,
          cta: {
            label: "View Horse",
            route: "stable.$horseId",
            params: { horseId: lot.horseId },
          },
        },
      });
    }
  }

  return impacts;
}
