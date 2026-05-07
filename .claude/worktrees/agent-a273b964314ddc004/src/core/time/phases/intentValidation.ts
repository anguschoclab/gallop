// Intent Validation Phase
// Validates all intents and rejects invalid ones

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
  order: 10,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state } = context;
    const validIntents: typeof intents = [];

    for (const intent of intents) {
      const validation = validateIntent(intent, state);
      if (validation.valid) {
        validIntents.push(intent);
      }
      // Invalid intents are silently rejected for now
      // Could log rejection reasons in impactLog in the future
    }

    return {
      ...context,
      intents: validIntents,
    };
  },
};
