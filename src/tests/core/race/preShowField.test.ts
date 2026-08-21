import { describe, it, expect } from "vitest";
import { buildPreShowField, type PreShowRunner } from "@/core/race/preShowField";

const runners: PreShowRunner[] = [
  { horseId: "a", name: "Long Shot", silk: "#111", ownership: { type: "unowned" } },
  { horseId: "b", name: "Favourite", silk: "#222", ownership: { type: "player" } },
  { horseId: "c", name: "Mid", silk: "#333", ownership: { type: "unowned" } },
];

const odds = new Map<string, string>([
  ["a", "20-1"],
  ["b", "2-1"],
  ["c", "6-1"],
]);

describe("buildPreShowField", () => {
  it("orders runners by morning-line favourite first", () => {
    const field = buildPreShowField(runners, odds);
    expect(field.map((r) => r.horseId)).toEqual(["b", "c", "a"]);
  });

  it("attaches each runner's odds label and flags the favourite", () => {
    const field = buildPreShowField(runners, odds);
    expect(field[0].oddsLabel).toBe("2-1");
    expect(field[0].isFavourite).toBe(true);
    expect(field[1].isFavourite).toBe(false);
  });

  it("is stable when odds are missing (keeps input order, blank label)", () => {
    const field = buildPreShowField(runners, new Map());
    expect(field.map((r) => r.horseId)).toEqual(["a", "b", "c"]);
    expect(field[0].oddsLabel).toBe("—");
    expect(field.some((r) => r.isFavourite)).toBe(false);
  });

  it("accepts a plain record as the odds shape", () => {
    const field = buildPreShowField(runners, { a: "20-1", b: "2-1", c: "6-1" });
    expect(field.map((r) => r.horseId)).toEqual(["b", "c", "a"]);
  });
});
