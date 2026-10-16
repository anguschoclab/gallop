import { createInitialState } from "../src/game/store/initialization";
import type { GameState } from "../src/game/types";
import { SimulationExecutor } from "../src/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "../src/core/time/phases/descriptors";
import { buildAdvancePlan } from "../src/core/time/advancePlan";
import { checksumState } from "../src/core/time/checksum";
import { withUuidStream } from "../src/core/uuid";
import { createRng, hashStr } from "../src/core/common/rng";

const days = Number(process.argv[2] ?? 30);
const size = (process.argv[3] ?? "medium") as "small" | "medium" | "large";

// Deterministic entity ids so same-seed fixtures are identical across processes.
const state = withUuidStream(createRng(hashStr(`fixture_${size}`)), () =>
  createInitialState({
    profile: {
      stableName: `fp-${size}`,
      ownerName: "FP",
      silk: { primary: "#c8a24a", secondary: "#1c1c22", pattern: "solid" },
      backstoryId: "wealthy_dilettante",
      founded: 1,
    },
    backstory: {
      id: "wealthy_dilettante",
      label: "FP",
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

const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
const outcome = executor.runRange(
  structuredClone(state),
  buildAdvancePlan(structuredClone(state), days, true),
);
console.log(`checksum:${checksumState(outcome.state)}`);
