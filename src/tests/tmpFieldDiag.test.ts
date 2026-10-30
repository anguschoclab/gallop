import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any) as any;
  state.userSettings = { ...(state.userSettings ?? {}), gameplay: { ...(state.userSettings?.gameplay ?? {}), autoEnterRaces: true } };
  const { perDay } = runPipelineForDays(state, 60) as any;
  const races = Object.values(perDay.at(-1).state.races) as any[];
  const done = races.filter((r) => r.day <= 60);
  const res = done.filter((r) => r.resolved), can = done.filter((r) => r.cancelled);
  const avg = res.reduce((s, r) => s + r.entries.length, 0) / Math.max(1, res.length);
  const npcActive = Object.values(perDay.at(-1).state.horses).filter((h: any) => h.ownership?.type === "npc" && h.lifecycleStatus === "active" && !h.stud?.atStud).length;
  { const pr = done.filter((r: any) => r.entries.some((e: any) => e.ownership?.type === "player")); console.log("PLAYERR", pr.length, pr.filter((r: any) => r.resolved).length, pr.filter((r: any) => r.cancelled).length); }
  console.log("FIELDS races", done.length, "resolved", res.length, "cancelled", can.length, "avgField", avg.toFixed(1), "npcActiveHorses", npcActive);
}, 200000);
