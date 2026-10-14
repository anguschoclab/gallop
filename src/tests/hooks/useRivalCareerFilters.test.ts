import { describe, it, expect } from "vitest";
import {
  filterAndSortRivalCandidates,
  hasActiveRivalCareerFilters,
  DEFAULT_RIVAL_CAREER_FILTERS,
  type RivalCareerCandidate,
  type RivalCareerSortKey,
} from "@/hooks/stable/useRivalCareerFilters";

function candidate(overrides: Partial<RivalCareerCandidate>): RivalCareerCandidate {
  return {
    id: "c",
    name: "Horse",
    age: 4,
    starts: 5,
    wins: 2,
    earnings: 100_000,
    fame: 30,
    stage: "prime",
    ...overrides,
  };
}

const base: RivalCareerCandidate[] = [
  candidate({
    id: "a",
    name: "Alpha",
    age: 3,
    wins: 1,
    starts: 4,
    earnings: 50_000,
    fame: 20,
    stage: "rising",
  }),
  candidate({
    id: "b",
    name: "Bravo",
    age: 6,
    wins: 8,
    starts: 22,
    earnings: 900_000,
    fame: 60,
    stage: "declining",
  }),
  candidate({
    id: "c",
    name: "Charlie",
    age: 8,
    wins: 3,
    starts: 30,
    earnings: 1_500_000,
    fame: 45,
    stage: "veteran",
  }),
];

describe("filterAndSortRivalCandidates", () => {
  it("passes everything through with default filters, sorted by fame", () => {
    const out = filterAndSortRivalCandidates(base, DEFAULT_RIVAL_CAREER_FILTERS);
    expect(out.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by career stage", () => {
    const out = filterAndSortRivalCandidates(base, {
      ...DEFAULT_RIVAL_CAREER_FILTERS,
      stage: "veteran",
    });
    expect(out.map((c) => c.id)).toEqual(["c"]);
  });

  it("filters by exact age and a 7yo+ floor", () => {
    const byAge = (age: string) =>
      filterAndSortRivalCandidates(base, { ...DEFAULT_RIVAL_CAREER_FILTERS, age }).map((c) => c.id);
    expect(byAge("3")).toEqual(["a"]);
    expect(byAge("7+")).toEqual(["c"]);
  });

  it("applies minimum wins, starts, earnings and fame together", () => {
    const out = filterAndSortRivalCandidates(base, {
      ...DEFAULT_RIVAL_CAREER_FILTERS,
      minWins: "2",
      minStarts: "5",
      minEarnings: "100000",
      minFame: "25",
    });
    expect(out.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("matches search case-insensitively", () => {
    const out = filterAndSortRivalCandidates(base, {
      ...DEFAULT_RIVAL_CAREER_FILTERS,
      search: "brav",
    });
    expect(out.map((c) => c.id)).toEqual(["b"]);
  });

  it("sorts by each numeric column and by name", () => {
    const sort = (key: RivalCareerSortKey) =>
      filterAndSortRivalCandidates(base, { ...DEFAULT_RIVAL_CAREER_FILTERS, sort: key }).map(
        (c) => c.id,
      );
    expect(sort("wins")).toEqual(["b", "c", "a"]);
    expect(sort("starts")).toEqual(["c", "b", "a"]);
    expect(sort("earnings")).toEqual(["c", "b", "a"]);
    expect(sort("age")).toEqual(["c", "b", "a"]);
    expect(sort("name")).toEqual(["a", "b", "c"]);
  });

  it("reports when non-default filters are active", () => {
    expect(hasActiveRivalCareerFilters(DEFAULT_RIVAL_CAREER_FILTERS)).toBe(false);
    expect(hasActiveRivalCareerFilters({ ...DEFAULT_RIVAL_CAREER_FILTERS, minWins: "3" })).toBe(
      true,
    );
  });
});
