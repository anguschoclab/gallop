/**
 * descriptors.ts - Declarative production phase registry.
 *
 * `GAME_PHASE_DESCRIPTORS` is the single authoritative description of the
 * simulation pipeline: identity, ordering (legacy numeric order retained as
 * tie-breaker only), dependency edges, produced/consumed context products,
 * cadence, and write sets. `GAME_SCHEDULE` is the compiled, validated
 * execution plan consumed by the SimulationExecutor — numeric stage ranges
 * are no longer a correctness authority.
 *
 * Adding a phase: register the PipelinePhase in `phases/index.ts` AND wrap it
 * in a descriptor here. The coverage guard and the compiler fail fast on
 * unregistered phases, missing dependencies, product mismatches, cycles,
 * duplicate ids, and unordered writer conflicts.
 */

import { describePhase, compileSchedule, type PhaseDescriptor } from "@/core/time/scheduler";
import { GAME_PIPELINE_PHASES } from "./index";

import { intentCollectionPhase } from "./intentCollection";
import { intentValidationPhase } from "./intentValidation";
import { privateSaleExpiryPhase } from "./privateSaleExpiry";
import { privateSaleResolutionPhase } from "./privateSaleResolution";
import { upkeepPhase } from "./upkeep";
import { npcBankruptcyPhase } from "./npcBankruptcy";
import { agingPhase } from "./aging";
import { breedingSeasonPhase } from "./breedingSeason";
import { industryMetricsPhase } from "./industryMetricsPhase";
import { npcBreedingPhase } from "./npcBreedingPhase";
import { energyPhase } from "./energy";
import { marketPhase } from "./market";
import { racesPhase } from "./races";
import { beyerRecalibrationPhase } from "./beyerRecalibration";
import { gateDrawPhase } from "./gateDraw";
import { jockeyPhase } from "./jockeyPhase";
import { pregnancyPhase } from "./pregnancy";
import { npcCyclePhase } from "./npcCycle";
import { stallionRetirementPhase } from "./stallionRetirement";
import { pastureRetirementPhase } from "./pastureRetirement";
import { hallOfFamePhase } from "./hallOfFame";
import { horseDeathPhase } from "./horseDeath";
import { nameReservationPhase } from "./nameReservation";
import { auctionsPhase } from "./auctions";
import { leaderboardPhase } from "./leaderboardPhase";
import { awardsPhase } from "./awards";
import { awardInvitationsPhase } from "./awardInvitations";
import { schedulerPhase } from "./schedulerPhase";
import { raceCancellationPhase } from "./raceCancellation";
import { raceEntryResolutionPhase } from "./raceEntryResolution";
import { consignmentResolutionPhase } from "./consignmentResolution";
import { purchaseResolutionPhase } from "./purchaseResolution";
import { breedingResolutionPhase } from "./breedingResolution";
import { trainingResolutionPhase } from "./trainingResolution";
import { claimingWithdrawalPhase } from "./claimingWithdrawal";
import { managementResolutionPhase } from "./managementResolution";
import { npcClaimingPhase } from "./npcClaiming";
import { raceResolutionPhase } from "./raceResolution";
import { stewardsPhase } from "./stewardsPhase";
import { claimResolutionPhase } from "./claimResolution";
import { archivingPhase } from "./archivingPhase";
import { seasonStandingsPhase } from "./seasonStandingsPhase";
import { impactApplicationPhase } from "./impactApplication";
import { weatherPhase } from "./weatherPhase";
import { raceInvitationsPhase } from "./raceInvitations";
import { foalDevelopmentPhase } from "./foalDevelopmentPhase";
import { solvencyPhase } from "./solvency";
import { worldAssessmentPhase } from "./worldAssessmentPhase";
import { diplomacyPhase } from "./diplomacyPhase";
import { npcCareerTrackerPhase } from "./npcCareerTrackerPhase";
import { npcMilestoneAlertsPhase } from "./npcMilestoneAlertsPhase";
import { narrativePhase } from "./narrativePhase";
import { economyPhase } from "./economyPhase";
import { difficultyPhase } from "./difficultyPhase";
import { cashPressureHistoryPhase } from "./cashPressureHistoryPhase";
import { eventTriggersPhase } from "./eventTriggersPhase";
import { exchangeSettlementPhase } from "./exchangeSettlementPhase";
import { dailySnapshotPhase } from "./dailySnapshotPhase";

