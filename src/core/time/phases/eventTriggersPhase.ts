/**
 * eventTriggersPhase.ts - Pipeline phase for event registry triggers
 *
 * Executes all registered event triggers at the end of the pipeline
 * (after cash-pressure history, order 202). This allows triggers to
 * observe the fully-updated end-of-day state.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), ../events (eventRegistry)
 * Related files: ../events.ts (event registry, trigger helpers)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { eventRegistry } from "../events";
import { PHASE_ORDER_EVENT_TRIGGERS } from "@/constants/pipelineConstants";

/**
 * Executes all active event triggers for the current day.
 *
 * Triggers are filtered by their condition function and executed
 * in priority order (highest first) by the registry itself.
 *
 * @param context - Pipeline context containing current state and day
 * @returns The unchanged pipeline context (triggers mutate context in place)
 */
function executeEventTriggers(context: PipelineContext): PipelineContext {
  eventRegistry.executeTriggers(context);
  return context;
}

export const eventTriggersPhase: PipelinePhase = {
  name: "event-triggers",
  order: PHASE_ORDER_EVENT_TRIGGERS,
  execute: executeEventTriggers,
};
