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
    if (d===150||d===20){ const asks=r.exchange.asks.filter((a:any)=>a.sellerId!=="player"); let noBid=0, below=0, ratios:number[]=[], floors:number[]=[];
      for(const a of asks){const bs=r.exchange.bids.filter((b:any)=>b.horseId===a.horseId); if(!bs.length){noBid++;continue;} const top=Math.max(...bs.map((b:any)=>b.price)); ratios.push(+(top/a.fairValue).toFixed(2)); floors.push(+((a.acceptFloor??0)/a.fairValue).toFixed(2)); if(top<(a.acceptFloor??0)) below++;}
      const fv=asks.map((a:any)=>a.fairValue).sort((x:number,y:number)=>x-y);
      console.log("BOOK",d,"asks",asks.length,"noBid",noBid,"below",below,"ratios",JSON.stringify(ratios.slice(0,40)),"floors",JSON.stringify(floors.slice(0,40)),"fvMedian",fv[fv.length>>1]); }
    ex = r.exchange; horses = r.horses; st = r.npcStables;
    if (d % 30 === 0) { const c = cnt(); console.log(d, "trades", trades, "vol", volume, "comm", comm, "total", Math.round(total()), JSON.stringify(st.map((x:any)=>[x.personality,Math.round(x.cash),c[x.id]??0,x.reputation]))); }
  }
}, 300000);
