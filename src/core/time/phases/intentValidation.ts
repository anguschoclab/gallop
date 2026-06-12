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

import { PHASE_ORDER_INTENT_VALIDATION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import { validateIntent } from "@/core/resolver/resolver";

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
    const horseMap = new Map(state.horses.map((h) => [h.id, h]));
    const raceMap = new Map(state.races.map((r) => [r.id, r]));
    const stableMap = new Map(state.npcStables.map((s) => [s.id, s]));

    const validIntents: typeof intents = [];

    for (const intent of intents) {
      const validation = validateIntent(intent, state, { horseMap, raceMap, stableMap });
      if (validation.valid) {
        validIntents.push(intent);
      }
    }

    return {
      ...context,
      intents: validIntents,
    };
  },
};
