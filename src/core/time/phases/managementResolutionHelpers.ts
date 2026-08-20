/**
 * managementResolutionHelpers.ts - Management intent resolution dispatch
 *
 * This file dispatches management intents to domain-specific resolver modules.
 * Each resolver handles a subset of intent types and pushes impacts to the accumulator.
 *
 * Dependencies: ../pipeline (PipelineContext), ./jockeyManagementResolvers, ./facilityManagementResolvers, ./horseManagementResolvers, ./campaignManagementResolvers, ./insuranceManagementResolvers
 * Related files: managementResolution.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import type { AnyIntent } from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { resolveJockeyIntent } from "./jockeyManagementResolvers";
import { resolveFacilityIntent } from "./facilityManagementResolvers";
import { resolveHorseIntent } from "./horseManagementResolvers";
import { resolveCampaignIntent } from "./campaignManagementResolvers";
import { resolveInsuranceIntent, processInsurancePremiums } from "./insuranceManagementResolvers";

// Re-export processInsurancePremiums for backward compatibility
export { processInsurancePremiums } from "./insuranceManagementResolvers";

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
}
