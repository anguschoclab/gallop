/**
 * runnerConditions.ts - Re-exports for runner conditions and mood
 *
 * This file now re-exports types, condition derivation, and mood functions
 * from dedicated modules for backward compatibility.
 */

export {
  METRES_PER_LENGTH,
  type ConditionTone,
  type RunnerConditionId,
  type RunnerCondition,
  type FieldContext,
  type RunnerHistory,
  type MoodFace,
  type MoodSignal,
  type RunnerMood,
} from "@/domains/race/model/runnerConditionTypes";

export { buildFieldContext, deriveRunnerConditions } from "@/domains/race/simulation/runnerConditionDerivation";

export { deriveRunnerMood, captureRunnerMoods } from "@/domains/race/simulation/runnerMood";
