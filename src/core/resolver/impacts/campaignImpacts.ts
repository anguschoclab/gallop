/**
 * impacts/campaignImpacts.ts - Campaign impact types
 *
 * This file provides campaign-related impact types including campaign slots,
 * campaign flags, campaign flag dismissals, campaign creation, and campaign deletion.
 *
 * Dependencies: ./base (Impact), @/game/types (HorseCampaign, CampaignFlag)
 * Related files: ../handlers/SystemHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { HorseCampaign, CampaignFlag } from "@/game/types";

// Campaign slot impact
export interface CampaignSlotImpact extends Impact {
  type: "campaign_slot";
  horseId: string;
  slotIndex: number;
  slot: Partial<{
    dayTarget: number;
    dayWindow: number;
    raceId: string;
    raceKey: string;
    role: "target" | "prep" | "comeback";
    constraintDistance?: number;
    constraintSurface?: "Turf" | "Dirt" | "Synthetic";
    constraintGradeMin?: "G1" | "G2" | "G3" | "Stakes" | "Allowance";
    notes?: string;
    status: "planned" | "entered" | "completed" | "skipped" | "cancelled";
  }>;
  reason: string;
}

// Campaign flag impact
export interface CampaignFlagImpact extends Impact {
  type: "campaign_flag";
  horseId: string;
  flag: CampaignFlag;
  reason: string;
}

// Campaign flag dismissal impact
export interface CampaignFlagDismissalImpact extends Impact {
  type: "campaign_flag_dismissal";
  horseId: string;
  flag: CampaignFlag;
  reason: string;
}

// Campaign creation impact
export interface CampaignCreationImpact extends Impact {
  type: "campaign_creation";
  campaign: HorseCampaign;
  reason: string;
}

// Campaign deletion impact
export interface CampaignDeletionImpact extends Impact {
  type: "campaign_deletion";
  horseId: string;
  reason: string;
}

// Auto-manage toggle impact
export interface AutoManageToggleImpact extends Impact {
  type: "auto_manage_toggle";
  horseId: string;
  autoManaged: boolean;
  reason: string;
}

// Triple Crown progress impact
export interface TripleCrownProgressImpact extends Impact {
  type: "triple_crown_progress";
  horseId: string;
  triplecrownKey: string;
  year: number;
  legs: { raceKey: string; position: number; day: number }[];
  won: boolean;
  reason: string;
}

export type CampaignImpact =
  | CampaignSlotImpact
  | CampaignFlagImpact
  | CampaignFlagDismissalImpact
  | CampaignCreationImpact
  | CampaignDeletionImpact
  | AutoManageToggleImpact
  | TripleCrownProgressImpact;
