/**
 * managementResolutionHelpers.ts - Management intent resolution dispatch
 *
 * This file dispatches management intents to domain-specific resolver modules.
 * Each resolver handles a subset of intent types and pushes impacts to the accumulator.
 *
 * Dependencies: ../pipeline (PipelineContext), ./jockeyManagementResolvers, ./facilityManagementResolvers, ./horseManagementResolvers, ./campaignManagementResolvers, ./insuranceManagementResolvers
 * Related files: managementResolution.ts (uses phase)
 */

import type { PipelineContext } from "@/platform/time/pipeline";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { AnyImpact } from "@/platform/resolver/impacts";
import { resolveJockeyIntent } from "@/platform/time/phases/jockeyManagementResolvers";
import { resolveFacilityIntent } from "@/platform/time/phases/facilityManagementResolvers";
import { resolveHorseIntent } from "@/platform/time/phases/horseManagementResolvers";
import { resolveCampaignIntent } from "@/platform/time/phases/campaignManagementResolvers";
import { resolveInsuranceIntent } from "@/platform/time/phases/insuranceManagementResolvers";
import { resolveStaffIntent } from "@/platform/time/phases/staffManagementResolvers";

// Re-export applyInsurancePremiums for backward compatibility
export { applyInsurancePremiums } from "@/platform/time/phases/insuranceManagementResolvers";

/**
 * Resolve a single management intent into impacts.
 *
 * Dispatches to the appropriate domain-specific resolver based on intent type.
 *
 * @param intent - The intent to resolve.
 * @param context - The pipeline context.
 * @param impacts - Accumulator array for generated impacts.
 */
export function resolveManagementIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): void {
  if (resolveJockeyIntent(intent, context, impacts)) return;
  if (resolveFacilityIntent(intent, context, impacts)) return;
  if (resolveHorseIntent(intent, context, impacts)) return;
  if (resolveCampaignIntent(intent, context, impacts)) return;
  if (resolveInsuranceIntent(intent, context, impacts)) return;
  if (resolveStaffIntent(intent, context, impacts)) return;
}
