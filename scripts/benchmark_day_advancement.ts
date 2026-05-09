
import { createInitialState } from "../src/game/store/initialization";
import { useGame } from "../src/game/store";
import { DAYS_PER_YEAR } from "../src/game/constants/gameConstants";

async function runBenchmark() {
  console.log("=== Starting Performance Benchmark ===\n");

  const initialState = createInitialState();
  useGame.setState(initialState);

  const daysToSimulate = 30;
  console.log(`Simulating ${daysToSimulate} days...`);

  const start = Date.now();
  for (let i = 0; i < daysToSimulate; i++) {
    await useGame.getState().advanceDay();
  }
  const duration = Date.now() - start;

  console.log(`\nTotal time for ${daysToSimulate} days: ${duration}ms`);
  console.log(`Average time per day: ${(duration / daysToSimulate).toFixed(2)}ms`);

  process.exit(0);
}

runBenchmark().catch(console.error);
