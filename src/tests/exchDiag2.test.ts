import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
it("diag2", () => {
  const b = BACKSTORIES[0];
  let s: any = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({id:"player",displayName:"x",role:"owner",ageBand:"adult"}), silk:{pattern:"solid",primary:"#f00",secondary:"#00f",cap:"#0f0"}, backstoryId: b.id, founded:1 } as any, backstory: b, worldSize: "small" } as any);
  const rep = (tag: string) => { const c = s.npcStables.map((x:any)=>x.cash).sort((a:number,b:number)=>a-b); const r = s.npcStables.map((x:any)=>x.reputation).sort((a:number,b:number)=>a-b);
    console.log("FULL", tag, "n", c.length, "total", Math.round(c.reduce((a:number,x:number)=>a+x,0)), "min", Math.round(c[0]), "med", Math.round(c[c.length>>1]), "max", Math.round(c[c.length-1]), "rep", r[0], r[r.length>>1], r[r.length-1], "trades", s.exchange?.trades?.length, "tradesLast30", (s.exchange?.trades??[]).filter((t:any)=>t.day> s.day-30).length); };
  rep("d0");
  for (let k=0;k<6;k++){ s = runPipelineForDays(s, 30).state; rep("d"+s.day); }
}, 600000);
