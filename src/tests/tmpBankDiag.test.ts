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
  const neg = [] as any[]; void d1.impacts.filter((i: any) => i.type === "cash_change" && majors.some((m: any) => String(i.entityId).includes(String(m.id))) && i.amount < 0);
  const by: Record<string, number> = {}; for (const i of neg) { const k = String(i.reason).replace(/[0-9$,.]+/g, "#").slice(0, 40); by[k] = (by[k] ?? 0) + i.amount; }
  const last = perDay.at(-1);
  console.log("D30", last.state.npcStables.filter((s: any) => s.isMajor).map((s: any) => [s.name, Math.round(s.cash)]).slice(0, 10));
  console.log("LIQ", perDay.flatMap((d: any) => d.logs.map((l: any) => l.text)).filter((t: string) => /bankrupt|liquidation/i.test(t)).slice(0, 8));
  const ids = new Map(majors.map((m: any) => [String(m.id), m.name]));
  const flows: Record<string, Record<string, number>> = {};
  for (const d of perDay) for (const i of d.impacts as any[]) {
    if (i.type !== "cash_change") continue; const id = String(i.entityId ?? ""); const nm = ids.get(id) ?? ids.get(id.replace(/^npc:/, "")); if (!nm) continue;
    const k = String(i.reason).replace(/[0-9$,.]+/g, "#").slice(0, 32); (flows[nm] ??= {})[k] = ((flows[nm] ??= {})[k] ?? 0) + i.amount; }
  for (const [nm, f] of Object.entries(flows).slice(0, 4)) console.log("FLOW", nm, JSON.stringify(Object.entries(f).sort((x, y) => x[1] - y[1]).slice(0, 6).map(([k, v]) => [k, Math.round(v)])));
  const bk = perDay.map((d: any) => [d.day, d.logs.filter((l: any) => /declared bankrupt|bankruptcy|has gone bankrupt|Liquidation Sale Scheduled/i.test(l.text)).map((l: any) => l.text.slice(0, 80))]).filter((x: any) => x[1].length);
  console.log("BK", JSON.stringify(bk.slice(0, 6)));
  console.log("NEG", Object.entries(by).sort((a, b) => a[1] - b[1]).slice(0, 10));
}, 120000);
