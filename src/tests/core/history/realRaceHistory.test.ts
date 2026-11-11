import { describe, expect, it } from "vitest";
import { realRaceHistory } from "@/domains/history/simulation/realHorseInsights";
import { realHorses } from "@/shared/data/realHorses";

describe("realRaceHistory", () => {
  it("groups Nijinsky's real wins by season with career prize money", () => {
    const nij = realHorses.find((h) => h.name === "Nijinsky")!;
    const r = realRaceHistory(nij);
    expect(r.seasons.map((s) => s.year)).toEqual([1969, 1970]);
    expect(r.seasons[1].finishes.map((f) => f.race)).toContain("Epsom Derby");
    expect(r.earningsUsd).toBe(677177);
    expect(r.earningsPerStart).toBe(Math.round(677177 / 13));
    expect(r.undocumentedWins).toBe(1);
  });
  it("keeps entries without a year", () => {
    const r = realRaceHistory({ majorWins: ["Mystery Plate"] });
    expect(r.finishes).toEqual([{ race: "Mystery Plate", position: 1 }]);
  });
});
