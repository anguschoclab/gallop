import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { getStableId } from "@/domains/horse/simulation/ownership";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any) as any;
  const hs = ["Frankel", "Wootton Bassett", "Lord Kanaloa"].map((n) => Object.values(state.horses).find((h: any) => h.name === n) as any);
  state.pendingIntents = hs.map((h, i) => ({ id: "x" + i, entityId: h.id, source: "player", day: state.day, priority: 100, type: "scout", horseId: h.id, stableId: getStableId(h) }));
  const { perDay } = runPipelineForDays(state, 1) as any;
  console.log("REPORTS", (perDay[0].state.scoutReports ?? []).length);
}, 120000);
