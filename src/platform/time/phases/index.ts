/**
 * phases/index.ts - Pipeline phases
 *
 * This file exports all game pipeline phases in their correct order.
 * Consolidating this here ensures synchronization between the Web Worker
 * and the main thread fallback.
 *
 * Dependencies: @/platform/time/phases/intentCollection, ./intentValidation, ./privateSaleExpiry, ./upkeep, ./aging, ./breedingSeason, ./industryMetricsPhase, ./npcBreedingPhase, ./energy, ./market, ./races, ./beyerRecalibration, ./jockeyPhase, ./pregnancy, ./npcCycle, ./stallionRetirement, ./pastureRetirement, ./hallOfFame, ./horseDeath, ./auctions, ./leaderboardPhase, ./awards, ./schedulerPhase, ./stateUpdate, ./raceEntryResolution, ./consignmentResolution, ./purchaseResolution, ./breedingResolution, ./trainingResolution, ./claimingWithdrawal, ./managementResolution, ./npcClaiming, ./raceResolution, ./claimResolution, ./archivingPhase, ./impactApplication
 * Related files: ../pipeline.ts (uses phases), ../advance.ts (uses phases)
 */

import { intentCollectionPhase } from "./intentCollection";
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
 * Shared array of all game pipeline phases in their correct order.
 * Consolidating this here ensures synchronization between the Web Worker
 * and the main thread fallback.
 */
export const GAME_PIPELINE_PHASES = [
  // World assessment (order 2, before everything else)
  worldAssessmentPhase,
  // Intent/impact resolver phases
  intentCollectionPhase,
  intentValidationPhase,
  claimRegistrationPhase,
  // D2 — Private sale offer expiry (very early, order 3)
  privateSaleExpiryPhase,
  // Private sale NPC decision (order 34, before purchase resolution)
  privateSaleResolutionPhase,
  // Existing phases
  upkeepPhase,
  // NPC bankruptcy detection (order 21, after upkeep, before breeding resolution)
  npcBankruptcyPhase,
  agingPhase,
  breedingSeasonPhase,
  industryMetricsPhase,
  npcBreedingPhase,
  energyPhase,
  // Economy AI (order 48, before market at 50)
  economyPhase,
  marketPhase,
  // Dynamic weather sim — runs after market (50), before races (60)
  weatherPhase,
  raceInvitationsPhase,
  racesPhase,
  beyerRecalibrationPhase,
  gateDrawPhase,
  jockeyPhase,
  pregnancyPhase,
  npcCyclePhase,
  // Diplomacy AI (order 81, after NPC cycle)
  diplomacyPhase,
  // NPC off-screen career progression (order 82, after diplomacy)
  npcCareerTrackerPhase,
  // Rival-horse milestone alerts (order 83, after career tracker)
  npcMilestoneAlertsPhase,
  stallionRetirementPhase,
  pastureRetirementPhase,
  hallOfFamePhase,
  horseDeathPhase,
  nameReservationPhase,
  auctionsPhase,
  leaderboardPhase,
  awardInvitationsPhase,
  awardsPhase,
  schedulerPhase,
  // Race cancellation (order 88, after scheduler, before auctions)
  raceCancellationPhase,
  // Resolution phases (convert intents to impacts)
  raceEntryResolutionPhase,
  consignmentResolutionPhase,
  purchaseResolutionPhase,
  breedingResolutionPhase,
  trainingResolutionPhase,
  claimingWithdrawalPhase,
  managementResolutionPhase,
  raceResolutionPhase,
  // Foal development milestone alerts (order 71) — emits inbox messages only.
  foalDevelopmentPhase,
  // Difficulty modulation (order 74, after stewards, before claim resolution)
  difficultyPhase,
  // Stewards inquiry phase (after race resolution, before claim resolution)
  stewardsPhase,
  // Claim resolution (after raceResolution)
  claimResolutionPhase,
  // Archiving phase (before impact application)
  archivingPhase,
  // Season standings notification (order 195, before impact application)
  seasonStandingsPhase,
  // Narrative AI (order 196, after season standings)
  narrativePhase,
  // Solvency escalation (order 199 — after upkeep/purses settled, before impacts applied)
  solvencyPhase,
  // Impact application phase (final)
  impactApplicationPhase,
  // Cash-pressure history snapshot (order 201 — after impacts applied, captures end-of-day cash)
  cashPressureHistoryPhase,
  // Exchange refresh + NPC settlement (order 203 — runs on end-of-day state every simulated day)
  exchangeSettlementPhase,
  // Daily player snapshot (order 204 — last: captures post-settlement cash/ownership, fills journal outcomes)
  dailySnapshotPhase,
].sort((a, b) => a.order - b.order);
