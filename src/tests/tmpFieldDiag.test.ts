import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any) as any;
  const { perDay } = runPipelineForDays(state, 30) as any;
  const races = Object.values(perDay.at(-1).state.races) as any[];
  const done = races.filter((r) => r.day <= 30);
  const res = done.filter((r) => r.resolved), can = done.filter((r) => r.cancelled);
  const avg = res.reduce((s, r) => s + r.entries.length, 0) / Math.max(1, res.length);
  const npcActive = Object.values(perDay.at(-1).state.horses).filter((h: any) => h.ownership?.type === "npc" && h.lifecycleStatus === "active" && !h.stud?.atStud).length;
  console.log("FIELDS races", done.length, "resolved", res.length, "cancelled", can.length, "avgField", avg.toFixed(1), "npcActiveHorses", npcActive);
}, 200000);
