import { describe, it, expect } from "vitest";
import {
  savePreset,
  removePreset,
  parsePresets,
  describePreset,
  MAX_TRACK_FILTER_PRESETS,
} from "@/domains/history/model/trackFilterPresets";

const f = { fromDay: "10", toDay: "90", raceType: "G1", stableId: "s1" };

describe("track history filter presets", () => {
  it("saves a date range, race type and stable under a name", () => {
    const [p] = savePreset([], "Spring G1s", f, "Godolphin");
    expect(p).toMatchObject({ name: "Spring G1s", fromDay: "10", toDay: "90", raceType: "G1", stableId: "s1" });
    expect(describePreset(p)).toBe("Days 10–90 · G1 · Godolphin");
  });

  it("replaces a preset saved again under the same name", () => {
    const one = savePreset([], "Mine", f);
    const two = savePreset(one, "mine", { ...f, raceType: "all" });
    expect(two).toHaveLength(1);
    expect(two[0].raceType).toBe("all");
  });

  it("keeps at most 12 presets and can delete one", () => {
    let list = [] as ReturnType<typeof savePreset>;
    for (let i = 0; i < 15; i++) list = savePreset(list, `P${i}`, f);
    expect(MAX_TRACK_FILTER_PRESETS).toBe(12);
    expect(list).toHaveLength(12);
    expect(removePreset(list, list[0].id)).toHaveLength(11);
  });

  it("ignores malformed stored data", () => {
    expect(parsePresets("not json")).toEqual([]);
    expect(parsePresets(JSON.stringify([{ id: 1 }]))).toEqual([]);
  });
});
