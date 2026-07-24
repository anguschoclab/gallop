import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import type { PipelinePhase } from "@/core/time/pipeline";

export const STAGE_RANGES = [
  { min: 1, max: 14, name: "Intent processing" },
  { min: 15, max: 45, name: "Resolution intents" },
  { min: 50, max: 95, name: "Core simulation" },
  { min: 100, max: 165, name: "Lifecycle" },
  { min: 190, max: 200, name: "Final resolution" },
] as const;

export const STAGE_PHASES: PipelinePhase[][] = STAGE_RANGES.map(({ min, max }) =>
  GAME_PIPELINE_PHASES.filter((p) => p.order >= min && p.order <= max),
);
