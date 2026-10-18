import { describe, it, expect } from "vitest";

describe("RaceReplay type reconciliation", () => {
  it("replayTypes.ts exports a checkpoint-based RaceReplay (legacy)", async () => {
    const mod = await import("@/domains/replays/model/replayTypes?raw");
    const source = mod.default as string;
    expect(source).toContain("export interface RaceReplay");
    expect(source).toContain("checkpoints");
  });

  it("raceSnapshotTypes.ts exports a snapshot-based RaceReplay (used by engine)", async () => {
    const mod = await import("@/domains/race/model/engine/raceSnapshotTypes?raw");
    const source = mod.default as string;
    expect(source).toContain("export interface RaceReplay");
    expect(source).toContain("snapshots");
  });

  it("ReplayPlayer should import from raceSnapshotTypes, not replayTypes", async () => {
    const mod = await import("@/domains/race/ui/ReplayPlayer?raw");
    const source = mod.default as string;
    // After reconciliation, ReplayPlayer should NOT import the checkpoint-based type
    expect(source).not.toContain('from "@/core/replays/replayTypes"');
  });
});
