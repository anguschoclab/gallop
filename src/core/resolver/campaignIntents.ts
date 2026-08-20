/**
 * campaignIntents.ts - Campaign-related intent definitions
 *
 * Extracted from intents.ts for modularity.
 */

import type { Intent } from "./intentTypes";

export interface CampaignSlotIntent extends Intent {
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
}

export interface CampaignFlagDismissalIntent extends Intent {
  type: "campaign_flag_dismissal";
  horseId: string;
  flagIndex: number;
}

export interface CampaignCreationIntent extends Intent {
  type: "campaign_creation";
  horseId: string;
  goalType:
    "chase_g1" | "chase_g2" | "chase_g3" | "maximize_earnings" | "develop_maiden" | "free_run";
  targetRaceKey?: string;
}

export interface CampaignDeletionIntent extends Intent {
  type: "campaign_deletion";
  horseId: string;
}

export interface AutoManageToggleIntent extends Intent {
  type: "auto_manage_toggle";
  horseId: string;
  autoManaged: boolean;
}
