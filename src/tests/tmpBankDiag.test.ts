import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any);
  const majors = state.npcStables.filter((s: any) => s.isMajor);
  const count = (st: any, s: any) => Object.values(st.horses).filter((h: any) => h.ownership?.type === "npc" && h.ownership.stableId === s.id).length;
  console.log("D0", majors.map((s: any) => [s.name, s.tier, Math.round(s.cash), count(state, s)]).slice(0, 10));
  const { perDay } = runPipelineForDays(state, 30) as any;
  const d1 = perDay[0];
  console.log("D1", d1.state.npcStables.filter((s: any) => s.isMajor).map((s: any) => [s.name, Math.round(s.cash)]).slice(0, 10));
  const neg = d1.impacts.filter((i: any) => i.type === "cash_change" && majors.some((m: any) => String(i.entityId).includes(String(m.id))) && i.amount < 0);
  const by: Record<string, number> = {}; for (const i of neg) { const k = String(i.reason).replace(/[0-9$,.]+/g, "#").slice(0, 40); by[k] = (by[k] ?? 0) + i.amount; }
  const last = perDay.at(-1);
  console.log("D30", last.state.npcStables.filter((s: any) => s.isMajor).map((s: any) => [s.name, Math.round(s.cash)]).slice(0, 10));
  console.log("LIQ", perDay.flatMap((d: any) => d.logs.map((l: any) => l.text)).filter((t: string) => /bankrupt|liquidation/i.test(t)).slice(0, 8));
  const starts: Record<string, number[]> = {};
  for (const r of last.state.races) if (r.resolved) for (const e of r.entries) (starts[e.horseId] ??= []).push(r.day);
  const multi = Object.values(starts).filter((d) => new Set(d).size !== d.length).length;
  console.log("STARTS horses", Object.keys(starts).length, "sameDayDoubles", multi, "max", Math.max(...Object.values(starts).map((d) => d.length)));
  console.log("NEG", Object.entries(by).sort((a, b) => a[1] - b[1]).slice(0, 10));
}, 120000);
