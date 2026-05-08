import { createInitialState } from "../src/game/store/initialization";
import { executePipeline } from "../src/core/time/pipeline";
import { intentCollectionPhase } from "../src/core/time/phases/intentCollection";
import { intentValidationPhase } from "../src/core/time/phases/intentValidation";
import { upkeepPhase } from "../src/core/time/phases/upkeep";
import { agingPhase } from "../src/core/time/phases/aging";
import { breedingSeasonPhase } from "../src/core/time/phases/breedingSeason";
import { industryMetricsPhase } from "../src/core/time/phases/industryMetricsPhase";
import { npcBreedingPhase } from "../src/core/time/phases/npcBreedingPhase";
import { energyPhase } from "../src/core/time/phases/energy";
import { marketPhase } from "../src/core/time/phases/market";
import { racesPhase } from "../src/core/time/phases/races";
import { beyerRecalibrationPhase } from "../src/core/time/phases/beyerRecalibration";
import { jockeyPhase } from "../src/core/time/phases/jockeyPhase";
import { pregnancyPhase } from "../src/core/time/phases/pregnancy";
import { npcCyclePhase } from "../src/core/time/phases/npcCycle";
import { stallionRetirementPhase } from "../src/core/time/phases/stallionRetirement";
import { pastureRetirementPhase } from "../src/core/time/phases/pastureRetirement";
import { hallOfFamePhase } from "../src/core/time/phases/hallOfFame";
import { horseDeathPhase } from "../src/core/time/phases/horseDeath";
import { auctionsPhase } from "../src/core/time/phases/auctions";
import { leaderboardPhase } from "../src/core/time/phases/leaderboardPhase";
import { awardsPhase } from "../src/core/time/phases/awards";
import { schedulerPhase } from "../src/core/time/phases/schedulerPhase";
import { stateUpdatePhase } from "../src/core/time/phases/stateUpdate";
import { raceEntryResolutionPhase } from "../src/core/time/phases/raceEntryResolution";
import { consignmentResolutionPhase } from "../src/core/time/phases/consignmentResolution";
import { purchaseResolutionPhase } from "../src/core/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "../src/core/time/phases/breedingResolution";
import { trainingResolutionPhase } from "../src/core/time/phases/trainingResolution";
import { claimingWithdrawalPhase } from "../src/core/time/phases/claimingWithdrawal";
import { raceResolutionPhase } from "../src/core/time/phases/raceResolution";
import { impactApplicationPhase } from "../src/core/time/phases/impactApplication";
import { privateSaleExpiryPhase } from "../src/core/time/phases/privateSaleExpiry";
import { npcClaimingPhase } from "../src/core/time/phases/npcClaiming";
import { claimResolutionPhase } from "../src/core/time/phases/claimResolution";
import { managementResolutionPhase } from "../src/core/time/phases/managementResolution";
import { createRng, hashStr } from "../src/game/rng";
import type { GameState } from "../src/game/types";
import { produce } from "immer";

// Pipeline phases in order
const PHASES = [
  intentCollectionPhase,
  intentValidationPhase,
  privateSaleExpiryPhase,
  upkeepPhase,
  agingPhase,
  breedingSeasonPhase,
  industryMetricsPhase,
  npcBreedingPhase,
  energyPhase,
  marketPhase,
  racesPhase,
  beyerRecalibrationPhase,
  jockeyPhase,
  pregnancyPhase,
  npcCyclePhase,
  stallionRetirementPhase,
  pastureRetirementPhase,
  hallOfFamePhase,
  horseDeathPhase,
  auctionsPhase,
  leaderboardPhase,
  awardsPhase,
  schedulerPhase,
  stateUpdatePhase,
  raceEntryResolutionPhase,
  consignmentResolutionPhase,
  purchaseResolutionPhase,
  breedingResolutionPhase,
  trainingResolutionPhase,
  claimingWithdrawalPhase,
  managementResolutionPhase,
  npcClaimingPhase,
  raceResolutionPhase,
  claimResolutionPhase,
  impactApplicationPhase,
];

/**
 * High-Performance Analysis Entry Point
 */
