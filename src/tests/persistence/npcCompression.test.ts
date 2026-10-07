/**
 * npcCompression.test.ts — Tests for NPC horse compression and regeneration.
 */

import { describe, it, expect } from "vitest";
import {
  compressNpcHorses,
  regenerateNpcHorses,
  splitHorsesForPersistence,
  mergeHorses,
} from "@/core/persistence/npcCompression";
import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import { makeNpcOwned, makePlayerOwned, getStableId } from "@/core/horse/ownership";
import { asNpcStableId, asStableId } from "@/core/types/branded";
import { generateNpcHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { createRng, hashStr } from "@/core/common/rng";
import { detectRivalMilestones } from "@/core/npc/careerMilestones";
import { isDueForOffscreenStart, lastStartDay, summarizeNpcCareer } from "@/core/npc/careerTracker";

function makeTestStable(): Stable {
  return {
    id: asStableId("stable-test-1"),
    name: "Test Stables",
    owner: "Test Owner",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: [],
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    personality: "conservative",
    staff: {
      trainer: null,
      veterinarian: null,
      farrier: null,
      nutritionist: null,
      groom: null,
    },
    outposts: [],
  };
}

function makeNpcHorses(stable: Stable, count: number): Horse[] {
  const rng = createRng(hashStr("test_npc_horses"));
  const horses: Horse[] = [];
  for (let i = 0; i < count; i++) {
    const horse = generateNpcHorse(stable, rng, undefined, undefined, {
      forcedAge: 3 + (i % 4),
      forcedName: `TestHorse-${i}`,
    });
    horse.fame = 10 + i;
    horse.lifetimeEarnings = i * 1000;
    horse.careerStarts = i;
    horse.careerWins = Math.floor(i / 2);
    horses.push(horse);
  }
  return horses;
}

function makePlayerHorse(): Horse {
  const rng = createRng(hashStr("test_player_horse"));
  const horse = generateNpcHorse(
    {
      ...makeTestStable(),
      id: asStableId("player-stable"),
    },
    rng,
    undefined,
    undefined,
    { forcedAge: 4, forcedName: "PlayerHorse" },
  );
  horse.ownership = makePlayerOwned();
  return horse;
}

describe("compressNpcHorses", () => {
  it("produces one summary per NPC horse", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 5);
    const horses: Record<string, Horse> = {};
    for (const h of npcHorses) horses[h.id] = h;

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries).toHaveLength(5);
  });

  it("drops genotype/phenotype fields and keeps identity", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries).toHaveLength(1);

    const s = summaries[0];
    expect(s.id).toBe(npcHorses[0].id);
    expect(s.name).toBe(npcHorses[0].name);
    expect(s.age).toBe(npcHorses[0].age);
    expect(s.gender).toBe(npcHorses[0].gender);
    expect(s.stableId).toBe(stable.id);
    expect(s.tier).toBe(stable.tier);
    expect(s.fame).toBe(npcHorses[0].fame);
    expect(s.lifetimeEarnings).toBe(npcHorses[0].lifetimeEarnings);

    // Summary should not have genotype/stats fields
    expect((s as any).genotype).toBeUndefined();
    expect((s as any).stats).toBeUndefined();
    expect((s as any).pedigree).toBeUndefined();
  });

  it("skips player-owned horses (no stableId)", () => {
    const stable = makeTestStable();
    const playerHorse = makePlayerHorse();
    const npcHorses = makeNpcHorses(stable, 3);
    const horses: Record<string, Horse> = {};
    horses[playerHorse.id] = playerHorse;
    for (const h of npcHorses) horses[h.id] = h;

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries).toHaveLength(3);
    expect(summaries.find((s) => s.id === playerHorse.id)).toBeUndefined();
  });

  it("skips horse with stableId not in stables list", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    // Change the horse's stableId to one not in the stables list
    npcHorses[0].ownership = makeNpcOwned(asNpcStableId("nonexistent_stable"));
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries).toHaveLength(0);
  });

  it("handles empty horses record", () => {
    const stable = makeTestStable();
    const summaries = compressNpcHorses([stable], {});
    expect(summaries).toEqual([]);
  });

  it("captures isFamousStallion when fame >= 80", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    npcHorses[0].fame = 85;
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries[0].isFamousStallion).toBe(true);
  });
});

