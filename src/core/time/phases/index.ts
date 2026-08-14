/**
 * phases/index.ts - Pipeline phases
 *
 * This file exports all game pipeline phases in their correct order.
 * Consolidating this here ensures synchronization between the Web Worker
 * and the main thread fallback.
 *
 * Dependencies: ./intentCollection, ./intentValidation, ./privateSaleExpiry, ./upkeep, ./aging, ./breedingSeason, ./industryMetricsPhase, ./npcBreedingPhase, ./energy, ./market, ./races, ./beyerRecalibration, ./jockeyPhase, ./pregnancy, ./npcCycle, ./stallionRetirement, ./pastureRetirement, ./hallOfFame, ./horseDeath, ./auctions, ./leaderboardPhase, ./awards, ./schedulerPhase, ./stateUpdate, ./raceEntryResolution, ./consignmentResolution, ./purchaseResolution, ./breedingResolution, ./trainingResolution, ./claimingWithdrawal, ./managementResolution, ./npcClaiming, ./raceResolution, ./claimResolution, ./archivingPhase, ./impactApplication
 * Related files: ../pipeline.ts (uses phases), ../advance.ts (uses phases)
 */

import { intentCollectionPhase } from "./intentCollection";
import { intentValidationPhase } from "./intentValidation";
import { privateSaleExpiryPhase } from "./privateSaleExpiry";
import { privateSaleResolutionPhase } from "./privateSaleResolution";
import { upkeepPhase } from "./upkeep";
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
import { narrativePhase } from "./narrativePhase";
import { economyPhase } from "./economyPhase";

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
  // D2 — Private sale offer expiry (very early, order 3)
  privateSaleExpiryPhase,
  // Private sale NPC decision (order 34, before purchase resolution)
  privateSaleResolutionPhase,
  // Existing phases
  upkeepPhase,
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
  // NPC claim filing (before raceResolution)
  npcClaimingPhase,
  raceResolutionPhase,
  // Foal development milestone alerts (order 71) — emits inbox messages only.
  foalDevelopmentPhase,
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
].sort((a, b) => a.order - b.order);
