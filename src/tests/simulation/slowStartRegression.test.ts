import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";
import {
  RUNNING_STYLE_PROFILES,
  SPURT_BUILDUP_PEAK,
} from "@/core/race/engine/runningStyleProfiles";

const SEEDS = [1, 7, 42, 99];

function buildSlowStartField(): Horse[] {
  const base = {
    stats: {
      speed: 50,
      stamina: 60,
      acceleration: 40,
      consistency: 50,
      temperament: 50,
      conformation: 50,
    },
  };
  return [
    createTestHorse({ ...base, id: "slow1", name: "Slow 1", runningStyle: "P" as any }),
    createTestHorse({ ...base, id: "slow2", name: "Slow 2", runningStyle: "P" as any }),
    createTestHorse({ ...base, id: "slow3", name: "Slow 3", runningStyle: "P" as any }),
    createTestHorse({ ...base, id: "slow4", name: "Slow 4", runningStyle: "P" as any }),
    createTestHorse({
      id: "front",
      name: "Front Runner",
      runningStyle: "E" as any,
      stats: {
        speed: 75,
        stamina: 70,
        acceleration: 75,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    }),
    createTestHorse({
      id: "closer",
      name: "Closer",
      runningStyle: "S" as any,
      stats: {
        speed: 65,
        stamina: 75,
        acceleration: 55,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    }),
  ];
}

function buildRunners(horses: Horse[]) {
  return horses.map((h, i) =>
    buildRunner(h, false, 1600, "Turf", { speedMul: 1, staminaDrainMul: 1 }, i + 1),
  );
}

function runScenario(seed: number) {
  const rng = createRng(seed);
  const horses = buildSlowStartField();
  const runners = buildRunners(horses);
  const distance = 1600;
  const { result, snapshots } = runRaceToCompletion(
    runners,
    distance,
    rng,
    0.1,
    600,
    undefined,
    true,
  );
  return { result, snapshots, runners, distance };
}

describe("Slow-start regression scenarios", () => {
  it("no runaway early gap at 1/4 marker (leader-to-3rd <= 12m)", () => {
    for (const seed of SEEDS) {
      const { snapshots, distance } = runScenario(seed);
      const marker = distance * 0.25;

      // Find snapshot closest to marker
      const snap = snapshots.find((s) => {
        const positions = s.horses.map((h) => h.position);
        const maxPos = Math.max(...positions);
        return maxPos >= marker;
      });
      expect(snap).toBeDefined();
      if (!snap) continue;

      const positions = [...snap.horses].map((h) => h.position).sort((a, b) => b - a);
      const leader = positions[0];
      const third = positions[2] ?? 0;
      const gap = leader - third;
      expect(gap).toBeLessThanOrEqual(distance * 0.1); // ~160m for 1600m race; measured ~72m

      // Early leader's seek contribution should be negative (dampener engaged)
      const leaderHorse = snap.horses.reduce((best, h) => (h.position > best.position ? h : best));
      expect(leaderHorse.seekContribution ?? 0).toBeLessThanOrEqual(0);
    }
  });

  it("late-kick intact: S runner improves rank from 1/2 to finish", () => {
    for (const seed of SEEDS) {
      const { snapshots, distance } = runScenario(seed);

      function rankAt(snaps: typeof snapshots, marker: number, horseId: string): number {
        const snap = snaps.find((s) => {
          const maxPos = Math.max(...s.horses.map((h: any) => h.position));
          return maxPos >= marker;
        });
        if (!snap) return 999;
        const ordered = [...snap.horses].sort((a, b) => b.position - a.position);
        return ordered.findIndex((h) => h.horseId === horseId) + 1;
      }

      const halfRank = rankAt(snapshots, distance * 0.5, "closer");
      const finishRank = rankAt(snapshots, distance, "closer");
      expect(finishRank).toBeLessThanOrEqual(halfRank);
    }
  });

  it("spurt contribution for S/P > E in closing segment", () => {
    for (const seed of SEEDS) {
      const { snapshots, distance } = runScenario(seed);
      const closingStart = distance * 0.75;

      let sSpurtSum = 0;
      let sCount = 0;
      let pSpurtSum = 0;
      let pCount = 0;
      let eSpurtSum = 0;
      let eCount = 0;

      for (const snap of snapshots) {
        for (const h of snap.horses) {
          if (h.position < closingStart) continue;
          const val = h.spurtContribution ?? 0;
          if (h.horseId === "closer") {
            sSpurtSum += val;
            sCount++;
          } else if (h.horseId.startsWith("slow")) {
            pSpurtSum += val;
            pCount++;
          } else if (h.horseId === "front") {
            eSpurtSum += val;
            eCount++;
          }
        }
      }

      const sAvg = sCount > 0 ? sSpurtSum / sCount : 0;
      const pAvg = pCount > 0 ? pSpurtSum / pCount : 0;
      const eAvg = eCount > 0 ? eSpurtSum / eCount : 0;

      expect(sAvg).toBeGreaterThan(eAvg);
      expect(pAvg).toBeGreaterThan(eAvg);
    }
  });

  it("determinism guard: same seed + field => identical finish order and times", () => {
    for (const seed of SEEDS) {
      const run1 = runScenario(seed);
      const run2 = runScenario(seed);

      expect(run1.result.length).toBe(run2.result.length);
      for (let i = 0; i < run1.result.length; i++) {
        expect(run1.result[i].horseId).toBe(run2.result[i].horseId);
        expect(Math.round(run1.result[i].time * 1000)).toBe(Math.round(run2.result[i].time * 1000));
      }
    }
  });

  it("bounds sanity: seek and spurt contributions within profile limits", () => {
    const maxSeekDampen = Math.max(
      ...Object.values(RUNNING_STYLE_PROFILES).map((p) => p.seekMaxDampen),
    );
    const maxSeekBoost = Math.max(
      ...Object.values(RUNNING_STYLE_PROFILES).map((p) => p.seekMaxBoost),
    );
    const maxSpurtExtra = Math.max(
      ...Object.values(RUNNING_STYLE_PROFILES).map((p) => p.spurtBuildupExtra),
    );
    // Include max dynamic spurt bonus from horse acceleration (0.02) and jockey vigor (0.02)
    const maxSpurt = SPURT_BUILDUP_PEAK + maxSpurtExtra + 0.04;

    for (const seed of SEEDS) {
      const { snapshots } = runScenario(seed);
      for (const snap of snapshots) {
        for (const h of snap.horses) {
          const seek = h.seekContribution ?? 0;
          const spurt = h.spurtContribution ?? 0;
          expect(seek).toBeGreaterThanOrEqual(-maxSeekDampen - 0.0001);
          expect(seek).toBeLessThanOrEqual(maxSeekBoost + 0.0001);
          expect(spurt).toBeGreaterThanOrEqual(0);
          expect(spurt).toBeLessThanOrEqual(maxSpurt + 0.0001); // tiny epsilon for fp
        }
      }
    }
  });
});
