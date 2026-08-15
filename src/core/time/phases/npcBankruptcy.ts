/**
 * phases/npcBankruptcy.ts - NPC Bankruptcy & Dissolution phase
 *
 * This phase runs after upkeep (order 20) and before breeding resolution (25).
 * It detects NPC stables whose cash has dropped to zero or below, liquidates
 * their horses via a special auction, buys out any player syndicate shares,
 * dissolves the stable, and spawns a replacement budget-tier stable.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/uuid (generateUUID), @/core/horse/pricing (horsePrice), @/core/ai/syndicationAI (calculateSharePrice), @/core/breeding/devolutionUtils (findMajorityOwner), @/core/stable/stableGeneration (generateFillerStable), @/core/npc/horseGenerator (generateStableHorses), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/constants (PHASE_ORDER_NPC_BANKRUPTCY)
 * Related files: ../pipeline.ts (uses phase), ./index.ts (registers phase)
 */

import type { PipelineContext } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type {
  CashImpact,
  ConsignmentImpact,
  NewsImpact,
  InboxImpact,
  HorseCreationImpact,
} from "@/core/resolver/impacts/index";
import type { AuctionSale } from "@/game/types";
import type { Horse } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { horsePrice } from "@/core/horse/pricing";
import { calculateSharePrice } from "@/core/ai/syndicationAI";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import { generateFillerStable } from "@/core/stable/stableGeneration";
import { generateStableHorses } from "@/core/npc/horseGenerator";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_NPC_BANKRUPTCY } from "@/constants";

const LIQUIDATION_SALE_DELAY = 3;
const LIQUIDATION_RESERVE_FACTOR = 0.5;

/**
 * Phase: NPC Bankruptcy (order 21).
 *
 * Detects bankrupt NPC stables (cash <= 0), liquidates their horses,
 * buys out player syndicate shares, dissolves the stable, and spawns
 * a replacement budget-tier stable.
 */
