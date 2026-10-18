/**
 * raceFacade.ts — Service-layer facade for race domain.
 * Re-exports all race core modules so components import from @/services/race
 * instead of @/core/race, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

// Race domain modules
export * from "@/domains/race/simulation/types";
export * from "@/domains/race/simulation/engine/runnerBuilder";
export * from "@/domains/race/simulation/runnerConditions";
export type { RunnerCondition } from "@/domains/race/model/runnerConditionTypes";
// raceSnapshotTypes re-exported explicitly to avoid SectionalSplit conflict with types
export type {
  HorseSnapshot,
  RaceSnapshot,
  RaceReplay,
  PaceSnapshot,
} from "@/domains/race/model/engine/raceSnapshotTypes";
export * from "@/domains/race/simulation/raceVerdict";
export * from "@/domains/race/simulation/preShowField";
export * from "@/domains/race/simulation/jockeyReport";
export * from "@/domains/race/simulation/headToHead";
export * from "@/domains/race/simulation/engine/simulation";
export * from "@/domains/race/simulation/beyer";
export * from "@/domains/race/simulation/bestPace";
export * from "@/domains/race/simulation/transportCost";
export * from "@/domains/race/simulation/eligibility";
export * from "@/domains/race/simulation/grading";
export * from "@/domains/race/simulation/filtering";
export * from "@/domains/race/simulation/fieldManager";
export * from "@/domains/race/simulation/dosage";
export * from "@/domains/race/simulation/environment";
export * from "@/domains/race/simulation/factorLedger";
export * from "@/domains/race/simulation/groupRacesByDate";
export * from "@/domains/race/simulation/maidenGuarantee";
export * from "@/domains/race/simulation/entryScoring";
export * from "@/domains/race/simulation/entryScoringConstants";
export * from "@/domains/race/simulation/raceSuitabilityScorers";

// sectionalAnalysis re-exported explicitly to resolve SectionalSplit ambiguity
// with @/core/race/types
export {
  interpolateTimeAtDistance,
  calculateSectionalSplits,
  computeSectionalSplits,
  derivePaceStyleLabel,
} from "@/domains/race/simulation/sectionalAnalysis";

// Cross-domain re-exports used by race components
export {
  formatCurrency,
  formatTime,
  formatClockTime,
  buildRaceTimeViews,
} from "@/shared/common/formatting";
export type { RaceTimeView } from "@/shared/common/formatting";
export {
  gradeColor,
  statGradeColor,
  stableTierColor,
  conditionColor,
} from "@/shared/common/uiTokens";
export { formatDate, getMonthName, gameCalendarDate } from "@/domains/calendar/simulation/dateFormatting";
export { getCompatibility } from "@/domains/jockey/simulation/compatibility";
export * from "@/domains/race/simulation/raceSimulationService";
export * from "@/domains/race/simulation/raceImpactGenerator";
export * from "@/domains/race/simulation/raceSimulationExecutor";
