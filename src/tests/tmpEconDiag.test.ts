import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({
    profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any,
    backstory, worldSize: "small",
  } as any);
  const { state: fin, impacts } = runPipelineForDays(state, 90) as any;
  console.log("cash", fin.cash, Object.keys(fin));
  const tx = (fin.transactions ?? fin.ledger ?? []) as any[];
  const by: Record<string, number> = {};
  for (const t of tx) { if ((t.amount ?? 0) > 0) { const k = `${t.category}/${t.subcategory ?? ""}/${String(t.description ?? "").slice(0, 30)}`; by[k] = (by[k] ?? 0) + t.amount; } }
  console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 15));
  if (impacts) {
    const ci: Record<string, number> = {};
    for (const i of impacts as any[]) if (i.type === "cash_change" && i.amount > 0 && (i.stableId === undefined || i.stableId === null)) { const k = String(i.reason ?? "").replace(/[0-9$,]+/g, "#").slice(0, 50); ci[k] = (ci[k] ?? 0) + i.amount; }
    console.log(Object.entries(ci).sort((a, b) => b[1] - a[1]).slice(0, 15));
  }
}, 120000);
