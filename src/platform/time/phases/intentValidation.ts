/**
 * phases/intentValidation.ts - Intent validation phase
 *
 * This file provides the intent validation phase that validates all intents
 * and rejects invalid ones.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/resolver (validateIntent)
 * Related files: ../pipeline.ts (uses phase)
 */

// Intent Validation Phase
// Validates all intents and rejects invalid ones

import { PHASE_ORDER_INTENT_VALIDATION } from "@/platform/time/pipelineConstants";;
import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";
import { validateIntent } from "@/platform/resolver/resolver";

/**
 * Intent Validation Phase (Order 10)
 * Validates all intents:
 * - Checks eligibility (sufficient cash, energy, etc.)
 * - Rejects invalid intents with reasons
 * - Returns only valid intents for resolution
 */
export const intentValidationPhase: PipelinePhase = {
  name: "intentValidation",
  order: PHASE_ORDER_INTENT_VALIDATION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state } = context;
    const { horseMap, raceMap, stableMap } = context;

    const validIntents: typeof intents = [];
    const rejectionLogs: PipelineContext["logs"] = [];

    for (const intent of intents) {
      const validation = validateIntent(intent, state, { horseMap, raceMap, stableMap });
      if (validation.valid) {
        validIntents.push(intent);
      } else {
        rejectionLogs.push({
          day: context.newDay,
          text: `Intent rejected (${intent.type}): ${validation.reason ?? "Invalid intent"}`,
        });
      }
    }

    return {
      ...context,
      intents: validIntents,
      logs: [...context.logs, ...rejectionLogs],
    };
  },
};