describe("regenerateNpcHorses", () => {
  it("returns same IDs and names as the originals", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 5);
    const horses: Record<string, Horse> = {};
    for (const h of npcHorses) horses[h.id] = h;

    const summaries = compressNpcHorses([stable], horses);
    const regenerated = regenerateNpcHorses(summaries, [stable]);

    expect(regenerated).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const orig = npcHorses[i];
      const regen = regenerated.find((h) => h.id === orig.id);
      expect(regen).toBeDefined();
      expect(regen!.name).toBe(orig.name);
      expect(regen!.age).toBe(orig.age);
      expect(regen!.gender).toBe(orig.gender);
      expect(getStableId(regen)).toBe(stable.id);
    }
  });

  it("produces valid Horse objects with resolved phenotypes", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 2);
    const horses: Record<string, Horse> = {};
    for (const h of npcHorses) horses[h.id] = h;

    const summaries = compressNpcHorses([stable], horses);
    const regenerated = regenerateNpcHorses(summaries, [stable]);

    for (const horse of regenerated) {
      expect(horse.id).toBeDefined();
      expect(horse.genotype).toBeDefined();
      const resolved = ensurePhenotypeResolved(horse);
      expect(resolved.stats).toBeDefined();
      expect(resolved.phenotypeResolved).toBe(true);
    }
  });

  it("restores career stats from summary", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    const regenerated = regenerateNpcHorses(summaries, [stable]);

    expect(regenerated[0].fame).toBe(npcHorses[0].fame);
    expect(regenerated[0].lifetimeEarnings).toBe(npcHorses[0].lifetimeEarnings);
    expect(regenerated[0].careerStarts).toBe(npcHorses[0].careerStarts);
    expect(regenerated[0].careerWins).toBe(npcHorses[0].careerWins);
  });

  it("skips summary with unknown stableId", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 2);
    const horses: Record<string, Horse> = {};
    for (const h of npcHorses) horses[h.id] = h;

    const summaries = compressNpcHorses([stable], horses);
    // Corrupt one summary's stableId
    summaries[0].stableId = asNpcStableId("nonexistent_stable");

    const regenerated = regenerateNpcHorses(summaries, [stable]);
    // Only the one with valid stableId should be regenerated
    expect(regenerated).toHaveLength(1);
    expect(regenerated[0].id).toBe(npcHorses[1].id);
  });

  it("restores stud career for atStud summary", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    npcHorses[0].lifecycleStatus = "retired";
    npcHorses[0].retiredOnDay = 100;
    npcHorses[0].stud = {
      atStud: true,
      standingFee: 5000,
      bookSize: 40,
      seasonBookings: 0,
      lifetimeFoals: 10,
      lifetimeStakesFoals: 2,
      lifetimeG1Foals: 1,
      retiredOnDay: 100,
    } as any;
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries[0].atStud).toBe(true);
    expect(summaries[0].standingFee).toBe(5000);

    const regenerated = regenerateNpcHorses(summaries, [stable]);
    expect(regenerated[0].stud).toBeDefined();
    expect(regenerated[0].stud!.atStud).toBe(true);
    expect(regenerated[0].stud!.standingFee).toBe(5000);
  });

  it("marks deceased horses correctly", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    npcHorses[0].lifecycleStatus = "deceased";
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const summaries = compressNpcHorses([stable], horses);
    expect(summaries[0].deceased).toBe(true);
    expect(summaries[0].lifecycleStatus).toBe("deceased");

    const regenerated = regenerateNpcHorses(summaries, [stable]);
    expect(regenerated[0].lifecycleStatus).toBe("deceased");
  });
});

