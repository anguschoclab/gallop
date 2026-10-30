import { it } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { calculateRecommendedStudFee } from "@/domains/breeding/simulation/stallions";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
it("diag", () => {
  const backstory = BACKSTORIES.find((b) => b.id === "inheritor")!;
  const state = createInitialState({ profile: { stableName: "T", owner: generatePersonIdentity({ id: "player", displayName: "T", role: "owner", ageBand: "adult" }), silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" }, backstoryId: "inheritor", founded: 1 } as any, backstory, worldSize: "small" } as any);
  const studs = Object.values(state.horses).filter((h: any) => h.stud?.atStud) as any[];
  console.log("studs", studs.length, "zeroFee", studs.filter((h) => !h.stud.standingFee).length);
  for (const h of studs.filter((h) => !h.stud.standingFee).slice(0, 5)) console.log(h.name, h.phenotypeResolved, calculateOverallRating(h), calculateOverallRating(ensurePhenotypeResolved(h)), calculateRecommendedStudFee(h, "mid"), JSON.stringify(h.stats).slice(0, 120));
});