/**
 * Context products: "worldAssessment" (worldAssessment → economy, diplomacy,
 * npcCycle, narrative) and "economicTrend" (economy → market, npcCycle,
 * auctions).
 */
export const GAME_PHASE_DESCRIPTORS: PhaseDescriptor[] = [
  // ── World assessment (produces context.worldAssessment) ──────────────────
  describePhase(worldAssessmentPhase, {
    label: "World assessment",
    cadence: "daily",
    provides: ["worldAssessment"],
    writes: ["npcAIManager"],
  }),

  // ── Intent lifecycle ─────────────────────────────────────────────────────
  describePhase(intentCollectionPhase, {
    label: "Collect intents",
    cadence: "daily",
    provides: ["intents"],
    writes: ["pendingIntents", "intents"],
  }),
  describePhase(intentValidationPhase, {
    label: "Validate intents",
    cadence: "daily",
    dependsOn: ["intentCollection"],
    requires: ["intents"],
    writes: ["intents"],
  }),
  describePhase(privateSaleExpiryPhase, {
    label: "Private sale expiry",
    cadence: "daily",
    writes: ["privateSaleOffers", "log"],
  }),

  // ── Economy ──────────────────────────────────────────────────────────────
  describePhase(upkeepPhase, {
    label: "Upkeep",
    cadence: "daily",
    writes: ["cash", "expenses", "npcStables", "horses", "log"],
  }),
  describePhase(npcBankruptcyPhase, {
    label: "NPC bankruptcy",
    cadence: "daily",
    writes: ["npcStables", "horses", "auctions", "log"],
  }),
  describePhase(agingPhase, {
    label: "Aging",
    cadence: "daily",
    writes: ["horses"],
  }),
  describePhase(breedingSeasonPhase, {
    label: "Breeding season",
    cadence: "daily",
    writes: ["npcAIManager", "log"],
  }),
  describePhase(industryMetricsPhase, {
    label: "Industry metrics",
    cadence: "seasonal",
    lastRunField: "industryEarningsUpdatedDay",
    writes: ["industryEarningsUpdatedDay", "industryMeanEarnings", "log"],
  }),
  describePhase(npcBreedingPhase, {
    label: "NPC breeding",
    cadence: "daily",
    writes: ["pregnancies", "npcAIManager"],
  }),
  describePhase(energyPhase, {
    label: "Energy",
    cadence: "daily",
    writes: ["horses"],
  }),
  describePhase(privateSaleResolutionPhase, {
    label: "Private sale resolution",
    cadence: "daily",
    writes: ["privateSaleOffers", "horses", "cash", "log"],
  }),
  describePhase(economyPhase, {
    label: "Economy",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    provides: ["economicTrend"],
    writes: ["npcAIManager"],
  }),
  describePhase(marketPhase, {
    label: "Market",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    writes: ["market", "horses", "npcStables", "npcAIManager", "log"],
  }),
  describePhase(weatherPhase, {
    label: "Weather",
    cadence: "daily",
    writes: ["weatherByTrack", "weatherBuffer"],
  }),
  describePhase(raceInvitationsPhase, {
    label: "Race invitations",
    cadence: "daily",
    writes: ["races", "inbox"],
  }),
  describePhase(racesPhase, {
    label: "Race schedule",
    cadence: "daily",
    writes: ["races", "log"],
  }),
  describePhase(beyerRecalibrationPhase, {
    label: "Beyer recalibration",
    cadence: "daily",
    writes: ["calibratedPars", "paceSamples", "lastCalibrationDay"],
  }),
  describePhase(gateDrawPhase, {
    label: "Gate draw",
    cadence: "daily",
    writes: ["races", "log"],
  }),
  describePhase(jockeyPhase, {
    label: "Jockeys",
    cadence: "daily",
    writes: ["jockeys", "npcStables", "npcAIManager", "log"],
  }),
  describePhase(pregnancyPhase, {
    label: "Pregnancy",
    cadence: "daily",
    writes: ["pregnancies", "horses", "npcAIManager", "log"],
  }),
  describePhase(npcCyclePhase, {
    label: "NPC cycle",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    writes: ["npcStables", "horses", "npcAIManager", "log"],
  }),
  describePhase(diplomacyPhase, {
    label: "Diplomacy",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    writes: ["npcAIManager", "log"],
  }),
  describePhase(npcCareerTrackerPhase, {
    label: "NPC careers",
    cadence: "daily",
    writes: ["horses", "npcAIManager"],
  }),
  describePhase(npcMilestoneAlertsPhase, {
    label: "NPC milestones",
    cadence: "daily",
    writes: ["inbox", "npcAIManager"],
  }),
  describePhase(stallionRetirementPhase, {
    label: "Stallion retirement",
    cadence: "daily",
    writes: ["horses", "npcStables", "log"],
  }),
  describePhase(pastureRetirementPhase, {
    label: "Pasture retirement",
    cadence: "daily",
    writes: ["horses", "log"],
  }),
  describePhase(hallOfFamePhase, {
    label: "Hall of Fame",
    cadence: "daily",
    writes: ["hallOfFame", "horses", "log"],
  }),
  describePhase(horseDeathPhase, {
    label: "Horse death",
    cadence: "daily",
    writes: ["horses", "log"],
  }),
  describePhase(nameReservationPhase, {
    label: "Name reservations",
    cadence: "daily",
    writes: ["reservedHorseNames"],
  }),
  describePhase(auctionsPhase, {
    label: "Auctions",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    writes: ["auctions", "horses", "npcStables", "cash", "log", "impacts"],
  }),
  describePhase(leaderboardPhase, {
    label: "Leaderboards",
    cadence: "weekly",
    lastRunField: "leaderboardsUpdatedDay",
    writes: [
      "horseLeaderboards",
      "leaderboardsUpdatedDay",
      "lastFounderUpdateDay",
      "founders",
      "log",
    ],
  }),
  describePhase(awardInvitationsPhase, {
    label: "Award invitations",
    cadence: "daily",
    writes: ["awardInvitations", "inbox"],
  }),
  describePhase(awardsPhase, {
    label: "Awards",
    cadence: "daily",
    writes: ["awards", "pendingAwardCeremonies", "inbox", "log"],
  }),
  describePhase(schedulerPhase, {
    label: "Scheduler",
    cadence: "daily",
    writes: ["pendingIntents", "campaigns", "strategyJournal", "log"],
  }),
  describePhase(raceCancellationPhase, {
    label: "Race cancellation",
    cadence: "daily",
    writes: ["races", "log"],
  }),

  // ── Intent resolution (convert intents to impacts) ───────────────────────
  describePhase(raceEntryResolutionPhase, {
    label: "Race entries",
    cadence: "daily",
    writes: ["races", "impacts", "log", "npcAIManager"],
  }),
  describePhase(consignmentResolutionPhase, {
    label: "Consignments",
    cadence: "daily",
    writes: ["impacts", "auctions", "log"],
  }),
  describePhase(purchaseResolutionPhase, {
    label: "Purchases",
    cadence: "daily",
    writes: ["impacts", "log"],
  }),
  describePhase(breedingResolutionPhase, {
    label: "Breeding",
    cadence: "daily",
    writes: ["impacts", "pregnancies", "log"],
  }),
  describePhase(trainingResolutionPhase, {
    label: "Training",
    cadence: "daily",
    writes: ["impacts", "horses", "npcAIManager", "log"],
  }),
  describePhase(claimingWithdrawalPhase, {
    label: "Claiming withdrawals",
    cadence: "daily",
    writes: ["impacts", "races", "claims"],
  }),
  describePhase(managementResolutionPhase, {
    label: "Management",
    cadence: "daily",
    writes: ["impacts", "log"],
  }),
  describePhase(npcClaimingPhase, {
    label: "NPC claiming",
    cadence: "daily",
    writes: ["claims", "log"],
  }),
  describePhase(raceResolutionPhase, {
    label: "Race resolution",
    cadence: "daily",
    writes: ["races", "horses", "impacts", "log", "npcStables", "cash"],
  }),
  describePhase(foalDevelopmentPhase, {
    label: "Foal development",
    cadence: "daily",
    writes: ["inbox", "impacts"],
  }),
  describePhase(difficultyPhase, {
    label: "Difficulty",
    cadence: "daily",
    writes: ["npcAIManager"],
  }),
  describePhase(stewardsPhase, {
    label: "Stewards",
    cadence: "daily",
    writes: ["races", "horses", "log", "stewardInquiries"],
  }),
  describePhase(claimResolutionPhase, {
    label: "Claim resolution",
    cadence: "daily",
    dependsOn: ["raceResolution"],
    writes: ["claims", "horses", "npcStables", "cash", "log"],
  }),
  describePhase(archivingPhase, {
    label: "Archiving",
    cadence: "daily",
    writes: ["archive", "races", "news"],
  }),
  describePhase(seasonStandingsPhase, {
    label: "Season standings",
    cadence: "daily",
    writes: ["inbox", "log"],
  }),
  describePhase(narrativePhase, {
    label: "Narrative",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    writes: ["npcAIManager", "log"],
  }),
  describePhase(solvencyPhase, {
    label: "Solvency",
    cadence: "daily",
    writes: ["npcStables", "impacts", "log", "runEnded"],
  }),

  // ── Finalization ─────────────────────────────────────────────────────────
  describePhase(impactApplicationPhase, {
    label: "Apply impacts",
    cadence: "daily",
    dependsOn: [
      "raceEntryResolution",
      "consignmentResolution",
      "purchaseResolution",
      "breedingResolution",
      "trainingResolution",
      "claimingWithdrawal",
      "managementResolution",
      "raceResolution",
      "solvency",
    ],
    writes: ["state"],
  }),
  describePhase(cashPressureHistoryPhase, {
    label: "Cash history",
    cadence: "daily",
    writes: ["cashPressureHistory"],
  }),
  describePhase(eventTriggersPhase, {
    label: "Event triggers",
    cadence: "daily",
    writes: ["eventStates", "inbox", "log"],
  }),
  describePhase(exchangeSettlementPhase, {
    label: "Exchange settlement",
    cadence: "daily",
    writes: ["exchange", "log"],
  }),
  describePhase(dailySnapshotPhase, {
    label: "Daily snapshot",
    cadence: "daily",
    writes: ["dailySnapshots", "syndicateValueSnapshots", "log"],
  }),
];

// Guard: every registered production phase must have exactly one descriptor.
const described = new Set(GAME_PHASE_DESCRIPTORS.map((d) => d.phase));
for (const p of GAME_PIPELINE_PHASES) {
  if (!described.has(p)) {
    throw new Error(`Phase '${p.name}' has no descriptor in descriptors.ts`);
  }
}

/**
 * The compiled production schedule. Building it validates the entire
 * registry — construction failure throws at module load, never silently.
 */
export const GAME_SCHEDULE = compileSchedule(GAME_PHASE_DESCRIPTORS);