describe("career continuity persistence", () => {
  it("round-trips race history, tracker, milestones and mutable runtime state", () => {
    const stable = makeTestStable();
    const npc = makeNpcHorses(stable, 1)[0];
    npc.raceHistory = [
      {
        raceId: "off-1",
        raceName: "Allowance Optional",
        position: 1,
        day: 100,
        purseEarned: 36000,
        offscreen: true,
      },
      {
        raceId: "real-1",
        raceName: "Derby",
        position: 3,
        day: 200,
        purseEarned: 50000,
        grade: "G1",
      },
    ];
    npc.careerTracker = {
      lastOffscreenDay: 100,
      offscreenStarts: 1,
      offscreenWins: 1,
      offscreenEarnings: 36000,
      stage: "rising",
    };
    npc.careerMilestonesAnnounced = ["debut", "earnings_250000"];
    npc.courseVisits = { "track-a": 3 };
    npc.hemisphere = "Southern";
    npc.gelded = true;
    npc.foalsProduced = ["f1", "f2"];
    npc.distanceAptitude = 2200;
    npc.surfaceAptitude = { Turf: 2, Dirt: 0, Synthetic: -1 };
    npc.consignedSaleId = "sale-1";
    npc.activeInjury = { type: "Sprain", severity: "minor", recoveryDays: 5, onsetDay: 250 };
    npc.lastBeyer = 88;
    npc.lastRaceDay = 200;

    const summaries = compressNpcHorses([stable], { [npc.id]: npc });
    const [regen] = regenerateNpcHorses(summaries, [stable]);

    expect(regen.raceHistory).toEqual(npc.raceHistory);
    expect(regen.careerTracker).toEqual(npc.careerTracker);
    expect(regen.careerMilestonesAnnounced).toEqual(["debut", "earnings_250000"]);
    expect(regen.courseVisits).toEqual({ "track-a": 3 });
    expect(regen.hemisphere).toBe("Southern");
    expect(regen.gelded).toBe(true);
    expect(regen.foalsProduced).toEqual(["f1", "f2"]);
    expect(regen.distanceAptitude).toBe(2200);
    expect(regen.surfaceAptitude).toEqual({ Turf: 2, Dirt: 0, Synthetic: -1 });
    expect(regen.consignedSaleId).toBe("sale-1");
    expect(regen.activeInjury).toEqual({
      type: "Sprain",
      severity: "minor",
      recoveryDays: 5,
      onsetDay: 250,
    });
    expect(regen.lastBeyer).toBe(88);
    expect(regen.lastRaceDay).toBe(200);
  });

  it("restores stud counters instead of zeroed defaults", () => {
    const stable = makeTestStable();
    const npc = makeNpcHorses(stable, 1)[0];
    npc.lifecycleStatus = "retired";
    npc.retiredOnDay = 100;
    npc.stud = {
      atStud: true,
      standingFee: 5000,
      bookSize: 40,
      seasonBookings: 12,
      lifetimeFoals: 30,
      lifetimeStakesFoals: 4,
      lifetimeG1Foals: 1,
      retiredOnDay: 100,
    };

    const summaries = compressNpcHorses([stable], { [npc.id]: npc });
    const [regen] = regenerateNpcHorses(summaries, [stable]);

    expect(regen.stud).toMatchObject({
      atStud: true,
      standingFee: 5000,
      seasonBookings: 12,
      lifetimeFoals: 30,
      lifetimeStakesFoals: 4,
      lifetimeG1Foals: 1,
    });
  });

  it("does not re-announce milestones after a save/load round-trip", () => {
    const stable = makeTestStable();
    const npc = makeNpcHorses(stable, 1)[0];
    npc.fame = 50;
    npc.age = 6;
    npc.peakAge = 4;
    npc.lifetimeEarnings = 300_000;
    npc.raceHistory = [
      {
        raceId: "off-1",
        raceName: "Provincial Stakes",
        position: 1,
        day: 100,
        purseEarned: 300_000,
        grade: "G3",
        offscreen: true,
      },
    ];
    npc.careerMilestonesAnnounced = detectRivalMilestones(npc, []).map((m) => m.key);

    const summaries = compressNpcHorses([stable], { [npc.id]: npc });
    const [regen] = regenerateNpcHorses(summaries, [stable]);

    expect(detectRivalMilestones(regen, regen.careerMilestonesAnnounced ?? [])).toEqual([]);
  });

  it("keeps the offscreen start cooldown after a save/load round-trip", () => {
    const stable = makeTestStable();
    const npc = makeNpcHorses(stable, 1)[0];
    npc.age = 4;
    npc.raceHistory = [
      {
        raceId: "off-1",
        raceName: "Allowance",
        position: 2,
        day: 98,
        purseEarned: 5000,
        offscreen: true,
      },
    ];
    npc.careerTracker = {
      lastOffscreenDay: 98,
      offscreenStarts: 1,
      offscreenWins: 0,
      offscreenEarnings: 5000,
      stage: "rising",
    };

    const summaries = compressNpcHorses([stable], { [npc.id]: npc });
    const [regen] = regenerateNpcHorses(summaries, [stable]);

    // The last start must be recoverable so the cooldown continues — no
    // post-reload burst of offscreen starts.
    expect(lastStartDay(regen)).toBe(98);
    expect(isDueForOffscreenStart(regen, 100, "mid", createRng(1))).toBe(false);
  });

  it("reports the same career summary after a save/load round-trip", () => {
    const stable = makeTestStable();
    const npc = makeNpcHorses(stable, 1)[0];
    npc.raceHistory = [
      { raceId: "r1", raceName: "A", position: 1, day: 50, purseEarned: 10_000 },
      {
        raceId: "r2",
        raceName: "B",
        position: 2,
        day: 80,
        purseEarned: 5_000,
        offscreen: true,
      },
    ];
    npc.careerTracker = {
      lastOffscreenDay: 80,
      offscreenStarts: 1,
      offscreenWins: 0,
      offscreenEarnings: 5_000,
      stage: "rising",
    };

    const before = summarizeNpcCareer(npc, 100);
    const summaries = compressNpcHorses([stable], { [npc.id]: npc });
    const [regen] = regenerateNpcHorses(summaries, [stable]);
    const after = summarizeNpcCareer(regen, 100);

    expect(after).toEqual(before);
  });
});

