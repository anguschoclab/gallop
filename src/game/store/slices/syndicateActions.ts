/**
 * syndicateActions.ts - Syndicate creation and share management actions
 *
 * Extracted from breedingActions.ts for modularity.
 */

import { generateUUID } from "@/core/uuid";
import type { ShareActivityFeedItem } from "@/core/breeding/types";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import type {
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  AnyIntent,
} from "@/core/resolver/intents";
import { pickPersonality, generateInvestorName, buildDefaultExpectations } from "@/core/breeding/investorTypes";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";
import type { BreedingSlice } from "./breedingSlice";

export function createSyndicateActions(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): Pick<
  BreedingSlice,
  "createSyndicate" | "purchaseShares" | "sellShares" | "solicitInvestor" | "buyoutInvestor"
> {
  function checkDevolution(syndicateId: string): void {
    const updatedSyndicate = get().syndicates?.[syndicateId];
    const stallion = updatedSyndicate ? get().horses[updatedSyndicate.stallionId] : undefined;
    if (!updatedSyndicate || !stallion) return;

    const currentOwnerKey = stallion.stableId ?? "player";
    const devolutionResult = findMajorityOwner(
      updatedSyndicate.shareHolders,
      updatedSyndicate.totalShares,
      currentOwnerKey,
    );
    if (!devolutionResult.wouldDevolve || !devolutionResult.newOwner) return;

    const topHolder = devolutionResult.newOwner;
    const newStableId = topHolder === "player" ? undefined : topHolder;
    const previousOwnerKey = currentOwnerKey;
    set((state) => ({
      horses: {
        ...state.horses,
        [stallion.id]: {
          ...state.horses[stallion.id],
          stableId: newStableId,
          owned: !newStableId,
        },
      },
      shareActivityFeed: [
        ...((state.shareActivityFeed ?? []) as ShareActivityFeedItem[]),
        {
          id: generateUUID(),
          syndicateId,
          syndicateName: updatedSyndicate.stallionName,
          type: "devolution" as const,
          shares: 0,
          pricePerShare: 0,
          cashMoved: 0,
          day: get().day,
          previousOwner: previousOwnerKey,
          newOwner: topHolder,
          stallionName: stallion.name,
        },
      ].slice(-200),
      log: [
        {
          day: get().day,
          text: `Syndicate: ${stallion.name} ownership transferred to ${topHolder === "player" ? "your stable" : topHolder} (majority shareholder).`,
        },
        ...get().log,
      ].slice(0, 50),
    }));
  }

  return {
    createSyndicate: (stallionId, totalShares, sharePrice, initialShareholders) => {
      const s = get();
      const stallion = requireHorse(s.horses, stallionId);
      if (!stallion) return { ok: false, reason: "Stallion not found." };
      const ownershipGuard = requireOwned(stallion);
      if (ownershipGuard) return ownershipGuard;

      const g1Wins =
        stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
      if (g1Wins === 0) return { ok: false, reason: "Stallion must be a G1 winner to syndicate." };

      if (s.syndicates?.[stallionId])
        return { ok: false, reason: "Stallion is already syndicated." };

      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: stallionId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "syndicate_creation",
        stallionId,
        totalShares,
        sharePrice,
        initialShareholders,
      };

      enqueueIntent(intent);
      return { ok: true };
    },

    purchaseShares: (syndicateId, shares, pricePerShare) => {
      const s = get();
      const syndicate = s.syndicates?.[syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };

      const totalCost = shares * pricePerShare;
      if (s.cash < totalCost) return { ok: false, reason: "Insufficient cash to purchase shares." };

      const intent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: syndicateId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "share_purchase",
        syndicateId,
        shares,
        pricePerShare,
      };

      enqueueIntent(intent);
      return { ok: true };
    },

    sellShares: (syndicateId, shares, pricePerShare) => {
      const s = get();
      const syndicate = s.syndicates?.[syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };

      const playerShares = syndicate.shareHolders?.["player"] || 0;
      if (playerShares < shares) return { ok: false, reason: "You don't own enough shares." };

      const intent: ShareSaleIntent = {
        id: generateUUID(),
        entityId: syndicateId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "share_sale",
        syndicateId,
        shares,
        pricePerShare,
      };

      enqueueIntent(intent);
      return { ok: true };
    },

    solicitInvestor: (syndicateId: string, sharesOffered: number) => {
      const s = get();
      const syndicate = s.syndicates?.[syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };
      if (sharesOffered <= 0) return { ok: false, reason: "Must offer at least one share." };

      const playerShares = syndicate.shareHolders["player"] ?? 0;
      if (playerShares < sharesOffered) {
        return { ok: false, reason: "You don't own that many shares to sell." };
      }

      const personality = pickPersonality();
      const name = generateInvestorName();
      const investorId = `inv-${generateUUID().slice(0, 8)}`;
      const price = syndicate.sharePrice * sharesOffered;

      const investor = {
        id: investorId,
        syndicateId,
        name,
        stableId: investorId,
        personality,
        shares: sharesOffered,
        investedCash: price,
        joinedDay: s.day,
        satisfaction: 70,
        expectations: buildDefaultExpectations(personality, sharesOffered, syndicate.sharePrice),
      };

      set((state) => ({
        cash: state.cash + price,
        syndicates: {
          ...state.syndicates,
          [syndicateId]: {
            ...syndicate,
            shareHolders: {
              ...syndicate.shareHolders,
              player: playerShares - sharesOffered,
              [investorId]: (syndicate.shareHolders[investorId] ?? 0) + sharesOffered,
            },
          },
        },
        syndicateInvestors: {
          ...(state.syndicateInvestors ?? {}),
          [investorId]: investor,
        },
        shareTransactions: [
          ...(state.shareTransactions ?? []),
          {
            id: generateUUID(),
            syndicateId,
            buyerStableId: investorId,
            sellerStableId: "player",
            shares: sharesOffered,
            pricePerShare: syndicate.sharePrice,
            day: state.day,
          },
        ],
        shareActivityFeed: [
          ...((state.shareActivityFeed ?? []) as ShareActivityFeedItem[]),
          {
            id: generateUUID(),
            syndicateId,
            syndicateName: syndicate.stallionName,
            type: "investor_solicit" as const,
            buyerStableId: investorId,
            sellerStableId: "player",
            shares: sharesOffered,
            pricePerShare: syndicate.sharePrice,
            cashMoved: price,
            day: state.day,
          },
        ].slice(-200),
        log: [
          {
            day: state.day,
            text: `${name} (${personality}) invested $${price.toLocaleString()} for ${sharesOffered} shares of ${syndicate.stallionName}.`,
          },
          ...state.log,
        ].slice(0, 50),
      }));

      checkDevolution(syndicateId);
      return { ok: true, investorId };
    },

    buyoutInvestor: (investorId: string) => {
      const s = get();
      const investor = s.syndicateInvestors?.[investorId];
      if (!investor) return { ok: false, reason: "Investor not found." };
      const syndicate = s.syndicates?.[investor.syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };

      const satisfactionFactor = 0.8 + investor.satisfaction / 100;
      const price = Math.round(syndicate.sharePrice * investor.shares * satisfactionFactor);
      if ((s.cash ?? 0) < price) {
        return { ok: false, reason: `Insufficient cash. Buyout costs $${price.toLocaleString()}.` };
      }

      const nextInvestors = { ...(s.syndicateInvestors ?? {}) };
      delete nextInvestors[investorId];
      const nextHolders = { ...syndicate.shareHolders };
      delete nextHolders[investorId];
      nextHolders.player = (nextHolders.player ?? 0) + investor.shares;

      set((state) => ({
        cash: state.cash - price,
        syndicateInvestors: nextInvestors,
        syndicates: {
          ...state.syndicates,
          [investor.syndicateId]: { ...syndicate, shareHolders: nextHolders },
        },
        shareTransactions: [
          ...(state.shareTransactions ?? []),
          {
            id: generateUUID(),
            syndicateId: investor.syndicateId,
            buyerStableId: "player",
            sellerStableId: investorId,
            shares: investor.shares,
            pricePerShare: syndicate.sharePrice,
            day: state.day,
          },
        ],
        shareActivityFeed: [
          ...((state.shareActivityFeed ?? []) as ShareActivityFeedItem[]),
          {
            id: generateUUID(),
            syndicateId: investor.syndicateId,
            syndicateName: syndicate.stallionName,
            type: "investor_buyout" as const,
            buyerStableId: "player",
            sellerStableId: investorId,
            shares: investor.shares,
            pricePerShare: syndicate.sharePrice,
            cashMoved: price,
            day: state.day,
          },
        ].slice(-200),
        log: [
          {
            day: state.day,
            text: `Bought out ${investor.name} for $${price.toLocaleString()} (${investor.shares} shares).`,
          },
          ...state.log,
        ].slice(0, 50),
      }));

      checkDevolution(investor.syndicateId);
      return { ok: true };
    },
  };
}
