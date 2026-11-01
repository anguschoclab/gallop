import { describe, it, expect } from "vitest";
import {
  filterRivalMilestones,
  type RivalMilestoneRecord,
} from "@/domains/agents/simulation/npc/rivalCareerCompare";

const m = (key: string, kind: RivalMilestoneRecord["kind"], stage: RivalMilestoneRecord["stage"]) =>
  ({ key, kind, title: key, day: stage ? 10 : null, announced: false, stage }) as RivalMilestoneRecord;

const list = [
  m("a", "debut", "juvenile"),
  m("b", "breakthrough_win", "prime"),
  m("c", "earnings", "prime"),
  m("d", "retirement", "retired"),
  m("e", "earnings", null),
];

describe("rival milestone timeline filters", () => {
  it("keeps everything when no filter is chosen", () => {
    expect(filterRivalMilestones(list, { kinds: [], stages: [] })).toHaveLength(5);
  });
  it("keeps only chosen milestone types", () => {
    expect(filterRivalMilestones(list, { kinds: ["earnings"], stages: [] }).map((x) => x.key)).toEqual(["c", "e"]);
  });
  it("keeps only milestones from chosen career stages, dropping undated ones", () => {
    expect(filterRivalMilestones(list, { kinds: [], stages: ["prime"] }).map((x) => x.key)).toEqual(["b", "c"]);
  });
  it("combines type and stage", () => {
    expect(
      filterRivalMilestones(list, { kinds: ["breakthrough_win"], stages: ["prime"] }).map((x) => x.key),
    ).toEqual(["b"]);
  });
});
