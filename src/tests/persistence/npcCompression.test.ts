/**
 * npcCompression.test.ts — Tests for NPC horse compression and regeneration.
 */

import { describe, it, expect } from "vitest";
import {
  compressNpcHorses,
  regenerateNpcHorses,
  splitHorsesForPersistence,
  mergeHorses,
  type NpcHorseSummary,
} from "@/core/persistence/npcCompression";
import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import { generateNpcHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { createRng, hashStr } from "@/core/common/rng";

function makeTestStable(): Stable {
  return {
    id: "stable-test-1",
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
      id: "player-stable",
    },
    rng,
    undefined,
    undefined,
    { forcedAge: 4, forcedName: "PlayerHorse" },
  );
  horse.stableId = undefined;
  horse.owned = true;
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
    npcHorses[0].stableId = "nonexistent_stable";
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
      expect(regen!.stableId).toBe(stable.id);
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
    summaries[0].stableId = "nonexistent_stable";

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
    npcHorses[0].stableId = "nonexistent_stable";
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
