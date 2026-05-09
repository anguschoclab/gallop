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
import type { NewsItem } from "../../narrative/newsTypes";

// News impact
export interface NewsImpact extends Impact {
  type: "news_item";
  newsItem: NewsItem;
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
  source: string; // e.g. "race_win", "graded_win"
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

// Facility upgrade impact
export interface FacilityUpgradeImpact extends Impact {
  type: "facility_upgrade";
  facilityId: string;
  nextLevel: number;
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

export type MiscImpact =
  | NewsImpact
  | LogImpact
  | ReputationImpact
  | StaffImpact
  | FacilityUpgradeImpact
  | ScoutReportImpact
  | ConsignmentImpact
  | ConsignmentWithdrawalImpact
  | AuctionResolutionImpact;
