import { describe, it, expect } from "vitest";
import {
  computePayoutSplits,
  sanitizeAndRankResults,
  detectPhotoFinish,
  type RankedResult,
} from "@/game/store/helpers/raceResolution";
import { PRIZE_SPLIT } from "@/constants";

// ---------------------------------------------------------------------------
// computePayoutSplits
// ---------------------------------------------------------------------------

describe("computePayoutSplits", () => {
  it("splits purse evenly when purse is divisible by PRIZE_SPLIT", () => {
    expect(computePayoutSplits(10000, 4)).toEqual([6000, 2500, 1000, 500]);
  });

  it("caps at PRIZE_SPLIT.length even when finisherCount exceeds it", () => {
    expect(computePayoutSplits(10000, 6)).toEqual([6000, 2500, 1000, 500]);
  });

  it("returns only finisherCount splits when fewer finishers than prizes", () => {
    expect(computePayoutSplits(10000, 2)).toEqual([6000, 2500]);
  });

  it("returns single split for one finisher", () => {
    expect(computePayoutSplits(10000, 1)).toEqual([6000]);
  });

  it("returns three splits for three finishers", () => {
    expect(computePayoutSplits(10000, 3)).toEqual([6000, 2500, 1000]);
  });

  it("redistributes remainder to last paid finisher when finisherCount >= PRIZE_SPLIT.length", () => {
    // 10009*0.6=6005.4→6005, *0.25=2502.25→2502, *0.1=1000.9→1001, *0.05=500.45→500
    // runningPaid=10008, remainder=1 routed to last → 501
    expect(computePayoutSplits(10009, 4)).toEqual([6005, 2502, 1001, 501]);
  });

  it("does not redistribute when runningPaid >= purse (rounding overshoots)", () => {
    // 9998*0.6=5998.8→5999, *0.25=2499.5→2500, *0.1=999.8→1000, *0.05=499.9→500
    // runningPaid=9999 > purse 9998, so no redistribution
    expect(computePayoutSplits(9998, 4)).toEqual([5999, 2500, 1000, 500]);
  });

  it("does not redistribute remainder when finisherCount < PRIZE_SPLIT.length", () => {
    // finisherCount=2 < 4, so guard fails even though runningPaid=8501 < 10009
    // Math.round(10009*0.6)=6005, Math.round(10009*0.25)=2502
    expect(computePayoutSplits(10009, 2)).toEqual([6005, 2502]);
  });

  it("does not redistribute remainder when finisherCount=3 < PRIZE_SPLIT.length", () => {
    // Math.round(10009*0.6)=6005, *0.25=2502, *0.1=1001
    expect(computePayoutSplits(10009, 3)).toEqual([6005, 2502, 1001]);
  });

  it("returns zeros for zero purse", () => {
    expect(computePayoutSplits(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("returns empty array for zero finishers", () => {
    expect(computePayoutSplits(10000, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sanitizeAndRankResults
// ---------------------------------------------------------------------------

describe("sanitizeAndRankResults", () => {
  it("sorts finishers by time ascending", () => {
    const raw = [
      { horseId: "h1", time: 70.5 },
      { horseId: "h2", time: 70.1 },
      { horseId: "h3", time: 70.3 },
    ];
    const { finishers } = sanitizeAndRankResults(raw, "race-1");
    expect(finishers.map((f) => f.horseId)).toEqual(["h2", "h3", "h1"]);
    expect(finishers.map((f) => f.position)).toEqual([1, 2, 3]);
  });

  it("marks all valid finishers as dnf=false", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: 70.2 },
    ];
    const { finishers } = sanitizeAndRankResults(raw, "race-1");
    expect(finishers.every((f) => f.dnf === false)).toBe(true);
  });

  it("detects Infinity time as DNF", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: Infinity },
    ];
    const { dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(dnfs).toHaveLength(1);
    expect(dnfs[0].horseId).toBe("h2");
    expect(dnfs[0].dnf).toBe(true);
  });

  it("detects NaN time as DNF", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: NaN },
    ];
    const { dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(dnfs).toHaveLength(1);
    expect(dnfs[0].horseId).toBe("h2");
  });

  it("detects zero time as DNF", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: 0 },
    ];
    const { dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(dnfs).toHaveLength(1);
    expect(dnfs[0].horseId).toBe("h2");
  });

  it("detects negative time as DNF", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: -1 },
    ];
    const { dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(dnfs).toHaveLength(1);
    expect(dnfs[0].horseId).toBe("h2");
  });

  it("does not mark Number.MAX_VALUE as DNF (finite and positive)", () => {
    const raw = [{ horseId: "h1", time: Number.MAX_VALUE }];
    const { finishers, dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(finishers).toHaveLength(1);
    expect(dnfs).toHaveLength(0);
  });

  it("assigns DNFs positions after all finishers", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: 70.2 },
      { horseId: "h3", time: 70.3 },
      { horseId: "h4", time: Infinity },
      { horseId: "h5", time: NaN },
    ];
    const { finishers, dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(finishers.map((f) => f.position)).toEqual([1, 2, 3]);
    expect(dnfs.map((d) => d.position)).toEqual([4, 5]);
  });

  it("handles all DNFs", () => {
    const raw = [
      { horseId: "h1", time: Infinity },
      { horseId: "h2", time: NaN },
      { horseId: "h3", time: 0 },
    ];
    const { finishers, dnfs, ranked } = sanitizeAndRankResults(raw, "race-1");
    expect(finishers).toHaveLength(0);
    expect(dnfs).toHaveLength(3);
    expect(dnfs.map((d) => d.position)).toEqual([1, 2, 3]);
    expect(ranked).toEqual(dnfs);
  });

  it("handles all finishers (no DNFs)", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: 70.2 },
    ];
    const { finishers, dnfs, ranked } = sanitizeAndRankResults(raw, "race-1");
    expect(dnfs).toHaveLength(0);
    expect(ranked).toEqual(finishers);
  });

  it("ranked is finishers concatenated with dnfs", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: Infinity },
    ];
    const { ranked, finishers, dnfs } = sanitizeAndRankResults(raw, "race-1");
    expect(ranked).toEqual([...finishers, ...dnfs]);
  });

  it("ranked length equals input length", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: 70.2 },
      { horseId: "h3", time: Infinity },
    ];
    const { ranked } = sanitizeAndRankResults(raw, "race-1");
    expect(ranked).toHaveLength(3);
  });

  it("each result has horseId, position, time, and dnf fields", () => {
    const raw = [
      { horseId: "h1", time: 70.1 },
      { horseId: "h2", time: Infinity },
    ];
    const { ranked } = sanitizeAndRankResults(raw, "race-1");
    for (const r of ranked) {
      expect(r).toHaveProperty("horseId");
      expect(r).toHaveProperty("position");
      expect(r).toHaveProperty("time");
      expect(r).toHaveProperty("dnf");
    }
  });

  it("breaks ties deterministically with same raceId", () => {
    const raw = [
      { horseId: "h1", time: 70.0 },
      { horseId: "h2", time: 70.0 },
    ];
    const result1 = sanitizeAndRankResults(raw, "race-1");
    const result2 = sanitizeAndRankResults(raw, "race-1");
    expect(result1.finishers.map((f) => f.horseId)).toEqual(
      result2.finishers.map((f) => f.horseId),
    );
  });

  it("breaks ties deterministically by horseId regardless of raceId", () => {
    const raw = [
      { horseId: "h1", time: 70.0 },
      { horseId: "h2", time: 70.0 },
    ];
    // With deterministic tie-breaking, all raceIds produce the same order
    const firstOrder = sanitizeAndRankResults(raw, "race-A").finishers.map((f) => f.horseId);
    for (let i = 0; i < 50; i++) {
      const order = sanitizeAndRankResults(raw, `race-${i}`).finishers.map((f) => f.horseId);
      expect(order).toEqual(firstOrder);
    }
    // h1 < h2 lexicographically
    expect(firstOrder).toEqual(["h1", "h2"]);
  });

  it("breaks three-way ties deterministically", () => {
    const raw = [
      { horseId: "h1", time: 70.0 },
      { horseId: "h2", time: 70.0 },
      { horseId: "h3", time: 70.0 },
    ];
    const result1 = sanitizeAndRankResults(raw, "race-tri");
    const result2 = sanitizeAndRankResults(raw, "race-tri");
    expect(result1.finishers.map((f) => f.horseId)).toEqual(
      result2.finishers.map((f) => f.horseId),
    );
  });

  it("handles empty input", () => {
    const { ranked, finishers, dnfs } = sanitizeAndRankResults([], "race-1");
    expect(ranked).toEqual([]);
    expect(finishers).toEqual([]);
    expect(dnfs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// detectPhotoFinish
// ---------------------------------------------------------------------------

describe("detectPhotoFinish", () => {
  function mkFinisher(horseId: string, position: number, time: number): RankedResult {
    return { horseId, position, time, dnf: false };
  }

  it("returns true when finishers are 0.03s apart", () => {
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 70.03)];
    expect(detectPhotoFinish(finishers)).toBe(true);
  });

  it("returns true when finishers are 0.049s apart (just under threshold)", () => {
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 70.049)];
    expect(detectPhotoFinish(finishers)).toBe(true);
  });

  it("returns true when finishers are 0.01s apart", () => {
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 70.01)];
    expect(detectPhotoFinish(finishers)).toBe(true);
  });

  it("returns true for mid-pack photo finish", () => {
    const finishers = [
      mkFinisher("h1", 1, 69.0),
      mkFinisher("h2", 2, 70.0),
      mkFinisher("h3", 3, 70.01),
      mkFinisher("h4", 4, 71.0),
    ];
    expect(detectPhotoFinish(finishers)).toBe(true);
  });

  it("returns true at 0.05s boundary due to floating-point representation", () => {
    // 70.05 - 70.0 = 0.04999999999999716 in IEEE 754, which is < 0.05
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 70.05)];
    expect(detectPhotoFinish(finishers)).toBe(true);
  });

  it("returns false when finishers are 1.0s apart", () => {
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 71.0)];
    expect(detectPhotoFinish(finishers)).toBe(false);
  });

  it("returns false when finishers are 0.06s apart", () => {
    const finishers = [mkFinisher("h1", 1, 70.0), mkFinisher("h2", 2, 70.06)];
    expect(detectPhotoFinish(finishers)).toBe(false);
  });

  it("returns false for single finisher", () => {
    const finishers = [mkFinisher("h1", 1, 70.0)];
    expect(detectPhotoFinish(finishers)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(detectPhotoFinish([])).toBe(false);
  });
});
