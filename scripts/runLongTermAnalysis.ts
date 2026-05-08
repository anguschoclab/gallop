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
 * Calculate Gini coefficient for cash concentration
 */
function calculateGini(cashValues: number[]): number {
  if (cashValues.length === 0) return 0;
  const sorted = [...cashValues].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return giniSum / (n * sum);
}

/**
 * Calculate percentiles
 */
function calculatePercentiles(values: number[]): { p10: number; p25: number; p50: number; p75: number; p90: number } {
  if (values.length === 0) return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, Math.min(index, n - 1))];
  };
  return {
    p10: getPercentile(10),
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
  };
}

/**
 * High-Performance Analysis Entry Point
 */
async function runHighPerfAnalysis(years: number = 30) {
  console.log(`=== Starting High-Performance Long-Term Analysis (${years} years) ===`);

  let state = createInitialState();
  const days = years * 365;

  // Trackers
  const populationHistory: number[] = [];
  const economicHistory: number[] = [];
  const g1Winners: Set<string> = new Set();
  const npcCashHistory: any[] = [];
  const bankruptcyHistory: number[] = [];
  const auctionMetrics: any[] = [];
  const breedingMetrics: any[] = [];
  const systemHealthMetrics: any[] = [];
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
        state.races = state.races.filter((r: any) => !r.resolved || r.day > day - 30);
      }
      // Prune dead/retired horses with no wins to reduce array accumulation
      if (state.horses.length > 5000) {
        const horsesToPrune = state.horses.filter((h: any) =>
          (h.lifecycleStatus === 'deceased' || h.lifecycleStatus === 'retired') &&
          h.careerWins === 0
        );
        if (horsesToPrune.length > 0) {
          state.horses = state.horses.filter((h: any) => !horsesToPrune.some((p: any) => p.id === h.id));
        }
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
      populationHistory.push(state.horses.filter((h: any) => h.lifecycleStatus !== 'deceased').length);
      economicHistory.push(state.cash);

      // Track NPC cash distribution and bankruptcy
      const npcCashValues = state.npcStables.map((s: any) => s.cash);
      const bankruptCount = npcCashValues.filter((c: number) => c < 0).length;
      const percentiles = calculatePercentiles(npcCashValues);
      const gini = calculateGini(npcCashValues);

      if (day % 30 === 0) {
        npcCashHistory.push({
          day,
          year,
          ...percentiles,
          gini,
          bankruptCount,
          totalNPCs: state.npcStables.length,
        });
        bankruptcyHistory.push(bankruptCount);
      }

      // Track auction metrics
      if (day % 30 === 0 && state.auctions) {
        const resolvedAuctions = state.auctions.filter((a: any) => a.resolved && a.day >= day - 30);
        if (resolvedAuctions.length > 0) {
          const totalLots = resolvedAuctions.reduce((sum: number, a: any) => sum + a.lots.length, 0);
          const soldLots = resolvedAuctions.reduce((sum: number, a: any) => sum + a.lots.filter((l: any) => !l.passed).length, 0);
          const avgPrice = resolvedAuctions.reduce((sum: number, a: any) => {
            return sum + a.lots.filter((l: any) => l.hammerPrice).reduce((s: number, l: any) => s + l.hammerPrice!, 0);
          }, 0) / (soldLots || 1);

          auctionMetrics.push({
            day,
            year,
            auctionsResolved: resolvedAuctions.length,
            totalLots,
            soldLots,
            sellThroughRate: totalLots > 0 ? soldLots / totalLots : 0,
            avgPrice,
          });
        }
      }

      // Track breeding metrics
      if (day % 30 === 0) {
        const foalsBornThisPeriod = state.horses.filter((h: any) => h.createdAtDay && h.createdAtDay >= day - 30).length;
        const activeStallions = state.horses.filter((h: any) => h.gender === 'horse' && h.stud?.atStud).length;
        const totalBookings = state.horses.reduce((sum: number, h: any) => sum + (h.stud?.seasonBookings || 0), 0);
        const eligibleMares = state.horses.filter((h: any) => h.gender === 'mare' && h.age >= 3 && h.age <= 15).length;
        const activePregnancies = state.pregnancies?.filter((p: any) => !p.resolved).length || 0;

        breedingMetrics.push({
          day,
          year,
          foalsBorn: foalsBornThisPeriod,
          activeStallions,
          stallionUtilization: activeStallions > 0 ? totalBookings / activeStallions : 0,
          eligibleMares,
          activePregnancies,
          mareUtilization: eligibleMares > 0 ? activePregnancies / eligibleMares : 0,
        });
      }

      // Track system health
      if (day % 30 === 0) {
        systemHealthMetrics.push({
          day,
          year,
          horseCount: state.horses.length,
          raceCount: state.races.length,
          pregnancyCount: state.pregnancies?.length || 0,
          transactionCount: state.transactions?.length || 0,
          expenseCount: state.expenses?.length || 0,
          logCount: state.log?.length || 0,
          newsCount: state.news?.length || 0,
        });
      }

      // Alert system for critical issues
      if (day % 365 === 0 && day > 365) {
        const prevPopulation = populationHistory[populationHistory.length - 365];
        const currentPopulation = populationHistory[populationHistory.length - 1];
        const growthRate = prevPopulation > 0 ? ((currentPopulation - prevPopulation) / prevPopulation) * 100 : 0;

        const prevBankruptCount = bankruptcyHistory[Math.max(0, bankruptcyHistory.length - 12)] || 0;
        const currentBankruptCount = bankruptcyHistory[bankruptcyHistory.length - 1];
        const bankruptcyRate = state.npcStables.length > 0 ? (currentBankruptCount / state.npcStables.length) * 100 : 0;

        if (growthRate > 10) {
          console.log(`⚠️ ALERT: Population growth rate ${growthRate.toFixed(1)}% exceeds 10%/year threshold`);
        }
        if (bankruptcyRate > 5) {
          console.log(`⚠️ ALERT: Bankruptcy rate ${bankruptcyRate.toFixed(1)}% exceeds 5%/year threshold`);
        }
      }

      // Track G1 winners from recently resolved races
      for (const race of state.races) {
        if (race.day === day && race.resolved && race.graded?.grade === 'G1' && race.result) {
          const winnerId = race.result.find((r: any) => r.position === 1)?.horseId;
          if (winnerId) g1Winners.add(winnerId);
        }
      }

      if (day % 30 === 0) {
        process.stdout.write(".");
      }
      const dayDuration = Date.now() - dayStart;
      console.log(`Day ${day} finished in ${dayDuration}ms (Horses: ${state.horses.length}, Races: ${state.races.length})`);

      // Cleanup state to prevent memory bloat during 30-year run
      state = produce(state, (draft: any) => {
        // Prune resolved races older than 7 days
        draft.races = draft.races.filter((r: any) => r.day >= day - 7 || !r.resolved);

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
  console.log(`Total Population: ${state.horses.filter((h: any) => h.lifecycleStatus !== 'deceased').length}`);
  console.log(`Unique G1 Winners Produced: ${g1Winners.size}`);
  console.log(`Total NPC Cash in System: ${Math.round(state.cash)}`);

  // Export comprehensive summary
  const summary = {
    finalDay: state.day,
    finalYear: Math.floor((state.day - 1) / 365) + 1,
    finalPopulation: state.horses.filter((h: any) => h.lifecycleStatus !== 'deceased').length,
    g1WinnersCount: g1Winners.size,
    economicTrend: economicHistory.filter((_, i) => i % 30 === 0),
    populationTrend: populationHistory.filter((_, i) => i % 30 === 0),
    npcCashHistory,
    bankruptcyHistory,
    auctionMetrics,
    breedingMetrics,
    systemHealthMetrics,
  };

  console.log("\n=== Population Trend (Monthly) ===");
  console.log(summary.populationTrend.join(", "));

  console.log("\n=== Economic Trend (Monthly) ===");
  console.log(summary.economicTrend.map((c: number) => Math.round(c / 1000) + "k").join(", "));

  console.log("\n=== NPC Cash Distribution (Final) ===");
  if (summary.npcCashHistory.length > 0) {
    const finalCash = summary.npcCashHistory[summary.npcCashHistory.length - 1];
    console.log(`P10: $${Math.round(finalCash.p10)}, P25: $${Math.round(finalCash.p25)}, P50: $${Math.round(finalCash.p50)}, P75: $${Math.round(finalCash.p75)}, P90: $${Math.round(finalCash.p90)}`);
    console.log(`Gini Coefficient: ${finalCash.gini.toFixed(3)}`);
    console.log(`Bankrupt NPCs: ${finalCash.bankruptCount}/${finalCash.totalNPCs}`);
  }

  console.log("\n=== Breeding Metrics (Final Year) ===");
  if (summary.breedingMetrics.length > 0) {
    const finalBreeding = summary.breedingMetrics[summary.breedingMetrics.length - 1];
    console.log(`Active Stallions: ${finalBreeding.activeStallions}`);
    console.log(`Stallion Utilization: ${finalBreeding.stallionUtilization.toFixed(2)}`);
    console.log(`Eligible Mares: ${finalBreeding.eligibleMares}`);
    console.log(`Active Pregnancies: ${finalBreeding.activePregnancies}`);
    console.log(`Mare Utilization: ${finalBreeding.mareUtilization.toFixed(2)}`);
  }

  console.log("\n=== System Health (Final) ===");
  if (summary.systemHealthMetrics.length > 0) {
    const finalHealth = summary.systemHealthMetrics[summary.systemHealthMetrics.length - 1];
    console.log(`Horse Count: ${finalHealth.horseCount}`);
    console.log(`Race Count: ${finalHealth.raceCount}`);
    console.log(`Pregnancy Count: ${finalHealth.pregnancyCount}`);
    console.log(`Transaction Count: ${finalHealth.transactionCount}`);
    console.log(`Expense Count: ${finalHealth.expenseCount}`);
  }

  // Write full results to file
  const fs = require('fs');
  fs.writeFileSync(
    `simulation-results-${Date.now()}.json`,
    JSON.stringify(summary, null, 2)
  );
  console.log(`\nFull results saved to simulation-results-${Date.now()}.json`);
}

runHighPerfAnalysis(30).catch(console.error);
