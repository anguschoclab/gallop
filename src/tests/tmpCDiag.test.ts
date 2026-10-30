import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { applyImpacts } from "@/platform/resolver/resolver";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "Test Stable", owner: generatePersonIdentity({ id: "player", displayName: "Test Owner", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any);
  const { perDay } = runPipelineForDays(state, 90) as any;
  for (const d of perDay) {
    const delta = d.cashAfter - d.cashBefore;
    const pc = d.impacts.filter((i: any) => i.type === "cash_change" && (i.entityId === "player" || i.entityId === undefined));
    const ins = d.impacts.filter((i: any) => i.type === "insurance_payout" && (i.entityId === "player" || i.entityId === undefined));
    const acc = pc.reduce((s: number, i: any) => s + i.amount, 0) + ins.reduce((s: number, i: any) => s + i.amount, 0);
    if (acc !== delta) {
      console.log("MISMATCH day", d.day, "delta", delta, "acc", acc);
      const pl = d.impacts.filter((i: any) => !pc.includes(i) && /player/.test(JSON.stringify(i).slice(0, 2000)));
      console.log("TYPES", JSON.stringify(pl.map((i: any) => JSON.stringify({ ...i, horse: undefined, report: undefined }).slice(0, 300)).slice(0, 25)));
      console.log("PC", JSON.stringify(pc.map((i: any) => [i.amount, i.reason])));
      console.log("INS", JSON.stringify(ins));
      let cur = (perDay[perDay.indexOf(d) - 1]?.state ?? state) as any;
      for (const imp of d.impacts) { const before = cur.cash; try { cur = applyImpacts({ state: cur, intents: [], impacts: [imp], impactLog: [], day: d.day } as any).state; } catch (e) { continue; } if (cur.cash !== before) console.log("CASHMOVE", imp.type, cur.cash - before, JSON.stringify(imp).slice(0, 300)); }
      console.log("REPLAY end", cur.cash, "actual", d.cashAfter, "before", d.cashBefore);
      console.log("TX", JSON.stringify((d.state.transactions ?? []).filter((t: any) => t.day === d.day).map((t: any) => [t.type ?? t.category, t.subcategory ?? t.category, t.amount, String(t.description).slice(0, 60)])));
      const st = perDay[perDay.indexOf(d) - 1]?.state ?? state; console.log("RE", JSON.stringify(d.impacts.filter((i: any) => ["race_entry","race_withdrawal","syndicate_share_transfer","stud_fee_distribution","salary"].includes(i.type) || /share|stud_fee|salary/i.test(i.type)).filter((i: any) => { const h = st.horses[i.horseId]; return !h || h.ownership?.type === "player" || /player/.test(JSON.stringify(i)); }).map((i: any) => JSON.stringify(i).slice(0, 400)).slice(0, 10)));
      console.log("ALLINS", JSON.stringify(d.impacts.filter((i: any) => /insurance/i.test(i.type)).slice(0, 5)));
      console.log("logs", d.logs.map((l: any) => l.text).filter((t: string) => /\$|fee|cost/i.test(t)).slice(0, 15));
      break;
    }
  }
}, 200000);
