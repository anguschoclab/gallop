import { createInitialState } from "../src/game/store/initialization";
import type { GameState } from "../src/game/types";
import { createAuctionRunner } from "../src/core/auction/runner";
import { SALE_TRIGGERS } from "../src/core/auction/data";
import { generateAuctionLots } from "../src/core/auction/engine";
import { createRng, hashStr } from "../src/core/common/rng";
import { checksumState } from "../src/core/time/checksum";
import { withUuidStream } from "../src/core/uuid";

const state = withUuidStream(createRng(hashStr("fixture_medium")), () =>
  createInitialState({
    profile: {
      stableName: "golden",
      ownerName: "G",
      silk: { primary: "#c8a24a", secondary: "#1c1c22", pattern: "solid" },
      backstoryId: "wealthy_dilettante",
      founded: 1,
    },
    backstory: {
      id: "wealthy_dilettante",
      label: "G",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "normal",
    },
    worldSize: "medium",
  } as Parameters<typeof createInitialState>[0]),
) as GameState;

const horses = Object.values(state.horses);
const stables = state.npcStables;
const rng = createRng(hashStr("daily_30"));

for (const kind of ["yearling", "mixed"] as const) {
  const trigger = SALE_TRIGGERS.find((t) => t.kind === kind);
  const sale = generateAuctionLots(44, stables, [...horses], kind, trigger!.name, rng);
  const runner = createAuctionRunner(sale, stables, horses);
  runner.runToCompletion();
  const lots = runner.finalLots();
  const summary = lots.map((l) => ({
    id: l.id,
    horseId: l.horseId,
    hammerPrice: l.hammerPrice ?? null,
    soldTo: l.soldToStableId ?? null,
    passed: !!l.passed,
    bids: (l.bidHistory ?? []).map((b) => `${b.stableId ?? "player"}:${b.amount}`),
  }));
  console.log(`=== ${kind} ===`);
  console.log(JSON.stringify(summary));
  console.log(`log: ${JSON.stringify(runner.log())}`);
  const impacts = runner.finalImpacts({ day: 44, phase: "auctions" });
  console.log(`impactChecksum:${checksumState(impacts as any)}`);
}
