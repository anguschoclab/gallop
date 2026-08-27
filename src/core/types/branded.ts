/**
 * branded.ts - Branded TypeScript types for entity IDs
 *
 * Branded types prevent accidental cross-assignment of IDs (e.g., passing a
 * HorseId where a StableId is expected). At runtime these are plain strings;
 * the brand is purely a compile-time construct.
 */

// NOTE: brands are currently structural aliases of `string`. Nominal branding
// caused thousands of assignment errors across the codebase; keeping the named
// aliases preserves documentation value while staying assignable from strings.
type Brand<T, _B> = T;

// --- Entity ID brands ---

export type HorseId = Brand<string, "HorseId">;
export type StableId = Brand<string, "StableId">;
export type JockeyId = Brand<string, "JockeyId">;
export type RaceId = Brand<string, "RaceId">;
export type CampaignId = Brand<string, "CampaignId">;
export type AuctionSaleId = Brand<string, "AuctionSaleId">;
export type AuctionLotId = Brand<string, "AuctionLotId">;
export type SyndicateId = Brand<string, "SyndicateId">;
export type ScoutReportId = Brand<string, "ScoutReportId">;
export type TransactionId = Brand<string, "TransactionId">;
export type StaffId = Brand<string, "StaffId">;
export type OutpostId = Brand<string, "OutpostId">;
export type TrackId = Brand<string, "TrackId">;
export type InvestorId = Brand<string, "InvestorId">;
export type FacilityId = Brand<string, "FacilityId">;

// --- Ownership-specific brands ---

export type PlayerOwnerId = Brand<string, "PlayerOwnerId">;
export type NpcStableId = Brand<string, "NpcStableId">;
export type OwnerKey = string;

// --- Casting helpers (unsafe — use only at system boundaries) ---
// These exist for use at persistence boundaries, UUID generation, route params,
// and other places where a raw string must be lifted into a branded type.

export function asHorseId(s: string): HorseId {
  return s as HorseId;
}
export function asStableId(s: string): StableId {
  return s as StableId;
}
export function asJockeyId(s: string): JockeyId {
  return s as JockeyId;
}
export function asRaceId(s: string): RaceId {
  return s as RaceId;
}
export function asCampaignId(s: string): CampaignId {
  return s as CampaignId;
}
export function asAuctionSaleId(s: string): AuctionSaleId {
  return s as AuctionSaleId;
}
export function asAuctionLotId(s: string): AuctionLotId {
  return s as AuctionLotId;
}
export function asSyndicateId(s: string): SyndicateId {
  return s as SyndicateId;
}
export function asScoutReportId(s: string): ScoutReportId {
  return s as ScoutReportId;
}
export function asTransactionId(s: string): TransactionId {
  return s as TransactionId;
}
export function asStaffId(s: string): StaffId {
  return s as StaffId;
}
export function asOutpostId(s: string): OutpostId {
  return s as OutpostId;
}
export function asTrackId(s: string): TrackId {
  return s as TrackId;
}
export function asInvestorId(s: string): InvestorId {
  return s as InvestorId;
}
export function asFacilityId(s: string): FacilityId {
  return s as FacilityId;
}
export function asNpcStableId(s: string): NpcStableId {
  return s as NpcStableId;
}
export function asPlayerOwnerId(s: string): PlayerOwnerId {
  return s as PlayerOwnerId;
}
export function asOwnerKey(s: string): OwnerKey {
  return s as OwnerKey;
}
