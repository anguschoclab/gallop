/**
 * payloadSize.test.ts — Tests for persisted state payload size reduction.
 *
 * Verifies that the new persistence path (NPC compression + pedigree pruning)
 * produces a payload significantly smaller than the old monolithic approach.
 */

import { describe, it, expect } from "vitest";
import { generateNpcHorse } from "@/core/horse/horseFactory";
import { createRng, hashStr } from "@/core/common/rng";
import { prunePedigree, MAX_PERSISTED_PEDIGREE_DEPTH } from "@/core/persistence/pedigreePrune";
import {
  compressNpcHorses,
  splitHorsesForPersistence,
  type NpcHorseSummary,
} from "@/core/persistence/npcCompression";
import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";

function makeTestStable(id: string, tier: "elite" | "mid" | "budget" = "mid"): Stable {
  return {
    id,
    name: `${id} Stables`,
    owner: "Owner",
    tier,
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

function makeDeepPedigreeHorse(depth: number): Horse {
  const stable = makeTestStable("stable-ped");
  const rng = createRng(hashStr("ped_test"));
  const horse = generateNpcHorse(stable, rng, undefined, undefined, {
    forcedAge: 4,
    forcedName: "DeepPedigreeHorse",
  });

  // Build a deep recursive pedigree
  function buildNode(gen: number): any {
    if (gen <= 0) return { name: "root", generation: 0 };
    return {
      horseId: `gen-${gen}-id`,
      name: `Gen ${gen}`,
      generation: gen,
      sireId: `sire-${gen}`,
      damId: `dam-${gen}`,
      sireName: `Sire ${gen}`,
      damName: `Dam ${gen}`,
      sirePedigree: buildNode(gen - 1),
      damPedigree: buildNode(gen - 1),
    };
  }
  horse.pedigree = buildNode(depth);
  return horse;
}

describe("Payload size reduction", () => {
  it("NPC summaries are much smaller than full Horse objects", () => {
    const stable = makeTestStable("stable-size");
    const rng = createRng(hashStr("size_test"));

    // Generate 10 NPC horses
    const npcHorses: Horse[] = [];
    for (let i = 0; i < 10; i++) {
      const h = generateNpcHorse(stable, rng, undefined, undefined, {
        forcedAge: 3 + (i % 4),
        forcedName: `SizeTest-${i}`,
      });
      npcHorses.push(h);
    }

    const horses: Record<string, Horse> = {};
    for (const h of npcHorses) horses[h.id] = h;

    const fullSize = JSON.stringify(horses).length;
    const summaries = compressNpcHorses([stable], horses);
    const summarySize = JSON.stringify(summaries).length;

    // Summaries should be at least 5x smaller
    expect(summarySize).toBeLessThan(fullSize / 5);
  });

  it("pruned pedigree is smaller than unbounded pedigree", () => {
    const horse = makeDeepPedigreeHorse(10);
    const fullPedigreeSize = JSON.stringify(horse.pedigree).length;

    const pruned = prunePedigree(horse.pedigree, MAX_PERSISTED_PEDIGREE_DEPTH)!;
    const prunedSize = JSON.stringify(pruned).length;

    expect(prunedSize).toBeLessThan(fullPedigreeSize / 2);
  });

  it("100 NPC horses + 20 player horses payload is under 2 MB", () => {
    const npcStable = makeTestStable("npc-stable", "mid");
    const playerStable = makeTestStable("player-stable", "elite");
    const rng = createRng(hashStr("payload_test"));

    const horses: Record<string, Horse> = {};

    // 20 player horses
    for (let i = 0; i < 20; i++) {
      const h = generateNpcHorse(playerStable, rng, undefined, undefined, {
        forcedAge: 3 + (i % 4),
        forcedName: `Player-${i}`,
      });
      h.stableId = undefined;
      h.owned = true;
      horses[h.id] = h;
    }

    // 100 NPC horses
    for (let i = 0; i < 100; i++) {
      const h = generateNpcHorse(npcStable, rng, undefined, undefined, {
        forcedAge: 2 + (i % 6),
        forcedName: `NPC-${i}`,
      });
      horses[h.id] = h;
    }

    const { playerHorses, npcSummaries } = splitHorsesForPersistence([npcStable], horses);

    // Prune pedigrees on player horses
    const prunedPlayerHorses: Record<string, Horse> = {};
    for (const [id, h] of Object.entries(playerHorses)) {
      prunedPlayerHorses[id] = {
        ...h,
        pedigree: prunePedigree(h.pedigree) ?? h.pedigree,
      };
    }

    const payload = {
      playerHorses: prunedPlayerHorses,
      npcSummaries,
    };
    const payloadSize = JSON.stringify(payload).length;

    // Should be under 2 MB (2,097,152 bytes)
    expect(payloadSize).toBeLessThan(2_097_152);
  });
});
