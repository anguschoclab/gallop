import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLeaderboardState } from "@/hooks/race/useLeaderboardState";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";

const race = { id: "r1", distance: 1600 } as Race;

function runner(horseId: string, position: number): Runner {
  return {
    horseId,
    name: horseId,
    position,
    velocity: 16,
    finishTime: null,
    owned: false,
    lane: 1,
  } as Runner;
}

describe("useLeaderboardState live updates", () => {
  it("re-derives the order when runners mutate in place and the tick advances", () => {
    const runners = [runner("a", 100), runner("b", 50)];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    expect(result.current.positionRank.get("a")).toBe(1);

    // Physics loop mutates the same objects: b overtakes a.
    runners[0].position = 200;
    runners[1].position = 400;
    rerender({ tick: 1 });

    expect(result.current.positionRank.get("b")).toBe(1);
    expect(result.current.sorted[0].r.horseId).toBe("b");
  });

  it("updates lastUpdatedAt when the tick advances", () => {
    const runners = [runner("a", 100)];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const before = result.current.lastUpdatedAt;
    rerender({ tick: 1 });
    expect(result.current.lastUpdatedAt).toBeGreaterThanOrEqual(before);
  });
});
