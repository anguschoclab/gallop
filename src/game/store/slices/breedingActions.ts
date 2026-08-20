import type {
  BreedingState,
  MatingPlanEntry,
  SavedMatingPlan,
} from "@/game/store/state/breedingState";
import { canBreed } from "@/core/breeding/eligibility";
import { generateUUID } from "@/core/uuid";
import type { ShareActivityFeedItem } from "@/core/breeding/types";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import type {
  BreedingIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  AnyIntent,
} from "@/core/resolver/intents";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE, MAX_BATCH_BREEDING } from "@/constants";
import {
  pickPersonality,
  generateInvestorName,
  buildDefaultExpectations,
} from "@/core/breeding/investorTypes";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";
import type { BreedingSlice, BatchBreedResult } from "./breedingSlice";

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

export function createBreedingBatchActions(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): Pick<
  BreedingSlice,
  "breedBatch" | "saveMatingPlan" | "deleteMatingPlan" | "getSavedMatingPlan"
> {
  return {
    breedBatch: (entries: MatingPlanEntry[]) => {
      const s = get();
      if (entries.length > MAX_BATCH_BREEDING) {
        return {
          ok: false,
          results: [],
          reason: `Batch exceeds maximum of ${MAX_BATCH_BREEDING} entries.`,
        };
      }
      const results: BatchBreedResult[] = [];
      const processedDams = new Set<string>();
      let totalFee = 0;

      for (const entry of entries) {
        const sire = s.horses[entry.sireId];
        const dam = s.horses[entry.damId];

        if (processedDams.has(entry.damId)) {
          results.push({
            damId: entry.damId,
            sireId: entry.sireId,
            ok: false,
            reason: "Mare already assigned in this batch.",
          });
          continue;
        }

        const eligibility = canBreed(sire, dam, s.day, s.pregnancies ?? []);
        if (!eligibility.ok) {
          results.push({
            damId: entry.damId,
            sireId: entry.sireId,
            ok: false,
            reason: eligibility.reason,
          });
          continue;
        }

        const isExternal = !!sire!.stableId;
        let studFee = 0;
        if (isExternal) {
          if (!sire!.stud?.atStud) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: `${sire!.name} is not standing at stud.`,
            });
            continue;
          }
          if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: `${sire!.name}'s book is full this season.`,
            });
            continue;
          }
          if (sire!.hemisphere !== dam!.hemisphere) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: "Cross-hemisphere breeding is not supported.",
            });
            continue;
          }

          const syndicate = s.syndicates?.[entry.sireId];
          const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
          const totalShares = syndicate?.totalShares || 1;
          const playerSharePercentage = playerShareCount / totalShares;
          studFee = sire!.stud.standingFee * (1 - playerSharePercentage);
        }

        const fee = isExternal
          ? BREEDING_FEE + (entry.liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
          : 0;
        totalFee += fee;
        processedDams.add(entry.damId);
        results.push({
          damId: entry.damId,
          sireId: entry.sireId,
          ok: true,
        });
      }

      if (s.cash < totalFee) {
        return {
          ok: false,
          results: [],
          reason: "Insufficient cash for batch.",
        };
      }

      for (let i = 0; i < entries.length; i++) {
        if (!results[i].ok) continue;
        const entry = entries[i];
        const sire = s.horses[entry.sireId];
        const isExternal = !!sire?.stableId;
        let studFee = 0;
        if (isExternal && sire?.stud) {
          const syndicate = s.syndicates?.[entry.sireId];
          const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
          const totalShares = syndicate?.totalShares || 1;
          const playerSharePercentage = playerShareCount / totalShares;
          studFee = sire.stud.standingFee * (1 - playerSharePercentage);
        }
        const fee = isExternal
          ? BREEDING_FEE + (entry.liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
          : 0;

        const intent: BreedingIntent = {
          id: generateUUID(),
          entityId: entry.damId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "breeding",
          sireId: entry.sireId,
          damId: entry.damId,
          liveFoalGuarantee: entry.liveFoalGuarantee,
        };
        enqueueIntent({ ...intent, fee });
      }

      return { ok: true, results };
    },

    saveMatingPlan: (name: string, entries: MatingPlanEntry[]) => {
      const plan: SavedMatingPlan = {
        id: generateUUID(),
        name,
        createdDay: get().day,
        entries,
      };
      set((state) => ({
        savedMatingPlans: [...state.savedMatingPlans, plan],
      }));
      return { ok: true, planId: plan.id };
    },

    deleteMatingPlan: (planId: string) => {
      set((state) => ({
        savedMatingPlans: state.savedMatingPlans.filter((p) => p.id !== planId),
      }));
    },

    getSavedMatingPlan: (planId: string) => {
      return get().savedMatingPlans.find((p) => p.id === planId);
    },
  };
}