describe("splitHorsesForPersistence", () => {
  it("separates player and NPC horses", () => {
    const stable = makeTestStable();
    const playerHorse = makePlayerHorse();
    const npcHorses = makeNpcHorses(stable, 3);
    const horses: Record<string, Horse> = {};
    horses[playerHorse.id] = playerHorse;
    for (const h of npcHorses) horses[h.id] = h;

    const { playerHorses, npcSummaries } = splitHorsesForPersistence([stable], horses);

    expect(Object.keys(playerHorses)).toHaveLength(1);
    expect(playerHorses[playerHorse.id]).toBeDefined();
    expect(npcSummaries).toHaveLength(3);
  });

  it("horse with stableId not in stables list is treated as player horse", () => {
    const stable = makeTestStable();
    const npcHorses = makeNpcHorses(stable, 1);
    // Set stableId to one not in the stables list
    npcHorses[0].ownership = makeNpcOwned(asNpcStableId("nonexistent_stable"));
    const horses: Record<string, Horse> = {};
    horses[npcHorses[0].id] = npcHorses[0];

    const { playerHorses, npcSummaries } = splitHorsesForPersistence([stable], horses);

    // Should be in playerHorses because stableId doesn't match any stable
    expect(Object.keys(playerHorses)).toHaveLength(1);
    expect(playerHorses[npcHorses[0].id]).toBeDefined();
    // Should not appear in npcSummaries (compressNpcHorses also skips it)
    expect(npcSummaries).toHaveLength(0);
  });
});

describe("mergeHorses", () => {
  it("combines player and NPC horses into one record", () => {
    const stable = makeTestStable();
    const playerHorse = makePlayerHorse();
    const npcHorses = makeNpcHorses(stable, 2);
    const horses: Record<string, Horse> = {};
    horses[playerHorse.id] = playerHorse;
    for (const h of npcHorses) horses[h.id] = h;

    const { playerHorses, npcSummaries } = splitHorsesForPersistence([stable], horses);
    const regenerated = regenerateNpcHorses(npcSummaries, [stable]);
    const merged = mergeHorses(playerHorses, regenerated);

    expect(Object.keys(merged)).toHaveLength(3);
    expect(merged[playerHorse.id]).toBeDefined();
    for (const h of npcHorses) {
      expect(merged[h.id]).toBeDefined();
    }
  });

  it("NPC horse overwrites player horse with same ID", () => {
    const playerHorse = makePlayerHorse();
    const npcHorse = makeNpcHorses(makeTestStable(), 1)[0];
    // Force same ID
    npcHorse.id = playerHorse.id;

    const merged = mergeHorses({ [playerHorse.id]: playerHorse }, [npcHorse]);

    expect(merged[playerHorse.id]).toBe(npcHorse);
  });
});