async function runHighPerfAnalysis(years: number = 10) {
  console.log(`=== Starting High-Performance Long-Term Analysis (${years} years) ===`);

  let state = createInitialState();
  const days = years * 365;

  // Trackers
  const populationHistory: number[] = [];
  const economicHistory: number[] = [];
  const g1Winners: Set<string> = new Set();
  const startDay = state.day;

  for (let day = startDay; day < startDay + days; day++) {
    const year = Math.floor((day - 1) / 365) + 1;
    console.log(`Day ${day} starting (Year ${year})...`);
    const dayStart = Date.now();

    // Prune historical collections periodically to avoid memory growth and spread-copy overhead
    if (day % 30 === 0) {
      if (state.transactions && state.transactions.length > 1000) {
        state.transactions = state.transactions.slice(-1000);
      }
      if (state.news && state.news.length > 1000) {
        state.news = state.news.slice(-1000);
      }
      if (state.log && state.log.length > 1000) {
        state.log = state.log.slice(-1000);
      }
      if ((state as any).replays && (state as any).replays.length > 1000) {
        (state as any).replays = (state as any).replays.slice(-1000);
      }
      if ((state as any).expenses && (state as any).expenses.length > 1000) {
        (state as any).expenses = (state as any).expenses.slice(-1000);
      }
      // Prune resolved races older than 30 days
      if (state.races && state.races.length > 500) {
        state.races = state.races.filter(r => !r.resolved || r.day > day - 30);
      }
    }


    const context = {
      state,
      newDay: day,
      intents: [],
      impacts: [],
      logs: [],
      impactLog: [],
      dailyRng: createRng(hashStr(`day_${day}`)),
      previousDay: day - 1,
    };

    try {
      const resultContext = executePipeline(PHASES, context);
      state = resultContext.state;
      
      // Track population
      populationHistory.push(state.horses.filter(h => h.lifecycleStatus !== 'deceased').length);
      economicHistory.push(state.cash);
      
      // Track G1 winners from recently resolved races
      for (const race of state.races) {
        if (race.day === day && race.resolved && race.graded?.grade === 'G1' && race.result) {
          const winnerId = race.result.find(r => r.position === 1)?.horseId;
          if (winnerId) g1Winners.add(winnerId);
        }
      }

      if (day % 30 === 0) {
        process.stdout.write(".");
      }
      const dayDuration = Date.now() - dayStart;
      console.log(`Day ${day} finished in ${dayDuration}ms (Horses: ${state.horses.length}, Races: ${state.races.length})`);

      // Cleanup state to prevent memory bloat during 10-year run
      state = produce(state, draft => {
        // Prune resolved races older than 7 days
        draft.races = draft.races.filter(r => r.day >= day - 7 || !r.resolved);
        
        // Remove old logs
        draft.log = draft.log.slice(-100);
        
        // Trim Hall of Fame to most recent 100 entries to save space
        draft.hallOfFame = draft.hallOfFame.slice(-100);
      });

    } catch (e) {
      console.error(`\nFAILED on Day ${day}:`, e);
      break;
    }
  }

  console.log("\n\n=== Analysis Complete ===");
  console.log(`Final Year: ${Math.floor((state.day - 1) / 365) + 1}`);
  console.log(`Total Population: ${state.horses.filter(h => h.lifecycleStatus !== 'deceased').length}`);
  console.log(`Unique G1 Winners Produced: ${g1Winners.size}`);
  console.log(`Total NPC Cash in System: ${Math.round(state.cash)}`);
  
  // Export summary
  const summary = {
    finalDay: state.day,
    finalPopulation: state.horses.filter(h => h.lifecycleStatus !== 'deceased').length,
    g1WinnersCount: g1Winners.size,
    economicTrend: economicHistory.filter((_, i) => i % 30 === 0),
    populationTrend: populationHistory.filter((_, i) => i % 30 === 0),
  };
  
  console.log("\nPopulation Trend (Monthly):", summary.populationTrend.join(", "));
  console.log("Economic Trend (Monthly):", summary.economicTrend.map(c => Math.round(c / 1000) + "k").join(", "));
}

runHighPerfAnalysis(10).catch(console.error);
