/**
 * narrativePorts.ts - Re-export of narrative port interfaces.
 *
 * The canonical port definitions live in @/core/time/pipelinePorts
 * (where PipelineContext consumes them). This file re-exports the
 * narrative-specific port interface so consumers can import from the
 * narrative domain directory if preferred.
 *
 * Related files: src/core/time/pipelinePorts.ts (canonical definition)
 */

export type { NarrativePorts } from "@/core/time/pipelinePorts";
