/**
 * raceFacade.ts — Service-layer facade for race domain.
 * Re-exports all race core modules so components import from @/services/race
 * instead of @/core/race, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

// Race domain modules
export * from "@/core/race/types";
export * from "@/core/race/engine/runnerBuilder";
export * from "@/core/race/runnerConditions";
// raceSnapshotTypes re-exported explicitly to avoid SectionalSplit conflict with types
export type {
  HorseSnapshot,
  RaceSnapshot,
  RaceReplay,
  PaceSnapshot,
} from "@/core/race/engine/raceSnapshotTypes";
export * from "@/core/race/raceVerdict";
export * from "@/core/race/preShowField";
export * from "@/core/race/jockeyReport";
export * from "@/core/race/headToHead";
export * from "@/core/race/engine/simulation";
export * from "@/core/race/beyer";
export * from "@/core/race/bestPace";
export * from "@/core/race/transportCost";
export * from "@/core/race/eligibility";
export * from "@/core/race/grading";
export * from "@/core/race/filtering";
export * from "@/core/race/fieldManager";
export * from "@/core/race/dosage";
export * from "@/core/race/environment";
export * from "@/core/race/factorLedger";
export * from "@/core/race/groupRacesByDate";
export * from "@/core/race/maidenGuarantee";
export * from "@/core/race/entryScoring";
export * from "@/core/race/entryScoringConstants";
export * from "@/core/race/raceSuitabilityScorers";

// sectionalAnalysis re-exported explicitly to resolve SectionalSplit ambiguity
// with @/core/race/types
export {
  interpolateTimeAtDistance,
  calculateSectionalSplits,
  computeSectionalSplits,
  derivePaceStyleLabel,
} from "@/core/race/sectionalAnalysis";

// Cross-domain re-exports used by race components
export {
  formatCurrency,
  formatTime,
  formatClockTime,
  buildRaceTimeViews,
} from "@/core/common/formatting";
export type { RaceTimeView } from "@/core/common/formatting";
export {
  gradeColor,
  statGradeColor,
  stableTierColor,
  conditionColor,
} from "@/core/common/uiTokens";
export { formatDate, getMonthName, gameCalendarDate } from "@/core/calendar/dateFormatting";
export { getCompatibility } from "@/core/jockey/compatibility";
export * from "@/core/race/raceSimulationService";
export * from "@/core/race/raceImpactGenerator";
export * from "@/core/race/raceSimulationExecutor";
