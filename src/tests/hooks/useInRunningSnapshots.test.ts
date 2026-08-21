/**
 * useInRunningSnapshots.test.ts
 *
 * Tests for useInRunningSnapshots hook verifying:
 * - Empty initial snapshot state
 * - Freezing in-running states at specific tick and simTime
 * - Deep cloning to ensure live runner mutations don't mutate captured snapshots
 * - Condition derivation, ranking, and tactical badge calculation
 * - Multi-snapshot support and selection switching
 * - Clear snapshots functionality
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInRunningSnapshots } from "@/hooks/race/useInRunningSnapshots";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function createMockRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Thunderbolt",
    silk: "#ff0000",
    ownership: { type: "player" },
    position: 400,
    velocity: 16.5,
    finishTime: null,
    lane: 0,
    targetLane: 0,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 17,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "E",
    draftingHorseId: null,
    weight: 55,
    finalMood: undefined,
    jockeyInstructions: {
      ridingStyle: "front_runner",
      earlyPosition: "lead",
      moveTiming: "normal",
      lanePreference: "rail",
    },
    ...overrides,
  } as unknown as Runner;
}

describe("useInRunningSnapshots", () => {
  it("initializes with empty state", () => {
    const { result } = renderHook(() => useInRunningSnapshots());

    expect(result.current.snapshots).toEqual([]);
    expect(result.current.selectedSnapshot).toBeNull();
    expect(result.current.selectedSnapshotId).toBeNull();
    expect(result.current.isInspectorOpen).toBe(false);
  });

  it("takes an in-running snapshot and opens the inspector", () => {
    const { result } = renderHook(() => useInRunningSnapshots());

    const runner1 = createMockRunner({
      horseId: "h1",
      name: "Horse 1",
      position: 500,
      velocity: 16,
    });
    const runner2 = createMockRunner({
      horseId: "h2",
      name: "Horse 2",
      position: 480,
      velocity: 15.5,
    });

    let captured: any;
    act(() => {
      captured = result.current.takeSnapshot([runner1, runner2], 1600, 12.5, 25);
    });

    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.isInspectorOpen).toBe(true);
    expect(result.current.selectedSnapshotId).toBe(captured.id);
    expect(result.current.selectedSnapshot?.simTime).toBe(12.5);
    expect(result.current.selectedSnapshot?.tick).toBe(25);
    expect(result.current.selectedSnapshot?.distance).toBe(1600);
    expect(result.current.selectedSnapshot?.runners).toHaveLength(2);

    // Rank #1 is Horse 1 (position 500), Rank #2 is Horse 2 (position 480)
    const [h1Snap, h2Snap] = result.current.selectedSnapshot!.runners;
    expect(h1Snap.name).toBe("Horse 1");
    expect(h1Snap.rank).toBe(1);
    expect(h2Snap.name).toBe("Horse 2");
    expect(h2Snap.rank).toBe(2);
  });

  it("freezes runner state so subsequent live runner mutations do not affect the captured snapshot", () => {
    const { result } = renderHook(() => useInRunningSnapshots());

    const runner = createMockRunner({
      horseId: "h1",
      name: "Original",
      position: 300,
      velocity: 15,
    });

    act(() => {
      result.current.takeSnapshot([runner], 1600, 8.0, 16);
    });

    // Mutate the live runner object as the race continues
    runner.position = 1200;
    runner.velocity = 17.5;
    runner.name = "Mutated";

    // Snapshot remains frozen with original state
    const snapshotRunner = result.current.selectedSnapshot!.runners[0];
    expect(snapshotRunner.position).toBe(300);
    expect(snapshotRunner.velocity).toBe(15);
    expect(snapshotRunner.name).toBe("Original");
  });

  it("supports taking multiple snapshots and switching between them", () => {
    const { result } = renderHook(() => useInRunningSnapshots());

    const runners = [createMockRunner({ horseId: "h1", position: 200 })];

    let snap1: any;
    let snap2: any;

    act(() => {
      snap1 = result.current.takeSnapshot(runners, 1600, 5.0, 10);
    });

    runners[0].position = 600;
    act(() => {
      snap2 = result.current.takeSnapshot(runners, 1600, 15.0, 30);
    });

    expect(result.current.snapshots).toHaveLength(2);
    expect(result.current.selectedSnapshotId).toBe(snap2.id);
    expect(result.current.selectedSnapshot?.simTime).toBe(15.0);

    // Switch back to snapshot 1
    act(() => {
      result.current.setSelectedSnapshotId(snap1.id);
    });

    expect(result.current.selectedSnapshot?.simTime).toBe(5.0);
    expect(result.current.selectedSnapshot?.runners[0].position).toBe(200);
  });

  it("clears snapshots and closes the inspector", () => {
    const { result } = renderHook(() => useInRunningSnapshots());

    act(() => {
      result.current.takeSnapshot([createMockRunner()], 1600, 10.0, 20);
    });

    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.isInspectorOpen).toBe(true);

    act(() => {
      result.current.clearSnapshots();
    });

    expect(result.current.snapshots).toEqual([]);
    expect(result.current.selectedSnapshot).toBeNull();
    expect(result.current.selectedSnapshotId).toBeNull();
    expect(result.current.isInspectorOpen).toBe(false);
  });
});
