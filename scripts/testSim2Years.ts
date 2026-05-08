
import { createDefaultGameState } from "../src/game/state";
import { useGame } from "../src/game/store";

async function runTestSim() {
  console.log("=== Running 2-year simulation test ===");
  
  const initialState = createDefaultGameState();
  useGame.setState(initialState);
  
  // Suppress worker warnings
  const originalWarn = console.warn;
  console.warn = () => {};

  for (let year = 1; year <= 2; year++) {
    console.log(`Simulating year ${year}...`);
    const start = Date.now();
    await useGame.getState().advanceMultipleDays(365, true);
    const end = Date.now();
    console.log(`Year ${year} finished in ${((end - start) / 1000).toFixed(1)}s`);
    console.log(`Day: ${useGame.getState().day}, Horses: ${useGame.getState().horses.length}`);
  }
  
  console.warn = originalWarn;
}

runTestSim().catch(console.error);
