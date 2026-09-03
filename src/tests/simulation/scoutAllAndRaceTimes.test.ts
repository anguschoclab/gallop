/**
 * scoutAllAndRaceTimes.test.ts - World-wide scouting reveal + race preview time parity
 *
 * Builds a full world, "scouts" every NPC stable (fame at the full-visibility
 * threshold) and asserts the revealed stats are the horses' real stats. Then it
 * runs a race headlessly and confirms the race-preview time views (final,
 * per-km, per-mile, drop-minute) are consistent with the finishing time and
 * race distance.
 */

import { describe, it, expect } from "vitest";
import { createInitialState } from "@/game/store/initialization";
import { getDisplayableStats, getVisibleStats } from "@/core/npc/scouting";
import { ensurePhenotypeResolved } from "@/core/horse/phenotype";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { bestPerMileByHorse } from "@/core/race/bestPace";
import { buildRaceTimeViews, pacePerKm, pacePerMile } from "@/core/common/formatting";
import { createRng } from "@/core/common/rng";
import { isNpcOwned } from "@/core/horse/ownership";
import type { Horse } from "@/game/types";

const STAT_KEYS = ["speed", "stamina", "acceleration", "consistency"] as const;

describe("scouting every NPC stable reveals real stats", () => {
  const state = createInitialState();
  const npcHorses = state.horses.filter(isNpcOwned).map(ensurePhenotypeResolved);

  it("covers every NPC stable in the generated world", () => {
    expect(state.npcStables.length).toBeGreaterThan(40);
    const stablesWithHorses = new Set(
      npcHorses
        .map((h) => (h.ownership.type === "npc" ? h.ownership.stableId : undefined))
        .filter(Boolean) as string[],
    );
    // Every stable that owns horses is scoutable.
    expect(stablesWithHorses.size).toBeGreaterThan(20);
  });

  it("reveals exact stats for every horse once fame clears the full-visibility threshold", () => {
    let checked = 0;
    for (const horse of npcHorses) {
      const famous: Horse = { ...horse, fame: 70 };
      expect(getVisibleStats(famous)).toEqual([...STAT_KEYS]);
      const shown = getDisplayableStats(famous, [], 1);
      expect(shown.confidence).toBe("full");
      for (const key of STAT_KEYS) {
        expect(shown.stats[key]).toBe(famous.stats[key]);
      }
      checked += 1;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("keeps sub-threshold horses partially hidden", () => {
    const horse = { ...npcHorses[0], fame: 10 };
    expect(getVisibleStats(horse).length).toBe(1);
    expect(getDisplayableStats(horse, [], 1).confidence).toBe("unknown");
  });
});

describe("race preview times match the run", () => {
  it("derives consistent per-km / per-mile / drop-minute views from the finish time", () => {
    const state = createInitialState();
    const field = state.horses
      .filter(isNpcOwned)
      .map(ensurePhenotypeResolved)
      .filter((h) => h.lifecycleStatus !== "deceased")
      .slice(0, 8);
    expect(field.length).toBe(8);

    const distance = 1600;
    const rng = createRng(4242);
    const runners = field.map((horse, i) =>
      buildRunner(horse, i + 1, distance, "Turf", "Good", rng),
    );
    const { result } = runRaceToCompletion(runners, distance, rng);

    expect(result.length).toBe(field.length);
    for (const res of result) {
      expect(res.time).toBeGreaterThan(0);
      const views = buildRaceTimeViews(res.time, distance);
      expect(views.length).toBe(5);
      // per-km and per-mile views must agree with the raw arithmetic
      expect(pacePerKm(res.time, distance)).toBeCloseTo(res.time / (distance / 1000), 5);
      expect(pacePerMile(res.time, distance)).toBeCloseTo(res.time / (distance / 1609.344), 5);
    }

    // Winner is fastest; times are strictly ordered by position.
    const sorted = [...result].sort((a, b) => a.position - b.position);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].time).toBeGreaterThanOrEqual(sorted[i - 1].time);
    }

    // The preview's "best per mile" figure reproduces the same run.
    const race = {
      ...state.races[0],
      distance,
      result: result.map((r) => ({ ...r })),
    } as (typeof state.races)[number];
    const best = bestPerMileByHorse([race]);
    const winner = sorted[0];
    const bestForWinner = best.get(winner.horseId);
    expect(bestForWinner).toBeDefined();
    expect(bestForWinner!.seconds).toBe(winner.time);
    expect(bestForWinner!.distance).toBe(distance);
    expect(bestForWinner!.perMile).toBeCloseTo(pacePerMile(winner.time, distance), 5);
  });
});
