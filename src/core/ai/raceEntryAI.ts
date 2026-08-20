/**
 * raceEntryAI.ts - Re-exports for race entry AI system
 *
 * This file re-exports types, scoring, and recording functions from
 * dedicated modules for backward compatibility.
 */

export {
  type RaceEntryAIState,
  type StrategicPlan,
  type HorseDevelopmentTrack,
  createRaceEntryAIState,
} from "./raceEntryAITypes";

export { calculateStrategicEntryScore } from "./raceEntryAIScoring";

export {
  updateHorseDevelopment,
  recordRaceEntryOutcome,
  generateMultiRaceStrategy,
  adaptStrategy,
  conflictsWithCampaignPrep,
} from "./raceEntryAIRecording";
