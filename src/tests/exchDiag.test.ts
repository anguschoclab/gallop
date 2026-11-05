import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { runExchangeSettlementDay } from "@/domains/market/simulation/exchangeSettlement";
import { createDefaultExchangeState } from "@/domains/market/simulation/exchange";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
it("diag", () => {
  const b = BACKSTORIES[0];
  const s: any = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({id:"player",displayName:"x",role:"owner",ageBand:"adult"}), silk:{pattern:"solid",primary:"#f00",secondary:"#00f",cap:"#0f0"}, backstoryId: b.id, founded:1 } as any, backstory: b, worldSize: "small" } as any);
  let ex = createDefaultExchangeState(); let horses = s.horses; let st = s.npcStables;
  const total = () => st.reduce((a: number, x: any) => a + x.cash, 0);
  const cnt = () => { const m: Record<string, number> = {}; for (const h of Object.values<any>(horses)) if (h.ownership?.type==="npc") m[h.ownership.stableId]=(m[h.ownership.stableId]??0)+1; return m; };
  console.log("start", Math.round(total()), st.length, JSON.stringify(st.map((x:any)=>[x.personality,Math.round(x.cash),cnt()[x.id]??0])));
  let trades=0, comm=0, volume=0;
  for (let d = 1; d <= 180; d++) {
    const r = runExchangeSettlementDay({ day: d, exchange: ex, horses, npcStables: st, playerReputation: 100 });
    const newT = r.exchange.trades.filter((t:any)=>t.day===d);
    trades+=newT.length; for (const t of newT){comm+=t.commission; volume+=t.price;}
    ex = r.exchange; horses = r.horses; st = r.npcStables;
    if (d % 30 === 0) { const c = cnt(); console.log(d, "trades", trades, "vol", volume, "comm", comm, "total", Math.round(total()), JSON.stringify(st.map((x:any)=>[x.personality,Math.round(x.cash),c[x.id]??0,x.reputation]))); }
  }
}, 300000);
