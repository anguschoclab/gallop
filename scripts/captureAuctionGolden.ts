import { createInitialState } from "@/platform/game/store/initialization";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import type { GameState } from "@/platform/game/types";
import { createAuctionRunner } from "@/domains/auction/simulation/runner";
import { SALE_TRIGGERS } from "@/domains/auction/simulation/data";
import { generateAuctionLots } from "@/domains/auction/simulation/engine";
import { createRng, hashStr } from "@/shared/common/rng";
import { checksumState } from "@/platform/time/checksum";
import { withUuidStream } from "@/shared/uuid/uuid";

const state = withUuidStream(createRng(hashStr("fixture_medium")), () =>
  createInitialState({
    profile: {
      stableName: "golden",
      owner: generatePersonIdentity({
        id: "player",
        displayName: "G",
        role: "owner",
        ageBand: "adult",
      }),
      silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
      backstoryId: "inheritor",
      founded: 1,
    },
    backstory: {
      id: "inheritor",
      label: "G",
      blurb: "",
      startingCash: 100000,
      horses: [{ tier: "starter" as const, count: 2 }],
      facilityUpgrades: {},
      facilities: {},
      reputationScore: 50,
      reputation: 50,
      difficulty: "standard",
    },
    worldSize: "medium",
  }),
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
