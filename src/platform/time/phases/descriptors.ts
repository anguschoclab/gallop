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

import { describePhase, compileSchedule, type PhaseDescriptor } from "@/platform/time/scheduler";
import { GAME_PIPELINE_PHASES } from "@/platform/time/phases";

import { intentCollectionPhase } from "@/platform/time/phases/intentCollection";
import { intentValidationPhase } from "@/platform/time/phases/intentValidation";
import { claimRegistrationPhase } from "@/platform/time/phases/claimRegistration";
import { privateSaleExpiryPhase } from "@/platform/time/phases/privateSaleExpiry";
import { privateSaleResolutionPhase } from "@/platform/time/phases/privateSaleResolution";
import { upkeepPhase } from "@/platform/time/phases/upkeep";
import { npcBankruptcyPhase } from "@/platform/time/phases/npcBankruptcy";
import { agingPhase } from "@/platform/time/phases/aging";
import { breedingSeasonPhase } from "@/platform/time/phases/breedingSeason";
import { industryMetricsPhase } from "@/platform/time/phases/industryMetricsPhase";
import { npcBreedingPhase } from "@/platform/time/phases/npcBreedingPhase";
import { energyPhase } from "@/platform/time/phases/energy";
import { marketPhase } from "@/platform/time/phases/market";
import { racesPhase } from "@/platform/time/phases/races";
import { beyerRecalibrationPhase } from "@/platform/time/phases/beyerRecalibration";
import { gateDrawPhase } from "@/platform/time/phases/gateDraw";
import { jockeyPhase } from "@/platform/time/phases/jockeyPhase";
import { pregnancyPhase } from "@/platform/time/phases/pregnancy";
import { npcCyclePhase } from "@/platform/time/phases/npcCycle";
import { stallionRetirementPhase } from "@/platform/time/phases/stallionRetirement";
import { pastureRetirementPhase } from "@/platform/time/phases/pastureRetirement";
import { hallOfFamePhase } from "@/platform/time/phases/hallOfFame";
import { horseDeathPhase } from "@/platform/time/phases/horseDeath";
import { nameReservationPhase } from "@/platform/time/phases/nameReservation";
import { auctionsPhase } from "@/platform/time/phases/auctions";
import { leaderboardPhase } from "@/platform/time/phases/leaderboardPhase";
import { awardsPhase } from "@/platform/time/phases/awards";
import { awardInvitationsPhase } from "@/platform/time/phases/awardInvitations";
import { schedulerPhase } from "@/platform/time/phases/schedulerPhase";
import { raceCancellationPhase } from "@/platform/time/phases/raceCancellation";
import { raceEntryResolutionPhase } from "@/platform/time/phases/raceEntryResolution";
import { consignmentResolutionPhase } from "@/platform/time/phases/consignmentResolution";
import { purchaseResolutionPhase } from "@/platform/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "@/platform/time/phases/breedingResolution";
import { trainingResolutionPhase } from "@/platform/time/phases/trainingResolution";
import { claimingWithdrawalPhase } from "@/platform/time/phases/claimingWithdrawal";
import { managementResolutionPhase } from "@/platform/time/phases/managementResolution";
import { raceResolutionPhase } from "@/platform/time/phases/raceResolution";
import { stewardsPhase } from "@/platform/time/phases/stewardsPhase";
import { claimResolutionPhase } from "@/platform/time/phases/claimResolution";
import { archivingPhase } from "@/platform/time/phases/archivingPhase";
import { seasonStandingsPhase } from "@/platform/time/phases/seasonStandingsPhase";
import { impactApplicationPhase } from "@/platform/time/phases/impactApplication";
import { weatherPhase } from "@/platform/time/phases/weatherPhase";
import { raceInvitationsPhase } from "@/platform/time/phases/raceInvitations";
import { foalDevelopmentPhase } from "@/platform/time/phases/foalDevelopmentPhase";
import { solvencyPhase } from "@/platform/time/phases/solvency";
import { worldAssessmentPhase } from "@/platform/time/phases/worldAssessmentPhase";
import { diplomacyPhase } from "@/platform/time/phases/diplomacyPhase";
import { npcCareerTrackerPhase } from "@/platform/time/phases/npcCareerTrackerPhase";
import { npcMilestoneAlertsPhase } from "@/platform/time/phases/npcMilestoneAlertsPhase";
import { narrativePhase } from "@/platform/time/phases/narrativePhase";
import { economyPhase } from "@/platform/time/phases/economyPhase";
import { difficultyPhase } from "@/platform/time/phases/difficultyPhase";
import { cashPressureHistoryPhase } from "@/platform/time/phases/cashPressureHistoryPhase";
import { exchangeSettlementPhase } from "@/platform/time/phases/exchangeSettlementPhase";
import { dailySnapshotPhase } from "@/platform/time/phases/dailySnapshotPhase";

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
    reads: [
      "npcStables",
      "npcAIManager",
      "horses",
      "cash",
      "pregnancies",
      "day",
      "races",
      "reputation",
      "npcFacilities",
      "breedingPrograms",
      "privateSaleOffers",
    ],
    writes: ["npcAIManager"],
  }),

  // ── Intent lifecycle ─────────────────────────────────────────────────────
  describePhase(intentCollectionPhase, {
    label: "Collect intents",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    provides: ["intents"],
    reads: [
      "pendingIntents",
      "npcAIManager",
      "pregnancies",
      "npcStables",
      "campaigns",
      "day",
      "npcFacilities",
      "syndicates",
      "auctions",
      "reputation",
      "breedingPrograms",
      "privateSaleOffers",
      "horses",
      "races",
    ],
    writes: ["pendingIntents", "intents", "npcAIManager"],
  }),
  describePhase(intentValidationPhase, {
    label: "Validate intents",
    cadence: "daily",
    dependsOn: ["intentCollection"],
    requires: ["intents"],
    writes: ["intents", "log"],
  }),
  describePhase(claimRegistrationPhase, {
    label: "Register claims",
    cadence: "daily",
    dependsOn: ["intentValidation"],
    requires: ["intents"],
    reads: ["claims"],
    writes: ["intents", "claims", "npcAIManager"],
  }),
  describePhase(privateSaleExpiryPhase, {
    label: "Private sale expiry",
    cadence: "daily",
    reads: ["privateSaleOffers"],
    writes: ["privateSaleOffers", "log"],
  }),

  // ── Economy ──────────────────────────────────────────────────────────────
  describePhase(upkeepPhase, {
    label: "Upkeep",
    cadence: "daily",
    reads: ["horses", "hiredStaff", "facilities", "npcAIManager", "npcStables", "expenses"],
    writes: ["cash", "expenses", "npcStables", "horses", "npcAIManager", "log"],
  }),
  describePhase(npcBankruptcyPhase, {
    label: "NPC bankruptcy",
    cadence: "daily",
    reads: [
      "runEnded",
      "npcStables",
      "syndicates",
      "npcAIManager",
      "horses",
      "auctions",
      "worldSize",
    ],
    writes: ["npcStables", "horses", "auctions", "npcAIManager", "syndicates", "log"],
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
    reads: ["industryEarningsUpdatedDay", "horses"],
    writes: ["industryEarningsUpdatedDay", "industryMeanEarnings", "log"],
  }),
  describePhase(npcBreedingPhase, {
    label: "NPC breeding",
    cadence: "daily",
    reads: ["pregnancies", "npcStables", "day", "npcAIManager"],
    writes: ["pregnancies", "npcAIManager"],
  }),
  describePhase(energyPhase, {
    label: "Energy",
    cadence: "daily",
    reads: ["hiredStaff", "npcStables", "horses", "facilities"],
    writes: ["horses"],
  }),
  describePhase(privateSaleResolutionPhase, {
    label: "Private sale resolution",
    cadence: "daily",
    reads: ["privateSaleOffers"],
    writes: ["privateSaleOffers", "horses", "cash", "log"],
  }),
  describePhase(economyPhase, {
    label: "Economy",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    provides: ["economicTrend"],
    reads: ["npcStables", "npcAIManager", "industryMeanEarnings"],
    writes: ["npcAIManager"],
  }),
  describePhase(marketPhase, {
    label: "Market",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    reads: ["market", "npcStables", "npcAIManager", "staffPool"],
    writes: ["market", "horses", "npcStables", "npcAIManager", "staffPool", "log"],
  }),
  describePhase(weatherPhase, {
    label: "Weather",
    cadence: "daily",
    reads: ["weather", "races", "log"],
    writes: ["weather", "races", "log"],
  }),
  describePhase(raceInvitationsPhase, {
    label: "Race invitations",
    cadence: "daily",
    reads: ["inbox", "pregnancies", "races", "reputation", "horses"],
    writes: ["races", "inbox"],
  }),
  describePhase(racesPhase, {
    label: "Race schedule",
    cadence: "daily",
    reads: ["races", "campaigns"],
    writes: ["races", "log"],
  }),
  describePhase(beyerRecalibrationPhase, {
    label: "Beyer recalibration",
    cadence: "daily",
    reads: ["calibratedPars", "lastCalibrationDay", "paceSamples"],
    writes: ["calibratedPars", "paceSamples", "lastCalibrationDay"],
  }),
  describePhase(gateDrawPhase, {
    label: "Gate draw",
    cadence: "daily",
    reads: ["races"],
    writes: ["races", "log"],
  }),
  describePhase(jockeyPhase, {
    label: "Jockeys",
    cadence: "daily",
    reads: ["jockeys", "npcStables", "npcAIManager", "worldSize"],
    writes: ["jockeys", "npcStables", "npcAIManager", "log"],
  }),
  describePhase(pregnancyPhase, {
    label: "Pregnancy",
    cadence: "daily",
    reads: [
      "usedHorseNames",
      "horses",
      "pregnancies",
      "npcStables",
      "userSettings",
      "npcAIManager",
    ],
    writes: ["pregnancies", "horses", "npcAIManager", "usedHorseNames", "log"],
  }),
  describePhase(npcCyclePhase, {
    label: "NPC cycle",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    reads: ["npcStables", "pregnancies", "npcAIManager", "horses", "jockeys", "races"],
    writes: ["npcStables", "horses", "races", "npcAIManager", "log"],
  }),
  describePhase(diplomacyPhase, {
    label: "Diplomacy",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    reads: ["npcStables", "npcAIManager"],
    writes: ["npcAIManager", "log"],
  }),
  describePhase(npcCareerTrackerPhase, {
    label: "NPC careers",
    cadence: "daily",
    reads: ["npcStables", "horses"],
    writes: ["horses", "npcStables", "npcAIManager"],
  }),
  describePhase(npcMilestoneAlertsPhase, {
    label: "NPC milestones",
    cadence: "daily",
    reads: ["userSettings", "horses"],
    writes: ["inbox", "horses", "npcAIManager"],
  }),
  describePhase(stallionRetirementPhase, {
    label: "Stallion retirement",
    cadence: "daily",
    reads: ["horses"],
    writes: ["horses", "npcStables", "log"],
  }),
  describePhase(pastureRetirementPhase, {
    label: "Pasture retirement",
    cadence: "daily",
    reads: ["horses"],
    writes: ["horses", "log"],
  }),
  describePhase(hallOfFamePhase, {
    label: "Hall of Fame",
    cadence: "daily",
    reads: ["hallOfFame", "awards", "horses"],
    writes: ["hallOfFame", "horses", "log"],
  }),
  describePhase(horseDeathPhase, {
    label: "Horse death",
    cadence: "daily",
    reads: ["horses"],
    writes: ["horses", "log"],
  }),
  describePhase(nameReservationPhase, {
    label: "Name reservations",
    cadence: "daily",
    reads: ["reservedHorseNames"],
    writes: ["reservedHorseNames"],
  }),
  describePhase(auctionsPhase, {
    label: "Auctions",
    cadence: "daily",
    dependsOn: ["economy"],
    requires: ["economicTrend"],
    reads: ["auctions"],
    writes: ["auctions", "horses", "npcStables", "cash", "log", "impacts"],
  }),
  describePhase(leaderboardPhase, {
    label: "Leaderboards",
    cadence: "weekly",
    lastRunField: "leaderboardsUpdatedDay",
    reads: [
      "leaderboardsUpdatedDay",
      "industryMeanEarnings",
      "horses",
      "sireTrendHistory",
      "founders",
      "lastFounderUpdateDay",
    ],
    writes: [
      "horseLeaderboards",
      "sireLeaderboards",
      "damsireLeaderboard",
      "blueHenLeaderboard",
      "sireTrendHistory",
      "leaderboardsUpdatedDay",
      "lastFounderUpdateDay",
      "founders",
      "log",
    ],
  }),
  describePhase(awardInvitationsPhase, {
    label: "Award invitations",
    cadence: "daily",
    reads: ["awardCeremonyInvitations", "horses"],
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
    reads: ["campaigns", "stableGoals", "userSettings"],
    writes: ["pendingIntents", "campaigns", "strategyJournal", "log"],
  }),
  describePhase(raceCancellationPhase, {
    label: "Race cancellation",
    cadence: "daily",
    reads: ["races", "campaigns"],
    writes: ["races", "log"],
  }),

  // ── Intent resolution (convert intents to impacts) ───────────────────────
  describePhase(raceEntryResolutionPhase, {
    label: "Race entries",
    cadence: "daily",
    reads: ["races", "transports", "jockeys", "npcAIManager", "transactions"],
    writes: ["races", "impacts", "transactions", "transports", "log", "npcAIManager"],
  }),
  describePhase(consignmentResolutionPhase, {
    label: "Consignments",
    cadence: "daily",
    reads: ["auctions"],
    writes: ["impacts", "auctions", "log"],
  }),
  describePhase(purchaseResolutionPhase, {
    label: "Purchases",
    cadence: "daily",
    reads: ["market"],
    writes: ["impacts", "market", "log"],
  }),
  describePhase(breedingResolutionPhase, {
    label: "Breeding",
    cadence: "daily",
    reads: ["pregnancies"],
    writes: ["impacts", "pregnancies", "log"],
  }),
  describePhase(trainingResolutionPhase, {
    label: "Training",
    cadence: "daily",
    reads: [
      "npcAIManager",
      "npcStables",
      "outposts",
      "facilities",
      "hiredStaff",
      "trainingUsed",
      "expenses",
      "transactions",
    ],
    writes: [
      "impacts",
      "horses",
      "npcAIManager",
      "transactions",
      "expenses",
      "trainingUsed",
      "log",
    ],
  }),
  describePhase(claimingWithdrawalPhase, {
    label: "Claiming withdrawals",
    cadence: "daily",
    reads: ["races"],
    writes: ["impacts", "races", "claims"],
  }),
  describePhase(managementResolutionPhase, {
    label: "Management",
    cadence: "daily",
    reads: ["horses"],
    writes: ["impacts", "log"],
  }),
  describePhase(raceResolutionPhase, {
    label: "Race resolution",
    cadence: "daily",
    reads: [
      "horses",
      "races",
      "hallOfFame",
      "npcAIManager",
      "hiredStaff",
      "calibratedPars",
      "syndicates",
      "narrativeArcs",
      "trackRecords",
      "weather",
      "playerProfile",
      "trackLedger",
    ],
    writes: [
      "races",
      "horses",
      "impacts",
      "log",
      "npcStables",
      "cash",
      "npcAIManager",
      "trackLedger",
    ],
  }),
  describePhase(foalDevelopmentPhase, {
    label: "Foal development",
    cadence: "daily",
    reads: ["horses"],
    writes: ["inbox", "impacts"],
  }),
  describePhase(difficultyPhase, {
    label: "Difficulty",
    cadence: "daily",
    reads: ["npcAIManager", "races"],
    writes: ["npcAIManager"],
  }),
  describePhase(stewardsPhase, {
    label: "Stewards",
    cadence: "daily",
    reads: ["races", "horses"],
    writes: ["races", "horses", "log", "stewardInquiries"],
  }),
  describePhase(claimResolutionPhase, {
    label: "Claim resolution",
    cadence: "daily",
    dependsOn: ["raceResolution"],
    reads: ["claims"],
    writes: ["claims", "privateSaleOffers", "npcAIManager", "impacts", "log"],
  }),
  describePhase(archivingPhase, {
    label: "Archiving",
    cadence: "daily",
    reads: ["archive", "horses", "races", "pregnancies", "news"],
    writes: ["archive", "races", "news", "horses", "pregnancies"],
  }),
  describePhase(seasonStandingsPhase, {
    label: "Season standings",
    cadence: "daily",
    reads: ["day", "horses", "playerProfile", "npcStables", "npcAIManager", "lastTopTenRank"],
    writes: ["inbox", "log", "lastTopTenRank"],
  }),
  describePhase(narrativePhase, {
    label: "Narrative",
    cadence: "daily",
    dependsOn: ["worldAssessment"],
    requires: ["worldAssessment"],
    reads: ["npcStables", "npcAIManager", "races"],
    writes: ["npcAIManager", "log"],
  }),
  describePhase(solvencyPhase, {
    label: "Solvency",
    cadence: "daily",
    reads: [
      "runEnded",
      "cash",
      "consecutiveDaysInDebt",
      "solvencyTier",
      "userSettings",
      "solvencyAuditLog",
    ],
    writes: [
      "npcStables",
      "impacts",
      "log",
      "runEnded",
      "consecutiveDaysInDebt",
      "solvencyTier",
      "solvencyAuditLog",
    ],
  }),

  // ── Finalization ─────────────────────────────────────────────────────────
  describePhase(impactApplicationPhase, {
    label: "Apply impacts",
    cadence: "daily",
    reads: [
      "horses",
      "npcStables",
      "campaigns",
      "races",
      "jockeys",
      "auctions",
      "facilities",
      "hiredStaff",
      "news",
      "transactions",
      "inbox",
      "paceSamples",
      "log",
      "reservedHorseNames",
      "usedHorseNames",
    ],
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
    reads: ["npcStables", "cashPressureHistory"],
    writes: ["cashPressureHistory"],
  }),
  describePhase(exchangeSettlementPhase, {
    label: "Exchange settlement",
    cadence: "daily",
    reads: ["exchange", "horses", "npcStables", "reputation", "playerProfile", "cash"],
    writes: ["exchange", "horses", "npcStables", "log"],
  }),
  describePhase(dailySnapshotPhase, {
    label: "Daily snapshot",
    cadence: "daily",
    reads: [
      "horses",
      "horseDailyProgress",
      "cash",
      "syndicates",
      "strategyJournal",
      "races",
      "rankingsHistory",
      "stableRankingsHistory",
      "npcStables",
      "reputation",
      "playerProfile",
      "syndicateValueSnapshots",
    ],
    writes: [
      "dailySnapshots",
      "syndicateValueSnapshots",
      "horseDailyProgress",
      "rankingsHistory",
      "stableRankingsHistory",
      "log",
    ],
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
