
import { createDefaultGameState } from "../src/game/state";
import { useGame } from "../src/game/store";

async function runBenchmark() {
  console.log("=== Starting Headless Benchmark (10 days) ===");
  
  const initialState = createDefaultGameState();
  useGame.setState(initialState);
  
  const start = Date.now();
  await useGame.getState().advanceMultipleDays(10, true);
  const end = Date.now();
  
  console.log(`\nFinished 10 days in ${(end - start) / 1000}s`);
  console.log(`Current Day: ${useGame.getState().day}`);
  console.log(`Horse Count: ${useGame.getState().horses.length}`);
}

runBenchmark().catch(console.error);
