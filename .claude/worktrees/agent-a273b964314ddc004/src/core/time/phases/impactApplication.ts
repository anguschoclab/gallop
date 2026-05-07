// Impact Application Phase
// Applies all impacts to the state using the resolver

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";

/**
 * Impact Application Phase (Order 200)
 * Applies all impacts to the state:
 * - Uses Immer for immutable state updates
 * - Logs impacts based on logLevel
 * - Returns final state with all impacts applied
 */
export const impactApplicationPhase: PipelinePhase = {
  name: "impactApplication",
  order: 200,
  execute: (context: PipelineContext): PipelineContext => {
    const resolverContext: ResolverContext = {
      state: context.state,
      intents: context.intents,
      impacts: context.impacts,
      impactLog: context.impactLog,
      day: context.newDay,
    };

    const updatedContext = applyImpacts(resolverContext);

    return {
      ...context,
      state: updatedContext.state,
      impactLog: updatedContext.impactLog,
    };
  },
};
