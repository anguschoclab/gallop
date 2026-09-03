/**
 * handlers/SyndicationHandler.ts - Syndication impact handler
 *
 * This file handles syndication-related impacts including syndicate creation,
 * share transactions, and fee distribution.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/breedingImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler, LookupMaps } from "./types";
import type { Syndicate, ShareActivityFeedItem } from "@/core/breeding/types";
import { generateUUID } from "@/core/uuid";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";
import { syndicationStakeReputation } from "@/core/reputation/commerceReputation";
import { applyReputationEvents } from "@/game/store/helpers/reputation";
import type {
  SyndicateCreationImpact,
  ShareTransactionImpact,
  SyndicateFeeDistributionImpact,
  SyndicateSatisfactionImpact,
} from "../impacts/breedingImpacts";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: LookupMaps,
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  syndicate_creation: (draft, impact, lookupMaps) => {
    const { syndicateId, stallionId, stallionName, totalShares, sharePrice, initialShareholders } =
      impact as SyndicateCreationImpact;

    // Validate stallion exists and is a G1 winner
    const stallion =
      lookupMaps?.horseMap.get(asHorseId(stallionId)) || draft.horses[asHorseId(stallionId)];
    if (!stallion) return;

    // Check if stallion is a G1 winner
    const g1Wins =
      stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
    if (g1Wins === 0) return; // Only G1 winners can be syndicated

    // Check if syndicate already exists
    if (draft.syndicates?.[syndicateId]) return;

    // Create syndicate
    if (!draft.syndicates) draft.syndicates = {};

    const syndicate: Syndicate = {
      id: syndicateId,
      stallionId,
      stallionName,
      totalShares,
      shareHolders: { ...initialShareholders },
      sharePrice,
      studFee: stallion.stud?.standingFee || 0,
      isPublic: true,
      lifetimeEarnings: 0,
    };

    draft.syndicates[syndicateId] = syndicate;
  },

  share_transaction: (draft, impact, lookupMaps) => {
    const { syndicateId, stableId, shares, pricePerShare } = impact as ShareTransactionImpact;
    const buyerStableId = (impact as ShareTransactionImpact).buyerStableId || stableId;
    const sellerStableId = (impact as ShareTransactionImpact).sellerStableId || stableId;

    const syndicate = draft.syndicates?.[syndicateId];
    if (!syndicate) return;

    if (shares > 0) {
      // Purchase
      const totalOwned = Object.values(syndicate.shareHolders).reduce(
        (sum: number, count: number) => sum + count,
        0,
      );
      if (totalOwned + shares > syndicate.totalShares) return;

      syndicate.shareHolders[stableId] = (syndicate.shareHolders[stableId] || 0) + shares;
    } else {
      // Sale
      const currentShares = syndicate.shareHolders[stableId] || 0;
      if (currentShares < Math.abs(shares)) return;

      syndicate.shareHolders[stableId] = currentShares + shares; // shares is negative
      if (syndicate.shareHolders[stableId] === 0) {
        delete syndicate.shareHolders[stableId];
      }
    }

    // Move cash: positive shares = purchase (buyer pays), negative = sale (seller receives)
    const cashDelta = -shares * pricePerShare;
    if (cashDelta !== 0) {
      if ((stableId as string) === "player") {
        draft.cash += cashDelta;
      } else {
        const stable =
          lookupMaps?.stableMap.get(asStableId(stableId)) ||
          draft.npcStables?.find((s) => s.id === (stableId as string));
        if (stable) {
          stable.cash = (stable.cash || 0) + cashDelta;
        }
      }
    }

    // Underwriting (or selling down) a syndicate stake moves the player's
    // standing in the industry.
    if ((stableId as string) === "player") {
      draft.reputation = applyReputationEvents(draft.reputation, [
        syndicationStakeReputation({
          direction: shares > 0 ? "buy" : "sell",
          shares: Math.abs(shares),
          totalShares: syndicate.totalShares,
          pricePerShare,
          syndicateName: syndicate.stallionName,
          day: impact.day,
        }),
      ]);
    }

    // Record transaction with buyer/seller fields
    const transaction = {
      id: generateUUID(),
      syndicateId,
      buyerStableId,
      sellerStableId,
      shares: Math.abs(shares),
      pricePerShare,
      day: impact.day,
    };

    if (!draft.shareTransactions) draft.shareTransactions = [];
    draft.shareTransactions.push(transaction);

    // Record activity feed item
    if (!draft.shareActivityFeed) draft.shareActivityFeed = [];
    const feedItem: ShareActivityFeedItem = {
      id: generateUUID(),
      syndicateId,
      syndicateName: syndicate.stallionName,
      type: shares > 0 ? "share_purchase" : "share_sale",
      buyerStableId,
      sellerStableId,
      shares: Math.abs(shares),
      pricePerShare,
      cashMoved: Math.abs(shares * pricePerShare),
      day: impact.day,
    };
    draft.shareActivityFeed.push(feedItem);
    if (draft.shareActivityFeed.length > 200) {
      draft.shareActivityFeed = draft.shareActivityFeed.slice(-200);
    }

    // Ownership devolution: if the current stallion owner no longer holds the
    // majority of shares (>50%), transfer ownership to the largest shareholder.
    const stallion =
      lookupMaps?.horseMap.get(asHorseId(syndicate.stallionId)) ||
      draft.horses[asHorseId(syndicate.stallionId)];
    if (stallion) {
      const currentOwnerKey =
        stallion.ownership?.type === "npc" ? stallion.ownership.stableId : "player";
      const devolutionResult = findMajorityOwner(
        syndicate.shareHolders,
        syndicate.totalShares,
        currentOwnerKey,
      );

      if (devolutionResult.wouldDevolve && devolutionResult.newOwner) {
        const topHolder = devolutionResult.newOwner;
        const newStableId = topHolder === "player" ? undefined : topHolder;
        const previousOwnerKey = currentOwnerKey;
        stallion.ownership = newStableId
          ? makeNpcOwned(asNpcStableId(newStableId))
          : makePlayerOwned();

        const newOwnerName =
          topHolder === "player"
            ? "your stable"
            : draft.npcStables.find((s) => s.id === topHolder)?.name || "a new majority owner";

        draft.log = [
          {
            day: impact.day,
            text: `Syndicate: ${stallion.name} ownership transferred to ${newOwnerName} (majority shareholder).`,
          },
          ...(draft.log || []),
        ].slice(0, 50);

        // Record devolution in activity feed
        const devolutionFeedItem: ShareActivityFeedItem = {
          id: generateUUID(),
          syndicateId,
          syndicateName: syndicate.stallionName,
          type: "devolution",
          shares: 0,
          pricePerShare: 0,
          cashMoved: 0,
          day: impact.day,
          previousOwner: previousOwnerKey,
          newOwner: topHolder,
          stallionName: stallion.name,
        };
        draft.shareActivityFeed.push(devolutionFeedItem);
        if (draft.shareActivityFeed.length > 200) {
          draft.shareActivityFeed = draft.shareActivityFeed.slice(-200);
        }
      }
    }
  },

  syndicate_fee_distribution: (draft, impact, lookupMaps) => {
    const { syndicateId, totalFee } = impact as SyndicateFeeDistributionImpact;

    const syndicate = draft.syndicates?.[syndicateId];
    if (!syndicate) return;

    // Update lifetime earnings
    syndicate.lifetimeEarnings += totalFee;

    // Distribute fee among shareowners
    const shareCount = Object.values(syndicate.shareHolders).reduce((sum, count) => sum + count, 0);
    if (shareCount === 0) return;

    const feePerShare = totalFee / shareCount;

    // Distribute to each shareholder
    for (const [shareholderStableId, shares] of Object.entries(syndicate.shareHolders)) {
      const distribution = feePerShare * shares;

      // For player, add to cash
      if (shareholderStableId === "player") {
        draft.cash += distribution;
      } else {
        // For NPC stables, add to stable's cash
        const stable =
          lookupMaps?.stableMap.get(asStableId(shareholderStableId)) ||
          draft.npcStables.find((s) => s.id === shareholderStableId);
        if (stable) {
          stable.cash = (stable.cash || 0) + distribution;
        }
      }
    }
  },

  syndicate_satisfaction: (draft, impact) => {
    const { syndicateId, stableId, satisfactionDelta } = impact as SyndicateSatisfactionImpact;

    const syndicate = draft.syndicates?.[syndicateId];
    if (!syndicate) return;

    // Initialize satisfaction tracking if not exists
    if (!syndicate.shareholderSatisfaction) {
      syndicate.shareholderSatisfaction = {};
    }

    // Update satisfaction (cap at 0-100)
    const currentSatisfaction = syndicate.shareholderSatisfaction[stableId] || 50; // Start at neutral 50
    const newSatisfaction = Math.max(0, Math.min(100, currentSatisfaction + satisfactionDelta));
    syndicate.shareholderSatisfaction[stableId] = newSatisfaction;
    syndicate.lastSatisfactionUpdate = impact.day;
  },
};

export class SyndicationHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "syndicate_creation",
      "share_transaction",
      "syndicate_fee_distribution",
      "syndicate_satisfaction",
    ].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
