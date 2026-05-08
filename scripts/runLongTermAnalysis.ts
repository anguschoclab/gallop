
import { createInitialState } from "../src/game/store/initialization";
import { executePipeline, type PipelineContext } from "../src/core/time/pipeline";
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

interface YearMetrics {
  year: number;
  horseCount: number;
  foalsBorn: number;
  deaths: number;
  avgPotential: number;
  maxPotential: number;
  eliteCount: number;
  avgNpcCash: number;
  minNpcCash: number;
  maxNpcCash: number;
  totalAuctionLots: number;
  avgAuctionPrice: number;
}

async function runHighPerfAnalysis(totalYears: number = 10) {
  console.log(`=== Starting High-Performance Long-Term Analysis (${totalYears} years) ===\n`);

  let state: GameState = createInitialState();
  const history: YearMetrics[] = [];

  for (let year = 1; year <= totalYears; year++) {
    let foalsThisYear = 0;
    let deathsThisYear = 0;
    let auctionLotsThisYear = 0;
    let auctionRevenueThisYear = 0;

    console.log(`\n--- Year ${year} (Day ${state.day}) ---`);
    const startOfyearHorseCount = state.horses.length;

    for (let day = 1; day <= 365; day++) {
      const previousDay = state.day;
      const newDay = previousDay + 1;
      
      const horseIdsBefore = new Set(state.horses.map(h => h.id));
      const horseStatusBefore = new Map(state.horses.map(h => [h.id, h.lifecycleStatus]));

      const context: PipelineContext = {
        previousDay,
        newDay,
        state,
        logs: [],
        dailyRng: createRng(hashStr("daily_" + newDay)),
        intents: (state as any).pendingIntents || [],
        impacts: [],
        impactLog: [],
      };

      const resultContext = executePipeline(PHASES, context);
      state = resultContext.state;

      // Track foals (new horses)
      for (const horse of state.horses) {
        if (!horseIdsBefore.has(horse.id) && horse.age === 0) {
          foalsThisYear++;
        }
      }


      // Track deaths
      for (const horse of state.horses) {
        if (horse.lifecycleStatus === "deceased" && horseStatusBefore.get(horse.id) !== "deceased") {
          deathsThisYear++;
        }
      }

      // Track auctions
      const resolvedToday = state.auctions.filter(a => a.resolved && a.day === newDay);
      for (const sale of resolvedToday) {
        for (const lot of sale.lots) {
          if (lot.soldPrice && lot.soldPrice > 0) {
            auctionLotsThisYear++;
            auctionRevenueThisYear += lot.soldPrice;
          }
        }
      }

      if (day % 30 === 0) {
        process.stdout.write(".");
      }
    }

    // Year-end metrics
    const activeHorses = state.horses.filter(h => h.lifecycleStatus === "active");
    const npcs = state.npcStables;
    const potSum = activeHorses.reduce((sum, h) => sum + h.potential, 0);
    const elite = activeHorses.filter(h => h.potential >= 90).length;
    const maxPot = Math.max(...activeHorses.map(h => h.potential), 0);
    const npcCash = npcs.map(n => n.cash);
    const avgCash = npcCash.reduce((sum, c) => sum + c, 0) / (npcs.length || 1);

    const metrics: YearMetrics = {
      year,
      horseCount: activeHorses.length,
      foalsBorn: foalsThisYear,
      deaths: deathsThisYear,
      avgPotential: potSum / (activeHorses.length || 1),
      maxPotential: maxPot,
      eliteCount: elite,
      avgNpcCash: avgCash,
      minNpcCash: Math.min(...npcCash, 0),
      maxNpcCash: Math.max(...npcCash, 0),
      totalAuctionLots: auctionLotsThisYear,
      avgAuctionPrice: auctionLotsThisYear > 0 ? auctionRevenueThisYear / auctionLotsThisYear : 0,
    };

    history.push(metrics);
    console.log(`\nYear ${year} Summary:`);
    console.log(`  Population: ${metrics.horseCount} active, ${metrics.foalsBorn} foals, ${metrics.deaths} deaths`);
    console.log(`  Breeding: Avg Pot ${metrics.avgPotential.toFixed(1)}, Max Pot ${metrics.maxPotential.toFixed(1)}, Elites ${metrics.eliteCount}`);
    console.log(`  Economy: Avg NPC Cash $${Math.floor(metrics.avgNpcCash)}, Min $${Math.floor(metrics.minNpcCash)}`);
    console.log(`  Auctions: Sold ${metrics.totalAuctionLots} lots, Avg Price $${Math.floor(metrics.avgAuctionPrice)}`);
  }

  console.log("\n=== Final Long-Term Analysis Report ===\n");
  console.table(history);
}

runHighPerfAnalysis(10).catch(console.error);
