import { describe, it, expect } from "vitest";
import { planEffectiveness, type StrategyJournalEntry } from "@/core/tactics/strategyJournal";

const e = (style: string | undefined, position: number): StrategyJournalEntry => ({
  id: Math.random().toString(), createdDay: 1, horseId: "h", horseName: "H", raceId: "r", plan: "",
  ridingStyle: style,
  result: { position, fieldSize: 8, prizeMoney: position === 1 ? 1000 : 0, cashAfter: 0, filledDay: 2 },
});

describe("planEffectiveness", () => {
  it("ranks the style that wins more higher and counts custom plans", () => {
    const rows = planEffectiveness(
      [e("Closer", 1), e("Closer", 1), e("Closer", 2), e("Front Runner", 7), e("Front Runner", 8), e(undefined, 3)],
      "ridingStyle",
    );
    expect(rows[0].key).toBe("Closer");
    expect(rows[0].wins).toBe(2);
    expect(rows.find((r) => r.key === "Front Runner")!.score).toBeLessThan(rows[0].score);
    expect(rows.some((r) => r.key === "Custom plan")).toBe(true);
    expect(planEffectiveness([{ ...e("Closer", 1), result: undefined }], "ridingStyle")).toEqual([]);
  });
});
