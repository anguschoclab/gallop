/**
 * Long-Term Simulation Analysis
 *
 * Runs the production SimulationExecutor for N years and tracks population,
 * economy, auctions, breeding, and system-health metrics over time.
 *
 * Run with: bun run scripts/runLongTermAnalysis.ts [years] [worldSize]
 */

import { createInitialState } from "@/platform/game/store/initialization";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { SimulationExecutor } from "@/platform/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { withUuidStream } from "@/shared/uuid/uuid";
import { createRng, hashStr } from "@/shared/common/rng";
import { DAYS_PER_YEAR } from "@/domains/calendar/model/calendarConstants";
import { produce } from "immer";
import fs from "fs";
import type { GameState } from "@/platform/game/types";

const years = Number(process.argv[2] ?? 1);
const worldSize = (process.argv[3] ?? "medium") as "small" | "medium" | "large";

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
function calculatePercentiles(values: number[]): {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
} {
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
function runHighPerfAnalysis() {
  console.log(`=== Starting Long-Term Analysis (${years} years, ${worldSize}) ===`);

  // Deterministic entity ids keep runs reproducible across processes.
  let state = withUuidStream(createRng(hashStr(`fixture_${worldSize}`)), () =>
    createInitialState({
      profile: {
        stableName: "lta",
        owner: generatePersonIdentity({
          id: "player",
          displayName: "LTA",
          role: "owner",
          ageBand: "adult",
        }),
        silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "LTA",
        blurb: "",
        startingCash: 100000,
        horses: [{ tier: "starter" as const, count: 2 }],
        facilityUpgrades: {},
        facilities: {},
        reputationScore: 50,
        reputation: 50,
        difficulty: "standard",
      },
      worldSize,
    }),
  ) as GameState;

  const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
  const totalDays = years * DAYS_PER_YEAR;
  const startDay = state.day;

  // Trackers
  const populationHistory: number[] = [];
  const economicHistory: number[] = [];
  const g1Winners: Set<string> = new Set();
  const npcCashHistory: Record<string, number>[] = [];
  const bankruptcyHistory: number[] = [];
  const auctionMetrics: Record<string, number>[] = [];
  const breedingMetrics: Record<string, number>[] = [];
  const systemHealthMetrics: Record<string, number>[] = [];

  for (let day = startDay + 1; day <= startDay + totalDays; day++) {
    const year = Math.floor((day - 1) / DAYS_PER_YEAR) + 1;
    const dayStart = Date.now();

    try {
      state = executor.runDay(state, day).state;

      // Track population (deceased horses are archived out of state.horses)
      populationHistory.push(Object.keys(state.horses).length);
      // Track player cash
      economicHistory.push(state.cash);

      // Track NPC cash distribution and bankruptcy
      const npcCashValues = state.npcStables.map((s) => s.cash);
      const bankruptCount = npcCashValues.filter((c) => c < 0).length;
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
        const resolvedAuctions = state.auctions.filter((a) => a.resolved && a.day >= day - 30);
        if (resolvedAuctions.length > 0) {
          const totalLots = resolvedAuctions.reduce((sum, a) => sum + a.lots.length, 0);
          const soldLots = resolvedAuctions.reduce(
            (sum, a) => sum + a.lots.filter((l) => !l.passed).length,
            0,
          );
          const avgPrice =
            resolvedAuctions.reduce((sum, a) => {
              return (
                sum + a.lots.filter((l) => l.hammerPrice).reduce((s, l) => s + l.hammerPrice!, 0)
              );
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
        const allHorses = Object.values(state.horses);
        const foalsBornThisPeriod = allHorses.filter(
          (h) => h.createdAtDay && h.createdAtDay >= day - 30,
        ).length;
        const activeStallions = allHorses.filter(
          (h) => h.gender === "horse" && h.stud?.atStud,
        ).length;
        const totalBookings = allHorses.reduce((sum, h) => sum + (h.stud?.seasonBookings || 0), 0);
        const eligibleMares = allHorses.filter(
          (h) => h.gender === "mare" && h.age >= 3 && h.age <= 15,
        ).length;
        const activePregnancies = state.pregnancies?.filter((p) => !p.resolved).length || 0;

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
          horseCount: Object.keys(state.horses).length,
          raceCount: Object.keys(state.races).length,
          pregnancyCount: state.pregnancies?.length || 0,
          transactionCount: state.transactions?.length || 0,
          expenseCount: state.expenses?.length || 0,
          logCount: state.log?.length || 0,
          newsCount: state.news?.length || 0,
        });
      }

      // Alert system for critical issues
      if (day % DAYS_PER_YEAR === 0 && day > DAYS_PER_YEAR) {
        const prevPopulation = populationHistory[populationHistory.length - DAYS_PER_YEAR];
        const currentPopulation = populationHistory[populationHistory.length - 1];
        const growthRate =
          prevPopulation > 0 ? ((currentPopulation - prevPopulation) / prevPopulation) * 100 : 0;

        const currentBankruptCount = bankruptcyHistory[bankruptcyHistory.length - 1];
        const bankruptcyRate =
          state.npcStables.length > 0 ? (currentBankruptCount / state.npcStables.length) * 100 : 0;

        if (growthRate > 10) {
          console.log(
            `ALERT: Population growth rate ${growthRate.toFixed(1)}% exceeds 10%/year threshold`,
          );
        }
        if (bankruptcyRate > 5) {
          console.log(
            `ALERT: Bankruptcy rate ${bankruptcyRate.toFixed(1)}% exceeds 5%/year threshold`,
          );
        }
      }

      // Track G1 winners from races resolved today (they remain in
      // state.races until the archiving phase moves them out after 30 days)
      for (const race of Object.values(state.races)) {
        if (race.day === day && race.resolved && race.graded?.grade === "G1" && race.result) {
          const winnerId = race.result.find((r) => r.position === 1)?.horseId;
          if (winnerId) g1Winners.add(winnerId);
        }
      }

      const dayDuration = Date.now() - dayStart;
      if (day % 30 === 0) {
        console.log(
          `Day ${day} (Year ${year}) finished in ${dayDuration}ms ` +
            `(Horses: ${Object.keys(state.horses).length}, ` +
            `Races: ${Object.keys(state.races).length})`,
        );
      }

      // The archiving phase already moves deceased horses, old races,
      // resolved pregnancies, and old news into state.archive. Unbounded
      // collections with no archival path still need periodic pruning for
      // multi-decade runs.
      if (day % 30 === 0) {
        state = produce(state, (draft) => {
          if (draft.transactions && draft.transactions.length > 1000) {
            draft.transactions = draft.transactions.slice(-1000);
          }
          if (draft.expenses && draft.expenses.length > 1000) {
            draft.expenses = draft.expenses.slice(-1000);
          }
          if (draft.replays && draft.replays.length > 1000) {
            draft.replays = draft.replays.slice(-1000);
          }
          if (draft.log && draft.log.length > 1000) {
            draft.log = draft.log.slice(-1000);
          }
          if (draft.hallOfFame && draft.hallOfFame.length > 200) {
            draft.hallOfFame = draft.hallOfFame.slice(-200);
          }
        });
      }
    } catch (e) {
      console.error(`\nFAILED on Day ${day}:`, e);
      break;
    }
  }

  console.log("\n\n=== Analysis Complete ===");
  console.log(`Final Year: ${Math.floor((state.day - 1) / DAYS_PER_YEAR) + 1}`);
  console.log(`Total Population: ${Object.keys(state.horses).length}`);
  console.log(`Unique G1 Winners Produced: ${g1Winners.size}`);
  console.log(`Player Cash: ${Math.round(state.cash)}`);

  // Export comprehensive summary
  const summary = {
    finalDay: state.day,
    finalYear: Math.floor((state.day - 1) / DAYS_PER_YEAR) + 1,
    finalPopulation: Object.keys(state.horses).length,
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
  console.log(summary.economicTrend.map((c) => Math.round(c / 1000) + "k").join(", "));

  console.log("\n=== NPC Cash Distribution (Final) ===");
  if (summary.npcCashHistory.length > 0) {
    const finalCash = summary.npcCashHistory[summary.npcCashHistory.length - 1] as {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      gini: number;
      bankruptCount: number;
      totalNPCs: number;
    };
    console.log(
      `P10: $${Math.round(finalCash.p10)}, P25: $${Math.round(finalCash.p25)}, P50: $${Math.round(finalCash.p50)}, P75: $${Math.round(finalCash.p75)}, P90: $${Math.round(finalCash.p90)}`,
    );
    console.log(`Gini Coefficient: ${finalCash.gini.toFixed(3)}`);
    console.log(`Bankrupt NPCs: ${finalCash.bankruptCount}/${finalCash.totalNPCs}`);
  }

  console.log("\n=== Breeding Metrics (Final) ===");
  if (summary.breedingMetrics.length > 0) {
    const finalBreeding = summary.breedingMetrics[summary.breedingMetrics.length - 1] as {
      activeStallions: number;
      stallionUtilization: number;
      eligibleMares: number;
      activePregnancies: number;
      mareUtilization: number;
    };
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
  fs.writeFileSync(`simulation-results-${Date.now()}.json`, JSON.stringify(summary, null, 2));
  console.log(`\nFull results saved to simulation-results-${Date.now()}.json`);
}

runHighPerfAnalysis();
