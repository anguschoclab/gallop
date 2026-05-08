
import { createInitialState } from "../src/game/store/initialization";
import { useGame } from "../src/game/store";

async function runBenchmark() {
  console.log("=== Starting Headless Benchmark (10 days, populated world) ===");
  
  const initialState = createInitialState();
  useGame.setState(initialState);
  
  console.log(`Initial Horse Count: ${useGame.getState().horses.length}`);
  
  const start = Date.now();
  await useGame.getState().advanceMultipleDays(10, true);
  const end = Date.now();
  
  console.log(`\nFinished 10 days in ${((end - start) / 1000).toFixed(2)}s`);
  console.log(`Current Day: ${useGame.getState().day}`);
  console.log(`Final Horse Count: ${useGame.getState().horses.length}`);
}

runBenchmark().catch(console.error);
