import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { getStableId } from "@/domains/horse/simulation/ownership";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any) as any;
  const fr = Object.values(state.horses).find((h: any) => h.name === "Frankel") as any;
  const sid = getStableId(fr);
  console.log("FR", fr.id, JSON.stringify(fr.ownership), "stable exists", state.npcStables.some((s: any) => s.id === sid));
  state.pendingIntents = [{ id: "x", entityId: fr.id, source: "player", day: state.day, priority: 100, type: "scout", horseId: fr.id, stableId: sid }];
  const { perDay } = runPipelineForDays(state, 1) as any;
  const d = perDay[0];
  console.log("REPORTS", (d.state.scoutReports ?? []).length, d.impacts.filter((i: any) => i.type === "scout_report").length);
  console.log("LOGS", d.logs.map((l: any) => l.text).filter((t: string) => /scout|reject/i.test(t)).slice(0, 5));
}, 120000);
