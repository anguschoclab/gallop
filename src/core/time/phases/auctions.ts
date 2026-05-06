import type { PipelineContext } from "../pipeline";
import type { AuctionSale } from "@/game/types";
import { generateAuctionLots } from "@/game/auction";
import { createAuctionRunner } from "@/game/auctionRunner";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { generateUUID } from "@/game/uuid";

/**
 * Phase: Auctions (order 90).
 *
 * Owns the auction lifecycle:
 *   - Spawns new sales on calendar triggers
 *   - Resolves sales the player didn't attend (offline path) by driving the
 *     same `createAuctionRunner` the live Theater uses, then emitting impacts
 *   - Marks sales resolved
 *   - Prunes stale sales after 30 days
 *
 * Per-lot outcomes (cash transfer, horse transfer, lot field updates) are
 * emitted as impacts and committed by `impactApplicationPhase` at order 200.
 * This keeps NPC cash, player cash, and horse ownership all flowing through
 * the same resolver — fixing the long-standing bug where NPC winners didn't
 * pay for the horses they acquired.
 */
export const auctionsPhase = {
  name: "auctions",
  order: 90,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    let auctions: AuctionSale[] = [...(state.auctions ?? [])];
    const logs = [...(context.logs ?? [])];
    const impacts = [...(context.impacts ?? [])];
    const doy = dayOfYear(newDay);

    // Eight-sale calendar — spaced through the year so the player encounters
    // a fresh sale every couple of months.
    const SALE_TRIGGERS: { doy: number; kind: AuctionSale["kind"]; name: string }[] = [
      { doy: 75, kind: "2yo_training", name: "Spring 2YO Breeze-Up Sale" },
      { doy: 90, kind: "weanling", name: "Spring Weanling Sale" },
      { doy: 105, kind: "yearling_south", name: "Southern Yearling Sale" },
      { doy: 165, kind: "mixed", name: "Midsummer Mixed Sale" },
      { doy: 240, kind: "yearling", name: "Late Summer Yearling Sale" },
      { doy: 270, kind: "racing_age", name: "Autumn Horses-of-Racing-Age Sale" },
      { doy: 290, kind: "weanling_south", name: "Southern Weanling Sale" },
      { doy: 335, kind: "broodmare", name: "Year-End Broodmare & Breeding Stock Sale" },
    ];
    for (const trigger of SALE_TRIGGERS) {
      if (doy === trigger.doy && !auctions.some((a) => !a.resolved && a.kind === trigger.kind)) {
        // generateAuctionLots may push fresh NPC horses into the working
        // horses array (for thin-inventory consignors). We pass a working
        // copy and emit horse-creation impacts for any newcomers.
        const horsesForGen = [...state.horses];
        const beforeCount = horsesForGen.length;
        const newSale = generateAuctionLots(
          newDay,
          state.npcStables,
          horsesForGen,
          trigger.kind,
          trigger.name,
          context.dailyRng,
        );
        const freshHorses = horsesForGen.slice(beforeCount);
        for (const horse of freshHorses) {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "auctions",
            logLevel: "conditional",
            type: "horse_creation",
            horse,
            reason: "auction_consignment_generation",
          });
        }
        auctions.push(newSale);
        logs.push({ day: newDay, text: `${trigger.name} opens — ${newSale.lots.length} lots.` });
      }
    }

    // Resolve sales the player didn't attend. The day-of pipeline runs after
    // the player has had a chance to enter the Theater; sales reached this
    // phase still unresolved on or after their day are processed offline.
    auctions = auctions.map((sale) => {
      if (sale.resolved || sale.day > newDay) return sale;
      // Build a horses snapshot that includes any freshly created consignment
      // horses from earlier this turn (so the runner can find them).
      const horsesIncludingFresh = [
        ...state.horses,
        ...(impacts
          .filter((i) => i.type === "horse_creation")
          .map((i) => (i as { horse: unknown }).horse) as never),
      ];
      const runner = createAuctionRunner(sale, state.npcStables, horsesIncludingFresh);
      runner.runToCompletion();
      const finalLots = runner.finalLots();
      const lotImpacts = runner.finalImpacts({ day: newDay, phase: "auctions" });
      impacts.push(...lotImpacts);
      for (const line of runner.log()) {
        logs.push({ day: newDay, text: `${sale.name}: ${line}` });
      }
      return { ...sale, lots: finalLots, resolved: true };
    });

    // Prune auctions older than 30 days.
    auctions = auctions.filter((a) => a.day >= newDay - 30);

    return {
      ...context,
      state: {
        ...state,
        auctions,
      },
      impacts,
      logs,
    };
  },
};
