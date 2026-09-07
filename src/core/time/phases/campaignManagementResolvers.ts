/**
 * campaignManagementResolvers.ts - Campaign-related management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "../pipeline";
import type {
  AnyIntent,
  CampaignSlotIntent,
  CampaignFlagDismissalIntent,
  CampaignCreationIntent,
  CampaignDeletionIntent,
  AutoManageToggleIntent,
} from "@/core/resolver/intents";
import type {
  AnyImpact,
  CampaignSlotImpact,
  CampaignFlagDismissalImpact,
  CampaignCreationImpact,
  CampaignDeletionImpact,
  AutoManageToggleImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

export function resolveCampaignIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { newDay, dailyRng } = context;

  switch (intent.type) {
    case "campaign_slot": {
      const typedIntent = intent as CampaignSlotIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "campaign_slot",
        horseId: typedIntent.horseId,
        slotIndex: typedIntent.slotIndex,
        slot: typedIntent.slot,
        reason: "Campaign slot updated",
      } as CampaignSlotImpact);
      return true;
    }

    case "campaign_flag_dismissal": {
      const typedIntent = intent as CampaignFlagDismissalIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "campaign_flag_dismissal",
        horseId: typedIntent.horseId,
        flagIndex: typedIntent.flagIndex,
        reason: "Campaign flag dismissed",
      } as CampaignFlagDismissalImpact);
      return true;
    }

    case "campaign_creation": {
      const typedIntent = intent as CampaignCreationIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "campaign_creation",
        horseId: typedIntent.horseId,
        goalType: typedIntent.goalType,
        targetRaceKey: typedIntent.targetRaceKey,
        slots: typedIntent.slots,
        autoManaged: typedIntent.autoManaged,
        reason: "Campaign created",
      } as CampaignCreationImpact);
      return true;
    }

    case "campaign_deletion": {
      const typedIntent = intent as CampaignDeletionIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "campaign_deletion",
        horseId: typedIntent.horseId,
        reason: "Campaign deleted",
      } as CampaignDeletionImpact);
      return true;
    }

    case "auto_manage_toggle": {
      const typedIntent = intent as AutoManageToggleIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "auto_manage_toggle",
        horseId: typedIntent.horseId,
        autoManaged: typedIntent.autoManaged,
        reason: "Auto-manage toggled",
      } as AutoManageToggleImpact);
      return true;
    }

    default:
      return false;
  }
}
