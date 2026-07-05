/**
 * impacts/miscImpacts.ts - Miscellaneous impact types
 *
 * This file provides miscellaneous impact types including news items, logs,
 * reputation changes, staff actions, facility upgrades, scout reports,
 * consignments, consignment withdrawals, and auction resolutions.
 *
 * Dependencies: ./base (Impact), @/game/types (ScoutReport), ../../narrative/newsTypes (NewsItem)
 * Related files: ../handlers/MarketHandler.ts (handles impacts), ../handlers/SystemHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { ScoutReport } from "@/game/types";
import type { ReputationSource } from "@/core/reputation";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { TrackRecord } from "../../history/historyTypes";

// News impact
export interface NewsImpact extends Impact {
  type: "news_item";
  newsItem: NewsItem;
}

// Track record impact
export interface TrackRecordImpact extends Impact {
  type: "track_record";
  record: TrackRecord;
  reason: string;
}

// Log impact
export interface LogImpact extends Impact {
  type: "log";
  text: string;
  reason: string;
}

// Reputation impact
export interface ReputationImpact extends Impact {
  type: "reputation_change";
  delta: number;
  reason: string;
  source: ReputationSource;
  metadata?: Record<string, any>;
}

// Staff impact
export interface StaffImpact extends Impact {
  type: "staff";
  action: "hire" | "fire";
  stableId: string;
  staffId: string;
  role: import("@/core/staff/staffTypes").StaffRole;
  tier: import("@/core/staff/staffTypes").StaffTier;
  salary: number;
  reason: string;
}

// Trainer stats impact - updates trainer race records and fame (Phase 4)
export interface TrainerStatsImpact extends Impact {
  type: "trainer_stats";
  staffId: string;
  raceRecord: {
    wins: number;
    places: number;
    shows: number;
    starts: number;
  };
  fameDelta: number;
  specialty?: string; // e.g., "sprinter", "router", "turf", "dirt"
  reason: string;
}

// Facility upgrade impact
export interface FacilityUpgradeImpact extends Impact {
  type: "facility_upgrade";
  facilityId: string;
  nextLevel: number;
  cost?: number;
  reason: string;
}

// Scout report impact
export interface ScoutReportImpact extends Impact {
  type: "scout_report";
  report: ScoutReport;
  reason: string;
}

// Consignment impact
export interface ConsignmentImpact extends Impact {
  type: "consignment";
  horseId: string;
  saleId: string;
  reservePrice: number;
  consignorStableId?: string;
  breezeSeconds?: number;
  reason: string;
}

// Consignment withdrawal impact
export interface ConsignmentWithdrawalImpact extends Impact {
  type: "consignment_withdrawal";
  horseId: string;
  saleId: string;
  reason: string;
}

// Auction resolution impact
export interface AuctionResolutionImpact extends Impact {
  type: "auction_resolution";
  saleId: string;
  lotId: string;
  hammerPrice?: number;
  soldToStableId?: string;
  passed: boolean;
  bidHistory?: { stableId?: string; amount: number; tick: number }[];
  wasPlayerConsignment?: boolean;
  reason: string;
}

// Transport impact - Imperial Expansion
export interface TransportImpact extends Impact {
  type: "transport_horse";
  horseId: string;
  fromOutpostId: string;
  toOutpostId: string;
  fatigueSpike: number;
  acclimatizationDays: number;
  reason: string;
}

// Outpost impact - Imperial Expansion
export interface OutpostImpact extends Impact {
  type: "outpost_action";
  stableId: string;
  action: "create" | "upgrade_slot" | "assign_trainer";
  outpostId: string;
  metadata?: Record<string, any>;
  reason: string;
}

// Name reservation impact - reserves horse name for 25 years after death
export interface NameReservationImpact extends Impact {
  type: "name_reservation";
  name: string;
  deceasedOnDay: number;
  reason: string;
}

export type MiscImpact =
  | NewsImpact
  | TrackRecordImpact
  | LogImpact
  | ReputationImpact
  | StaffImpact
  | TrainerStatsImpact
  | FacilityUpgradeImpact
  | ScoutReportImpact
  | ConsignmentImpact
  | ConsignmentWithdrawalImpact
  | AuctionResolutionImpact
  | TransportImpact
  | OutpostImpact
  | NameReservationImpact;
