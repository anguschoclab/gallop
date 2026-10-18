import { describe, it, expect } from "vitest";
import {
  isPlayerOwned,
  isNpcOwned,
  getStableId,
  makePlayerOwned,
  makeNpcOwned,
  makeUnowned,
} from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import { generateHorse } from "@/domains/horse/simulation/horseFactory";

describe("ownership migration: generateHorse with ownership", () => {
  it("generateHorse with ownership: makePlayerOwned() creates a player-owned horse", () => {
    const horse = generateHorse({ ownership: makePlayerOwned() });
    expect(isPlayerOwned(horse)).toBe(true);
    expect(isNpcOwned(horse)).toBe(false);
    expect(getStableId(horse)).toBe(null);
  });

  it("generateHorse with ownership: makeUnowned() creates an unowned horse", () => {
    const horse = generateHorse({ ownership: makeUnowned() });
    expect(isPlayerOwned(horse)).toBe(false);
    expect(isNpcOwned(horse)).toBe(false);
    expect(getStableId(horse)).toBe(null);
  });

  it("generateHorse with ownership: makeNpcOwned() creates an NPC-owned horse", () => {
    const stableId = asNpcStableId("npc-stable-1");
    const horse = generateHorse({ ownership: makeNpcOwned(stableId) });
    expect(isPlayerOwned(horse)).toBe(false);
    expect(isNpcOwned(horse)).toBe(true);
    expect(getStableId(horse)).toBe(stableId);
  });

  it("generateHorse without ownership defaults to unowned", () => {
    const horse = generateHorse({});
    expect(isPlayerOwned(horse)).toBe(false);
    expect(isUnowned(horse)).toBe(true);
  });
});

// Re-import for the unowned check
import { isUnowned } from "@/domains/horse/simulation/ownership";
