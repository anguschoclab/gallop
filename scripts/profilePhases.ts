import { createInitialState } from "../src/game/store/initialization";
import type { GameState } from "../src/game/types";
import { SimulationExecutor } from "../src/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "../src/core/time/phases/descriptors";
import { buildAdvancePlan } from "../src/core/time/advancePlan";
import { createTelemetry } from "../src/core/time/telemetry";
import { withUuidStream } from "../src/core/uuid";
import { createRng, hashStr } from "../src/core/common/rng";

const days = Number(process.argv[2] ?? 30);
const size = (process.argv[3] ?? "medium") as "small" | "medium" | "large";

// Deterministic entity ids so profiles are comparable across processes/revisions.
const state = withUuidStream(createRng(hashStr(`fixture_${size}`)), () =>
  createInitialState({
    profile: {
      stableName: `prof-${size}`,
      ownerName: "Prof",
      silk: { primary: "#c8a24a", secondary: "#1c1c22", pattern: "solid" },
      backstoryId: "wealthy_dilettante",
      founded: 1,
    },
    backstory: {
      id: "wealthy_dilettante",
      label: "Prof",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "normal",
    },
    worldSize: size,
  } as Parameters<typeof createInitialState>[0]),
) as GameState;

// Warmup
const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
executor.runRange(structuredClone(state), buildAdvancePlan(structuredClone(state), 5, true));

const telemetry = createTelemetry(true);
const input = structuredClone(state);
const plan = buildAdvancePlan(input, days, true);
const t0 = performance.now();
executor.runRange(input, plan, { checksum: false, telemetry });
const elapsed = performance.now() - t0;

const report = telemetry.report();
console.log(
  `\n${size}/${days}d total ${elapsed.toFixed(0)}ms (${(days / (elapsed / 1000)).toFixed(1)} days/s)`,
);
console.log("span,ms,share%");
for (const s of report.spans.slice(0, 25)) {
  console.log(`${s.label},${s.ms.toFixed(0)},${((s.ms / elapsed) * 100).toFixed(1)}`);
}
