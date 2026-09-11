/**
 * racePorts.ts - Re-export of race resolution port interfaces.
 *
 * The canonical port definitions live in @/core/time/pipelinePorts
 * (where PipelineContext consumes them). This file re-exports the
 * race-specific port interface so consumers can import from the
 * race domain directory if preferred.
 *
 * Related files: src/core/time/pipelinePorts.ts (canonical definition)
 */

export type { RaceResolutionPorts } from "@/core/time/pipelinePorts";
