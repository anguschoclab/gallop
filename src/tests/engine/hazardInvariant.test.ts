import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { buildRunner, getConditionsModifier } from "@/core/race/engine/runnerBuilder";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

/**
 * Hazard dt-invariance test.
 *
 * A high-bleeder horse should have the same expected number of bleeder events
 * regardless of dt, because the per-second hazard rate is fixed.
 * We verify this by running many seeded races at dt=0.1 and dt=1.0 and checking
 * that average finish times are statistically similar.
 */
describe("hazard model dt-invariance", () => {
  it("high bleeder risk produces similar average times at dt=0.1 vs dt=1.0", () => {
    const distance = 2400; // long race to give bleeder time to trigger
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

    function buildHighBleederRunner() {
      const horse = createTestHorse({
        id: "bleeder",
        name: "Bleeder",
        bleederRisk: 1.0, // max risk
        stats: {
          speed: 70,
          stamina: 80,
          acceleration: 70,
          consistency: 70,
          temperament: 50,
          conformation: 50,
        },
      });
      return buildRunner(horse, true, distance, "Turf", getConditionsModifier({}));
    }

    const times01: number[] = [];
    const times10: number[] = [];

    for (const seed of seeds) {
      const rng01 = createRng(seed);
      const rng10 = createRng(seed);

      const runner01 = buildHighBleederRunner();
      const res01 = runRaceToCompletion([runner01], distance, rng01, 0.1, 600);
      times01.push(res01.result[0].time);

      const runner10 = buildHighBleederRunner();
      const res10 = runRaceToCompletion([runner10], distance, rng10, 1.0, 600);
      times10.push(res10.result[0].time);
    }

    const avg01 = times01.reduce((a, b) => a + b, 0) / times01.length;
    const avg10 = times10.reduce((a, b) => a + b, 0) / times10.length;

    // With dt-invariant hazards, average times should be within ~5%.
    // Before the fix, dt=1.0 would produce near-certain bleeder events
    // and dramatically slower times.
    const diff = Math.abs(avg01 - avg10) / Math.max(avg01, avg10);
    expect(diff).toBeLessThan(0.05);
  });
});
