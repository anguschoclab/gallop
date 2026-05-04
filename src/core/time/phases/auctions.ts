import type { PipelineContext } from "../pipeline";
import type { AuctionSale } from "@/game/types";
import { generateAuctionLots, resolveAuctionSale } from "@/game/auction";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { createRng, hashStr } from "@/game/rng";

/**
 * Phase: Auction Hooks
 * Generate new sales, resolve pending sales, and prune old auctions
 */
export const auctionsPhase = {
  name: "auctions",
  order: 90,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    let auctions: AuctionSale[] = [...(state.auctions ?? [])];
    let horses = [...state.horses];
    let logs = [...context.logs];
    let auctionCashDelta = 0;
    const doy = dayOfYear(newDay);

    // Generate weanling/yearling sales on schedule
    const SALE_TRIGGERS: { doy: number; kind: AuctionSale["kind"]; name: string }[] = [
      { doy: 60, kind: "weanling", name: "Spring Weanling Sale" },
      { doy: 240, kind: "yearling", name: "Summer Yearling Sale" },
      { doy: 290, kind: "weanling_south", name: "Southern Weanling Sale" },
      { doy: 105, kind: "yearling_south", name: "Southern Yearling Sale" },
    ];
    for (const trigger of SALE_TRIGGERS) {
      if (doy === trigger.doy && !auctions.some((a) => !a.resolved && a.kind === trigger.kind)) {
        const rng = createRng(hashStr(`auction_${newDay}_${trigger.kind}`));
        const newSale = generateAuctionLots(newDay, state.npcStables, horses, trigger.kind, trigger.name, rng);
        auctions.push(newSale);
        logs.push({ day: newDay, text: `${trigger.name} opens — ${newSale.lots.length} lots.` });
      }
    }

    // Auto-resolve sales that are 1+ day old and still unresolved (NPC-only resolution)
    for (const sale of auctions) {
      if (!sale.resolved && sale.day < newDay) {
        const resolved = resolveAuctionSale(sale, state.npcStables, horses);
        sale.lots = resolved.lots;
        sale.resolved = true;
        // Transfer player-consigned horses that sold
        for (const lot of resolved.lots) {
          if (!lot.consignorStableId && !lot.passed && !lot.withdrawn && lot.hammerPrice) {
            // Player-consigned horse sold — remove from horses, credit 94% of hammer
            const proceeds = Math.round(lot.hammerPrice * 0.94);
            auctionCashDelta += proceeds;
            horses = horses.filter((h) => h.id !== lot.horseId);
            logs.push({ day: newDay, text: `${sale.name}: your horse sold for $${lot.hammerPrice.toLocaleString()} (net $${proceeds.toLocaleString()}).` });
          } else if (!lot.consignorStableId && lot.passed) {
            // Passed — clear consignment
            horses = horses.map((h) =>
              h.id === lot.horseId ? { ...h, consignedSaleId: undefined } : h
            );
          }
        }
      }
    }

    // Prune auctions older than 30 days
    auctions = auctions.filter((a) => a.day >= newDay - 30);

    return {
      ...context,
      state: {
        ...state,
        horses,
        auctions,
        cash: state.cash + auctionCashDelta,
      },
      logs,
    };
  },
};
