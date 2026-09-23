import { describe, it, expect } from "vitest";
import { raceFormPremium, worldRankings, RACE_FORM_PREMIUM_CAP } from "@/core/market/raceForm";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { asHorseId } from "@/core/types/branded";

const win = (day: number, grade?: string) => ({ raceId: `r${day}`, raceName: `Race ${day}`, position: 1, day, grade });

describe("raceForm", () => {
  it("unraced horse has no premium", () => {
    expect(raceFormPremium(createTestHorse({ raceHistory: [] }))).toBe(1);
  });
  it("graded wins raise value more than ungraded, capped", () => {
    const g1 = raceFormPremium({ raceHistory: [win(10, "G1")] }, 10);
    const plain = raceFormPremium({ raceHistory: [win(10)] }, 10);
    expect(g1).toBeGreaterThan(plain);
    expect(plain).toBeGreaterThan(1);
    const many = raceFormPremium({ raceHistory: Array.from({ length: 50 }, () => win(10, "G1")) }, 10);
    expect(many).toBe(RACE_FORM_PREMIUM_CAP);
  });
  it("ranks by points deterministically", () => {
    const a = createTestHorse({ id: asHorseId("a"), raceHistory: [win(5, "G1")] });
    const b = createTestHorse({ id: asHorseId("b"), raceHistory: [win(5)] });
    const rows = worldRankings([b, a], 10);
    expect(rows.map((r: { horseId: string }) => r.horseId)).toEqual(["a", "b"]);
    expect(rows[0].gradedWins).toBe(1);
  });
});
