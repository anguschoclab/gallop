/**
 * phases/managementResolution.ts - Management resolution phase
 *
 * This file provides the management resolution phase that processes player intents
 * for infrastructure, jockeys, and horse management.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), ./managementResolutionHelpers (resolveManagementIntent, processInsurancePremiums)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_MANAGEMENT_RESOLUTION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { resolveManagementIntent, processInsurancePremiums } from "./managementResolutionHelpers";

/**
 * Management Resolution Phase (Order 10)
 * Resolves various management intents into impacts.
 */
export const managementResolutionPhase: PipelinePhase = {
  name: "managementResolution",
  order: PHASE_ORDER_MANAGEMENT_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents } = context;
    const impacts: AnyImpact[] = [];

    processInsurancePremiums(context, impacts);

    for (const intent of intents) {
      resolveManagementIntent(intent, context, impacts);
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