export const npcBankruptcyPhase = {
  name: "npcBankruptcy",
  order: PHASE_ORDER_NPC_BANKRUPTCY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, dailyRng, impacts, horseMap } = context;

    if (state.runEnded) return context;

    const bankruptStables = state.npcStables.filter((s) => s.cash <= 0);
    if (bankruptStables.length === 0) return context;

    let npcStables = [...state.npcStables];
    let npcAIManager = state.npcAIManager;
    if (npcAIManager) {
      npcAIManager = {
        ...npcAIManager,
        stableStates: { ...npcAIManager.stableStates },
      };
    }

    const newImpacts: AnyImpact[] = [];
    const usedNames = new Set<string>();
    for (const h of Object.values(state.horses)) {
      usedNames.add(h.name.toLowerCase());
    }

    for (const stable of bankruptStables) {
      // 1. Syndicate buyout: buy out player shares in syndicates where the
      //    stallion is owned by the bankrupt stable.
      if (state.syndicates) {
        for (const syndicate of Object.values(state.syndicates)) {
          const stallion = horseMap.get(syndicate.stallionId) || state.horses[syndicate.stallionId];
          if (!stallion) continue;
          if (stallion.stableId !== stable.id) continue;

          const playerShares = syndicate.shareHolders["player"] || 0;
          if (playerShares > 0) {
            const sharePrice = calculateSharePrice(syndicate, stallion);
            const buyoutAmount = playerShares * sharePrice;

            newImpacts.push({
              id: generateUUID(dailyRng),
              intentId: "",
              day: newDay,
              phase: "npcBankruptcy",
              logLevel: "always",
              type: "cash_change",
              entityId: "player",
              amount: buyoutAmount,
              reason: `Syndicate buyout — ${stable.name} bankruptcy`,
            } as CashImpact);

            newImpacts.push({
              id: generateUUID(dailyRng),
              intentId: "",
              day: newDay,
              phase: "npcBankruptcy",
              logLevel: "always",
              type: "inbox_message",
              message: {
                day: newDay,
                category: "auction",
                priority: "urgent",
                title: "Syndicate Share Buyout",
                body: `${stable.name} has gone bankrupt. Your ${playerShares} share${playerShares > 1 ? "s" : ""} in ${syndicate.stallionName} have been bought out at $${sharePrice.toLocaleString()} per share (total: $${buyoutAmount.toLocaleString()}).`,
              },
            } as InboxImpact);

            delete syndicate.shareHolders["player"];
          }
        }
      }

      // 2. Dissolve bankrupt stable's syndicate shares in all syndicates.
      if (state.syndicates) {
        for (const syndicate of Object.values(state.syndicates)) {
          const stableShares = syndicate.shareHolders[stable.id] || 0;
          if (stableShares <= 0) continue;

          delete syndicate.shareHolders[stable.id];

          // Check devolution: if the stallion was owned by the bankrupt stable,
          // transfer ownership to the new majority holder if one exists.
          const stallion = horseMap.get(syndicate.stallionId) || state.horses[syndicate.stallionId];
          if (stallion && stallion.stableId === stable.id) {
            const devolutionResult = findMajorityOwner(
              syndicate.shareHolders,
              syndicate.totalShares,
              stable.id,
            );
            if (devolutionResult.wouldDevolve && devolutionResult.newOwner) {
              const newOwner = devolutionResult.newOwner;
              stallion.stableId = newOwner === "player" ? undefined : newOwner;
              stallion.owned = newOwner === "player";
            }
          }
        }
      }

      // 3. Transfer horses to liquidation sale.
      const stableHorses: Horse[] = [];
      for (const horse of Object.values(state.horses)) {
        if (horse.stableId === stable.id) {
          stableHorses.push(horse);
        }
      }

      if (stableHorses.length > 0) {
        const saleId = generateUUID(dailyRng);
        const sale: AuctionSale = {
          id: saleId,
          name: `Liquidation Sale: ${stable.name}`,
          day: newDay + LIQUIDATION_SALE_DELAY,
          kind: "liquidation",
          lots: [],
          resolved: false,
        };

        state.auctions = [...(state.auctions ?? []), sale];

        for (const horse of stableHorses) {
          const reservePrice = Math.round(horsePrice(horse) * LIQUIDATION_RESERVE_FACTOR);
          newImpacts.push({
            id: generateUUID(dailyRng),
            intentId: "",
            day: newDay,
            phase: "npcBankruptcy",
            logLevel: "always",
            type: "consignment",
            horseId: horse.id,
            saleId,
            reservePrice,
            consignorStableId: stable.id,
            reason: "Bankruptcy liquidation",
          } as ConsignmentImpact);
        }
      }

      // 4. Dissolve stable: remove from npcStables and npcAIManager.
      npcStables = npcStables.filter((s) => s.id !== stable.id);
      if (npcAIManager && npcAIManager.stableStates[stable.id]) {
        delete npcAIManager.stableStates[stable.id];
      }

      // 5. Spawn replacement stable.
      const newStable = generateFillerStable(newDay, dailyRng);
      const newHorses = generateStableHorses(newStable, dailyRng, usedNames, npcAIManager, newDay);
      newStable.horses = newHorses.map((h) => h.id);

      for (const horse of newHorses) {
        horse.stableId = newStable.id;
        horse.owned = false;
        usedNames.add(horse.name.toLowerCase());

        newImpacts.push({
          id: generateUUID(dailyRng),
          intentId: "",
          day: newDay,
          phase: "npcBankruptcy",
          logLevel: "conditional",
          type: "horse_creation",
          horse,
        } as HorseCreationImpact);
      }

      npcStables.push(newStable);
      if (npcAIManager) {
        getOrCreateStableAIState(npcAIManager, newStable, newDay);
      }

      // 6. Notifications.
      newImpacts.push({
        id: generateUUID(dailyRng),
        intentId: "",
        day: newDay,
        phase: "npcBankruptcy",
        logLevel: "always",
        type: "news_item",
        newsItem: {
          id: generateUUID(dailyRng),
          day: newDay,
          category: "stable",
          importance: "high",
          headline: `${stable.name} declares bankruptcy`,
          body: `${stable.owner}'s ${stable.name} has ceased operations. Horses will be sold at a liquidation sale in ${LIQUIDATION_SALE_DELAY} days.`,
          entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
        },
      } as NewsImpact);

      newImpacts.push({
        id: generateUUID(dailyRng),
        intentId: "",
        day: newDay,
        phase: "npcBankruptcy",
        logLevel: "always",
        type: "inbox_message",
        message: {
          day: newDay,
          category: "auction",
          priority: "action",
          title: "Liquidation Sale Scheduled",
          body: `${stable.name} has gone bankrupt. A liquidation sale featuring their horses will be held on day ${newDay + LIQUIDATION_SALE_DELAY}.`,
          cta: {
            label: "View Auctions",
            route: "auctions",
          },
        },
      } as InboxImpact);
    }

    return {
      ...context,
      state: {
        ...state,
        npcStables,
        npcAIManager,
      },
      impacts: [...impacts, ...newImpacts],
    };
  },
};
