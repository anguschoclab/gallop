/**
 * store/slices/breedingSlice.ts - Breeding state slice
 *
 * This file provides breeding-related state and actions for reproduction and lineage
 * tracking, including breeding, retirement, pregnancy management, and breeding
 * program management.
 *
 * Dependencies: @/game/types (Pregnancy, TripleCrownProgress, Horse), @/game/state/breedingState (BreedingState, createDefaultBreedingState), @/core/breeding/programs (createBreedingProgram, updateProgramProgress, BreedingProgram), @/core/breeding/archetypes (getArchetypeById), @/core/breeding/eligibility (canBreed, BreedResult), @/game/uuid (generateUUID), @/core/resolver/intents (BreedingIntent), @/game/constants (BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE), @/lib/formatting (formatCurrency), ../guards (requireOwned, requireHorse), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/core/breeding/programs.ts (breeding programs)
 */

/**
 * Breeding Slice
 * Breeding-related state and actions for reproduction and lineage tracking
 */

import type { Pregnancy, TripleCrownProgress, Horse } from "@/game/types";
import type {
  BreedingState,
  MatingPlanEntry,
  SavedMatingPlan,
} from "@/game/store/state/breedingState";
import { createDefaultBreedingState } from "@/game/store/state/breedingState";
import { createBreedingProgram, updateProgramProgress } from "@/core/breeding/programs";
import { getArchetypeById } from "@/core/breeding/archetypes";
import type { BreedingProgram } from "@/core/breeding/programs";
import { canBreed, type BreedResult } from "@/core/breeding/eligibility";
import { generateUUID } from "@/core/uuid";
import type { ShareActivityFeedItem } from "@/core/breeding/types";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import type {
  BreedingIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  SyndicateFeeDistributionIntent,
  AnyIntent,
} from "@/core/resolver/intents";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/constants";
import { formatCurrency } from "@/core/common/formatting";
import {
  pickPersonality,
  generateInvestorName,
  buildDefaultExpectations,
} from "@/core/breeding/investorTypes";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";

export type BreedingSlice = BreedingState & {
  breed: (
    sireId: string,
    damId: string,
    liveFoalGuarantee?: boolean,
  ) => { ok: true } | { ok: false; reason: string };
  retireToPasture: (horseId: string) => { ok: true } | { ok: false; reason: string };
  setPregnancies: (pregnancies: Pregnancy[]) => void;
  setTriplecrownHistory: (history: TripleCrownProgress[]) => void;
  createSyndicate: (
    stallionId: string,
    totalShares: number,
    sharePrice: number,
    initialShareholders: Record<string, number>,
  ) => { ok: true } | { ok: false; reason: string };
  purchaseShares: (
    syndicateId: string,
    shares: number,
    pricePerShare: number,
  ) => { ok: true } | { ok: false; reason: string };
  sellShares: (
    syndicateId: string,
    shares: number,
    pricePerShare: number,
  ) => { ok: true } | { ok: false; reason: string };
  solicitInvestor: (
    syndicateId: string,
    sharesOffered: number,
  ) => { ok: true; investorId: string } | { ok: false; reason: string };
  buyoutInvestor: (investorId: string) => { ok: true } | { ok: false; reason: string };
  breedBatch: (entries: MatingPlanEntry[]) => {
    ok: boolean;
    results: BatchBreedResult[];
    reason?: string;
  };
  saveMatingPlan: (name: string, entries: MatingPlanEntry[]) => { ok: true; planId: string };
  deleteMatingPlan: (planId: string) => void;
  getSavedMatingPlan: (planId: string) => SavedMatingPlan | undefined;
};

export type BatchBreedResult = {
  damId: string;
  sireId: string;
  ok: boolean;
  reason?: string;
};

/**
 * Create the breeding state slice with breeding and retirement actions.
 *
 * Provides breeding, retirement to pasture, pregnancy management, and Triple Crown
 * history tracking. Uses intent-based state updates for breeding actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Breeding slice with state and actions
 */
