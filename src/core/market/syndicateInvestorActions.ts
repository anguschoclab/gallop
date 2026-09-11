/**
 * syndicateInvestorActions.ts - Pure helpers for syndicate investor solicitation.
 *
 * Extracted from syndicateActions.solicitInvestor so the slice becomes a thin
 * coordinator. The pure logic (investor creation, share transaction building,
 * activity feed entries) lives here; the slice handles state mutation via set().
 *
 * Per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Syndicate, ShareTransaction, ShareActivityFeedItem),
 *              @/core/uuid (generateUUID), @/core/common/rng (createRng, hashStr),
 *              @/core/syndicate/personality (pickPersonality, generateInvestorName,
 *              buildDefaultExpectations), @/core/types/branded (asPlayerOwnerId, asOwnerKey)
 * Related files: src/game/store/slices/syndicateActions.ts (coordinator)
 */

import type { ShareTransaction, ShareActivityFeedItem, Syndicate } from "@/core/breeding/types";
import type { OwnerKey } from "@/core/types/branded";
import type { InvestorRecord, InvestorPersonality } from "@/core/breeding/investorTypes";
import { generateUUID } from "@/core/uuid";
import { createRng, hashStr } from "@/core/common/rng";
import {
  pickPersonality,
  generateInvestorName,
  buildDefaultExpectations,
} from "@/core/breeding/investorTypes";
import { asPlayerOwnerId, asOwnerKey } from "@/core/types/branded";

/** Input for building a new investor. */
export interface SolicitInvestorInput {
  syndicateId: string;
  sharesOffered: number;
  sharePrice: number;
  stallionName: string;
  currentDay: number;
  playerShares: number;
  shareHolders: Record<OwnerKey, number>;
}

/** Output of building a new investor and the associated transactions. */
export interface SolicitInvestorResult {
  investor: InvestorRecord;
  price: number;
  nextShareHolders: Record<OwnerKey, number>;
  transaction: ShareTransaction;
  activityFeedItem: ShareActivityFeedItem;
  logText: string;
}

/**
 * Build a new investor and the associated share transaction + activity feed entry.
 * @param input
 */
export function buildSolicitedInvestor(input: SolicitInvestorInput): SolicitInvestorResult {
  const {
    syndicateId,
    sharesOffered,
    sharePrice,
    stallionName,
    currentDay,
    playerShares,
    shareHolders,
  } = input;
  const rng = createRng(hashStr(`investor_${syndicateId}_${currentDay}_${sharesOffered}`));
  const personality: InvestorPersonality = pickPersonality(rng.next);
  const name = generateInvestorName(rng.next);
  const investorId = `inv-${generateUUID().slice(0, 8)}`;
  const price = sharePrice * sharesOffered;

  const investor: InvestorRecord = {
    id: investorId,
    syndicateId,
    name,
    stableId: asPlayerOwnerId(investorId),
    personality,
    shares: sharesOffered,
    investedCash: price,
    joinedDay: currentDay,
    satisfaction: 70,
    expectations: buildDefaultExpectations(personality, sharesOffered, sharePrice),
  };

  const nextShareHolders = {
    ...shareHolders,
    [asPlayerOwnerId("player")]: playerShares - sharesOffered,
    [asOwnerKey(investorId)]: (shareHolders[asOwnerKey(investorId)] ?? 0) + sharesOffered,
  };

  const transaction: ShareTransaction = {
    id: generateUUID(),
    syndicateId,
    buyerStableId: asOwnerKey(investorId),
    sellerStableId: asPlayerOwnerId("player"),
    shares: sharesOffered,
    pricePerShare: sharePrice,
    day: currentDay,
  };

  const activityFeedItem: ShareActivityFeedItem = {
    id: generateUUID(),
    syndicateId,
    syndicateName: stallionName,
    type: "investor_solicit" as const,
    buyerStableId: asOwnerKey(investorId),
    sellerStableId: asPlayerOwnerId("player"),
    shares: sharesOffered,
    pricePerShare: sharePrice,
    cashMoved: price,
    day: currentDay,
  };

  const logText = `${name} (${personality}) invested $${price.toLocaleString()} for ${sharesOffered} shares of ${stallionName}.`;

  return { investor, price, nextShareHolders, transaction, activityFeedItem, logText };
}
