/**
 * syndicateActions.ts - Syndicate creation and share management actions
 *
 * Extracted from breedingActions.ts for modularity.
 */

import { generateUUID } from "@/core/uuid";
import { makePlayerOwned, makeNpcOwned, getStableId } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asPlayerOwnerId, asOwnerKey } from "@/core/types/branded";
import type { ShareActivityFeedItem } from "@/core/breeding/types";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import type {
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  AnyIntent,
} from "@/core/resolver/intents";
import { buildSolicitedInvestor } from "@/core/market/syndicateInvestorActions";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";
import type { BreedingSlice } from "./breedingSlice";
import {
  validateSyndicateCreation,
  validateSharePurchase,
  validateShareSale,
  computeBuyoutPrice,
  buildBuyoutLogText,
  buildDevolutionLogText,
} from "@/core/breeding/syndicateActions";

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
    const stallion = updatedSyndicate
      ? get().horses[asHorseId(updatedSyndicate.stallionId)]
      : undefined;
    if (!updatedSyndicate || !stallion) return;

    const currentOwnerKey = getStableId(stallion) ?? "player";
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
          ownership: newStableId ? makeNpcOwned(asNpcStableId(newStableId)) : makePlayerOwned(),
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
          text: buildDevolutionLogText(stallion.name, topHolder),
        },
        ...get().log,
      ].slice(0, 50),
    }));
  }

  return {
    createSyndicate: (stallionId, totalShares, sharePrice, initialShareholders) => {
      const s = get();
      const stallion = requireHorse(s.horses, stallionId);
      const ownershipGuard = requireOwned(stallion);
      if (ownershipGuard) return ownershipGuard;

      const validation = validateSyndicateCreation({
        stallion: stallion ?? undefined,
        existingSyndicate: s.syndicates?.[stallionId],
      });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

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
      const validation = validateSharePurchase({
        syndicateExists: !!syndicate,
        cash: s.cash,
        shares,
        pricePerShare,
      });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

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
      const playerShares = syndicate?.shareHolders?.[asPlayerOwnerId("player")] || 0;
      const validation = validateShareSale({
        syndicateExists: !!syndicate,
        playerShares,
        shares,
      });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

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

      const playerShares = syndicate.shareHolders?.[asPlayerOwnerId("player")] ?? 0;
      if (playerShares < sharesOffered) {
        return { ok: false, reason: "You don't own that many shares to sell." };
      }

      const result = buildSolicitedInvestor({
        syndicateId,
        sharesOffered,
        sharePrice: syndicate.sharePrice,
        stallionName: syndicate.stallionName,
        currentDay: s.day,
        playerShares,
        shareHolders: syndicate.shareHolders,
      });

      set((state) => ({
        cash: state.cash + result.price,
        syndicates: {
          ...state.syndicates,
          [syndicateId]: {
            ...syndicate,
            shareHolders: result.nextShareHolders,
          },
        },
        syndicateInvestors: {
          ...(state.syndicateInvestors ?? {}),
          [result.investor.id]: result.investor,
        },
        shareTransactions: [...(state.shareTransactions ?? []), result.transaction],
        shareActivityFeed: [
          ...((state.shareActivityFeed ?? []) as ShareActivityFeedItem[]),
          result.activityFeedItem,
        ].slice(-200),
        log: [{ day: state.day, text: result.logText }, ...state.log].slice(0, 50),
      }));

      checkDevolution(syndicateId);
      return { ok: true, investorId: result.investor.id };
    },

    buyoutInvestor: (investorId: string) => {
      const s = get();
      const investor = s.syndicateInvestors?.[investorId];
      if (!investor) return { ok: false, reason: "Investor not found." };
      const syndicate = s.syndicates?.[investor.syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };

      const { price } = computeBuyoutPrice({
        sharePrice: syndicate.sharePrice,
        investorShares: investor.shares,
        investorSatisfaction: investor.satisfaction,
      });
      if ((s.cash ?? 0) < price) {
        return { ok: false, reason: `Insufficient cash. Buyout costs $${price.toLocaleString()}.` };
      }

      const nextInvestors = { ...(s.syndicateInvestors ?? {}) };
      delete nextInvestors[investorId];
      const nextHolders = { ...syndicate.shareHolders };
      delete nextHolders[asOwnerKey(investorId)];
      nextHolders[asPlayerOwnerId("player")] =
        (nextHolders[asPlayerOwnerId("player")] ?? 0) + investor.shares;

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
            buyerStableId: asPlayerOwnerId("player"),
            sellerStableId: asOwnerKey(investorId),
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
            buyerStableId: asPlayerOwnerId("player"),
            sellerStableId: asOwnerKey(investorId),
            shares: investor.shares,
            pricePerShare: syndicate.sharePrice,
            cashMoved: price,
            day: state.day,
          },
        ].slice(-200),
        log: [
          {
            day: state.day,
            text: buildBuyoutLogText(investor.name, price, investor.shares),
          },
          ...state.log,
        ].slice(0, 50),
      }));

      checkDevolution(investor.syndicateId);
      return { ok: true };
    },
  };
}
