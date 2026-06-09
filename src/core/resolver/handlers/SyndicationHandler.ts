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
import type { ImpactHandler } from "./types";
import type { Syndicate } from "@/core/breeding/types";
import { generateUUID } from "@/core/uuid";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
    raceMap: Map<string, WritableDraft<any>>;
    jockeyMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  syndicate_creation: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { syndicateId, stallionId, stallionName, totalShares, sharePrice, initialShareholders } =
      impactAny;

    // Validate stallion exists and is a G1 winner
    const stallion =
      lookupMaps?.horseMap.get(stallionId) || draft.horses.find((h) => h.id === stallionId);
    if (!stallion) return;

    // Check if stallion is a G1 winner
    const g1Wins =
      stallion.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;
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
    const impactAny = impact as any;
    const { syndicateId, stableId, shares, pricePerShare } = impactAny;

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

    // Record transaction
    const transaction = {
      id: generateUUID(),
      syndicateId,
      stableId,
      shares,
      pricePerShare,
      day: impact.day,
    };

    if (!draft.shareTransactions) draft.shareTransactions = [];
    draft.shareTransactions.push(transaction);
  },

  syndicate_fee_distribution: (draft, impact) => {
    const impactAny = impact as any;
    const { syndicateId, totalFee } = impactAny;

    const syndicate = draft.syndicates?.[syndicateId];
    if (!syndicate) return;

    // Update lifetime earnings
    syndicate.lifetimeEarnings += totalFee;

    // Distribute fee among shareowners
    const shareCount = Object.values(syndicate.shareHolders).reduce(
      (sum: number, count: number) => sum + count,
      0,
    );
    if (shareCount === 0) return;

    const feePerShare = totalFee / shareCount;
    const stableMap = new Map((draft.npcStables ?? []).map((s: any) => [s.id, s]));

    // Distribute to each shareholder
    for (const [shareholderStableId, shares] of Object.entries(syndicate.shareHolders)) {
      const distribution = feePerShare * shares;

      // For player, add to cash
      if (shareholderStableId === "player") {
        draft.cash += distribution;
      } else {
        // For NPC stables, add to stable's cash
        const stable = stableMap.get(shareholderStableId);
        if (stable) {
          stable.cash = (stable.cash || 0) + distribution;
        }
      }
    }
  },

  syndicate_satisfaction: (draft, impact) => {
    const impactAny = impact as any;
    const { syndicateId, stableId, satisfactionDelta } = impactAny;

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
    return ["syndicate_creation", "share_transaction", "syndicate_fee_distribution", "syndicate_satisfaction"].includes(type);
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
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
