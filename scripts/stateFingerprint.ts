import { createInitialState } from "@/platform/game/store/initialization";
import type { GameState } from "@/platform/game/types";
import { SimulationExecutor } from "@/platform/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { buildAdvancePlan } from "@/platform/time/advancePlan";
import { checksumState } from "@/platform/time/checksum";
import { withUuidStream } from "@/shared/uuid/uuid";
import { createRng, hashStr } from "@/shared/common/rng";

const days = Number(process.argv[2] ?? 30);
const size = (process.argv[3] ?? "medium") as "small" | "medium" | "large";

// Deterministic entity ids so same-seed fixtures are identical across processes.
const state = withUuidStream(createRng(hashStr(`fixture_${size}`)), () =>
  createInitialState({
    profile: {
      stableName: `fp-${size}`,
      ownerName: "FP",
      silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
      backstoryId: "inheritor",
      founded: 1,
    },
    backstory: {
      id: "inheritor",
      label: "FP",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "standard",
    },
    worldSize: size,
  }),
) as GameState;

const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
const outcome = executor.runRange(
  structuredClone(state),
  buildAdvancePlan(structuredClone(state), days, true),
);
console.log(`checksum:${checksumState(outcome.state)}`);