export function createBreedingSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): BreedingSlice {
  return {
    ...createDefaultBreedingState(),

    breed: (sireId, damId, liveFoalGuarantee = false) => {
      const s = get();
      const sire = s.horses[sireId];
      const dam = s.horses[damId];
      const fail = (reason: string): { ok: false; reason: string } => {
        set({ log: [{ day: s.day, text: `Breeding: ${reason}` }, ...s.log].slice(0, 50) });
        return { ok: false, reason };
      };

      const eligibility: BreedResult = canBreed(sire, dam, s.day, s.pregnancies);
      if (!eligibility.ok) return fail(eligibility.reason);

      // External-stallion path: if the sire belongs to an NPC stable, charge
      // the player the stud fee (in addition to base breeding fee), credit
      // the stable, and increment the stallion's season-bookings counter.
      // If the stallion is syndicated, apply fee reduction based on player's share ownership.
      const isExternal = !!sire!.stableId;
      let studFee = 0;
      if (isExternal) {
        if (!sire!.stud?.atStud) return fail(`${sire!.name} is not standing at stud.`);
        if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
          return fail(`${sire!.name}'s book is full this season.`);
        }
        if (sire!.hemisphere !== dam!.hemisphere) {
          return fail("Cross-hemisphere breeding is not supported.");
        }

        // Check if stallion is syndicated and apply fee reduction
        const syndicate = s.syndicates?.[sireId];
        const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
        const totalShares = syndicate?.totalShares || 1;
        const playerSharePercentage = playerShareCount / totalShares;

        // Apply fee reduction: player only pays their share of the stud fee
        studFee = sire!.stud.standingFee * (1 - playerSharePercentage);

        // Enqueue fee distribution intent if syndicated
        if (syndicate && syndicate.totalShares > 0) {
          const feeDistIntent: SyndicateFeeDistributionIntent = {
            id: generateUUID(),
            entityId: sireId,
            source: "system",
            day: s.day,
            priority: 50,
            type: "syndicate_fee_distribution",
            syndicateId: syndicate.id,
            totalFee: sire!.stud.standingFee,
            breedingDay: s.day,
          };
          enqueueIntent(feeDistIntent);
        }
      }

      const totalFee = isExternal
        ? BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
        : 0;
      if (s.cash < totalFee) return fail("Insufficient cash for breeding fee.");

      // Enqueue BreedingIntent for next day advance
      const intent: BreedingIntent = {
        id: generateUUID(),
        entityId: damId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "breeding",
        sireId,
        damId,
        liveFoalGuarantee,
      };

      enqueueIntent({
        ...intent,
        fee: totalFee,
      });
      return { ok: true };
    },

    retireToPasture: (horseId: string) => {
      const s = get();
      const horse = requireHorse(s.horses, horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;
      if (horse.age < 3)
        return { ok: false, reason: "Horse must be at least 3 years old to retire." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "pasture_retirement",
        horseId,
      });

      return { ok: true };
    },

    setPregnancies: (pregnancies) => {
      set({ pregnancies });
    },

    setTriplecrownHistory: (history) => {
      set({ triplecrownHistory: history });
    },

    createSyndicate: (stallionId, totalShares, sharePrice, initialShareholders) => {
      const s = get();
      const stallion = requireHorse(s.horses, stallionId);
      if (!stallion) return { ok: false, reason: "Stallion not found." };
      const ownershipGuard = requireOwned(stallion);
      if (ownershipGuard) return ownershipGuard;

      // Validate stallion is a G1 winner
      const g1Wins =
        stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
      if (g1Wins === 0) return { ok: false, reason: "Stallion must be a G1 winner to syndicate." };

      // Check if syndicate already exists
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

      // Check for ownership devolution after investor purchase
      const updatedSyndicate = get().syndicates?.[syndicateId];
      const stallion = updatedSyndicate ? get().horses[updatedSyndicate.stallionId] : undefined;
      if (updatedSyndicate && stallion) {
        const currentOwnerKey = stallion.stableId ?? "player";
        const devolutionResult = findMajorityOwner(
          updatedSyndicate.shareHolders,
          updatedSyndicate.totalShares,
          currentOwnerKey,
        );
        if (devolutionResult.wouldDevolve && devolutionResult.newOwner) {
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
      }

      return { ok: true, investorId };
    },

    buyoutInvestor: (investorId: string) => {
      const s = get();
      const investor = s.syndicateInvestors?.[investorId];
      if (!investor) return { ok: false, reason: "Investor not found." };
      const syndicate = s.syndicates?.[investor.syndicateId];
      if (!syndicate) return { ok: false, reason: "Syndicate not found." };

      // Premium is proportional to (dis)satisfaction. Unhappy investors sell cheaper.
      const satisfactionFactor = 0.8 + investor.satisfaction / 100; // 0.8 - 1.8
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

      // Check for ownership devolution after buyout
      const updatedSyndicate = get().syndicates?.[investor.syndicateId];
      const stallion = updatedSyndicate ? get().horses[updatedSyndicate.stallionId] : undefined;
      if (updatedSyndicate && stallion) {
        const currentOwnerKey = stallion.stableId ?? "player";
        const devolutionResult = findMajorityOwner(
          updatedSyndicate.shareHolders,
          updatedSyndicate.totalShares,
          currentOwnerKey,
        );
        if (devolutionResult.wouldDevolve && devolutionResult.newOwner) {
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
                syndicateId: investor.syndicateId,
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
      }

      return { ok: true };
    },

    breedBatch: (entries) => {
      const s = get();
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

    saveMatingPlan: (name, entries) => {
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

    deleteMatingPlan: (planId) => {
      set((state) => ({
        savedMatingPlans: state.savedMatingPlans.filter((p) => p.id !== planId),
      }));
    },

    getSavedMatingPlan: (planId) => {
      return get().savedMatingPlans.find((p) => p.id === planId);
    },
  };
}
