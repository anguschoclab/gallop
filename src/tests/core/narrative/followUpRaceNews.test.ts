import { describe, it, expect } from "vitest";
import { generateFollowUpRaceNews } from "@/domains/narrative/simulation/newsSpotlight";
import { createRng } from "@/shared/common/rng";
import type { Race } from "@/platform/game/types";
import type { Horse } from "@/domains/horse/simulation/types";

const race = {
  id: "r1",
  name: "Champion Stakes",
  graded: { grade: "G1" },
} as unknown as Race;

const playerHorse = {
  id: "h1",
  name: "Zephyr",
  ownership: { type: "player" },
} as unknown as Horse;

function headlinesAcrossSeeds(count: number): Set<string> {
  const seen = new Set<string>();
  for (let seed = 1; seed <= count; seed++) {
    const item = generateFollowUpRaceNews(race, playerHorse, 1, 100, createRng(seed));
    if (item) seen.add(item.headline);
  }
  return seen;
}

function bodiesAcrossSeeds(count: number): Set<string> {
  const seen = new Set<string>();
  for (let seed = 1; seed <= count; seed++) {
    const item = generateFollowUpRaceNews(race, playerHorse, 2, 100, createRng(seed * 7919));
    if (item) seen.add(item.body);
  }
  return seen;
}

describe("generateFollowUpRaceNews — enriched template pools", () => {
  it("guards unchanged: null for non-graded race", () => {
    const flat = { ...race, graded: undefined } as unknown as Race;
    expect(generateFollowUpRaceNews(flat, playerHorse, 1, 100, createRng(1))).toBeNull();
  });

  it("guards unchanged: null for finish outside top 3", () => {
    expect(generateFollowUpRaceNews(race, playerHorse, 4, 100, createRng(1))).toBeNull();
  });

  it("guards unchanged: null for non-player horses", () => {
    const npc = {
      ...playerHorse,
      ownership: { type: "npc", stableId: "s1" },
    } as unknown as Horse;
    expect(generateFollowUpRaceNews(race, npc, 1, 100, createRng(1))).toBeNull();
  });

  it("offers at least 30 distinct headlines across seeds", () => {
    expect(headlinesAcrossSeeds(500).size).toBeGreaterThanOrEqual(30);
  });

  it("includes the enriched headline templates", () => {
    const seen = headlinesAcrossSeeds(500);
    const expected = [
      "The Aftermath of the Champion Stakes: Zephyr's Path Forward",
      "Future Targets Discussed for Zephyr Post-Champion Stakes",
      "Looking Ahead: Zephyr Gathers Momentum After Champion Stakes",
      "Speculation Mounts Over Zephyr's Next Outing",
    ];
    for (const text of expected) {
      expect(seen).toContain(text);
    }
  });

  it("includes the enriched body templates", () => {
    const seen = bodiesAcrossSeeds(500);
    const hasEnriched = [...seen].some((b) =>
      b.includes("A powerful showing to earn a runner-up finish in the Champion Stakes"),
    );
    expect(hasEnriched).toBe(true);
  });

  it("every emitted headline and body is non-empty and names the horse", () => {
    for (const h of headlinesAcrossSeeds(200)) {
      expect(h.length).toBeGreaterThan(0);
    }
    for (const b of bodiesAcrossSeeds(200)) {
      expect(b).toContain("Zephyr");
    }
  });
});
