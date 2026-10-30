import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
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
      console.log(JSON.stringify(d.impacts.filter((i: any) => typeof i.amount === "number" && !pc.includes(i)).map((i: any) => [i.type, i.entityId, i.amount, i.reason]).filter((x: any) => Math.abs(x[2]) < 5000).slice(0, 30)));
      console.log("logs", d.logs.map((l: any) => l.text).filter((t: string) => /\$|fee|cost/i.test(t)).slice(0, 15));
      break;
    }
  }
}, 200000);
