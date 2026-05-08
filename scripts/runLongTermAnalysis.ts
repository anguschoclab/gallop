
import { createInitialState } from "../src/game/store/initialization";
import { useGame } from "../src/game/store";
import type { GameState } from "../src/game/types";

// Suppress worker warnings
const originalWarn = console.warn;
console.warn = () => {};

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

async function runLongTermAnalysis(totalYears: number = 10) {
  console.log(`=== Starting Long-Term Analysis (${totalYears} years) ===\n`);

  const initialState = createInitialState();
  useGame.setState(initialState);

  const history: YearMetrics[] = [];
  
  let auctionSalesThisYear = 0;
  let auctionLotsThisYear = 0;
  let auctionRevenueThisYear = 0;
  let foalsThisYear = 0;
  let deathsThisYear = 0;

  for (let year = 1; year <= totalYears; year++) {
    const yearStartDay = useGame.getState().day;
    foalsThisYear = 0;
    deathsThisYear = 0;
    auctionLotsThisYear = 0;
    auctionRevenueThisYear = 0;

    console.log(`\n--- Year ${year} (Day ${yearStartDay}) ---`);

    for (let day = 1; day <= 365; day++) {
      const stateBefore = useGame.getState();
      const horseCountBefore = stateBefore.horses.length;
      
      // Advance one day
      await useGame.getState().advanceMultipleDays(1, true);
      
      const stateAfter = useGame.getState();
      const currentDay = stateAfter.day;
      
      // Track foals (new horses with age 0)
      const newHorses = stateAfter.horses.filter(h => h.age === 0 && !stateBefore.horses.find(bh => bh.id === h.id));
      foalsThisYear += newHorses.length;
      
      // Track deaths
      const deadHorses = stateAfter.horses.filter(h => h.lifecycleStatus === "deceased" && stateBefore.horses.find(bh => bh.id === h.id && bh.lifecycleStatus !== "deceased"));
      deathsThisYear += deadHorses.length;

      // Track auctions
      // Resolved auctions in state.auctions for the last 30 days
      const resolvedToday = stateAfter.auctions.filter(a => a.resolved && a.day === currentDay);
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

    // Collect year-end metrics
    const state = useGame.getState();
    const horses = state.horses.filter(h => h.lifecycleStatus === "active");
    const npcs = state.npcStables;
    
    const potSum = horses.reduce((sum, h) => sum + h.potential, 0);
    const elite = horses.filter(h => h.potential >= 90).length;
    const maxPot = Math.max(...horses.map(h => h.potential), 0);
    
    const npcCash = npcs.map(n => n.cash);
    const avgCash = npcCash.reduce((sum, c) => sum + c, 0) / (npcs.length || 1);
    
    const metrics: YearMetrics = {
      year,
      horseCount: horses.length,
      foalsBorn: foalsThisYear,
      deaths: deathsThisYear,
      avgPotential: potSum / (horses.length || 1),
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

runLongTermAnalysis(10).catch(console.error);
