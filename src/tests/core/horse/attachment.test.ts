import { describe, it, expect } from "vitest";
import {
  evaluateHorseAttachment,
  ATTACHMENT_BASE_MULTIPLIER,
} from "@/domains/horse/simulation/attachment";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Stable, StablePersonality } from "@/platform/game/types";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";

describe("evaluateHorseAttachment", () => {
  const setup = (personality: StablePersonality) => {
    const stable: Stable = {
      id: "s1",
      personality,
      cash: 10_000,
      horses: ["h1"],
      type: "npc",
    } as unknown as Stable;
    // createTestHorse sets fame: 50, potential: 75, fanCount: 25000 by default.
    // We override these to 0 so we get a pure baseline.
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned(asNpcStableId("s1")),
      fame: 0,
      potential: 0,
      fanCount: 0,
      careerStarts: 0,
      careerWins: 0,
      lifetimeEarnings: 0,
    });
    return { stable, horse };
  };

  it("calculates baseline score and multiplier for available horse", () => {
    const { stable, horse } = setup("trader");
    const attachment = evaluateHorseAttachment(horse, stable);

    expect(attachment.tier).toBe("available");
    expect(attachment.askMultiplier).toBe(ATTACHMENT_BASE_MULTIPLIER);
    expect(attachment.score).toBe(0);
  });

  it("assigns high attachment for blue hen horse in a breeder stable", () => {
    const { stable, horse } = setup("breeder");
    horse.isBlueHen = true;
    const attachment = evaluateHorseAttachment(horse, stable);

    // Core of breeding program (14) + Blue hen broodmare (20) = 34 -> "valued"
    expect(attachment.tier).toBe("valued");
    expect(attachment.score).toBe(34);
    expect(attachment.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Blue hen broodmare", points: 20 }),
        expect.objectContaining({ label: "Core of the breeding program", points: 14 }),
      ]),
    );
  });

  it("assigns high attachment for prestige flagships", () => {
    const { stable, horse } = setup("prestige");
    horse.fame = 60; // 60/2.2 = 27 -> capped at 26
    const attachment = evaluateHorseAttachment(horse, stable);

    // Fame points (26) + Flagship (16) = 42 -> "valued"
    expect(attachment.tier).toBe("valued");
    expect(attachment.score).toBe(42);
    expect(attachment.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Public profile / fame", points: 26 }),
        expect.objectContaining({ label: "Flagship of a prestige stable", points: 16 }),
      ]),
    );
  });

  it("calculates untouchable tier for elite proven horse in conservative stable", () => {
    const { stable, horse } = setup("conservative");
    horse.fame = 100; // 26
    horse.potential = 95; // 22
    horse.careerStarts = 10;
    horse.careerWins = 8; // 12
    horse.lifetimeEarnings = 1_000_000; // 10
    horse.fanCount = 10_000; // 8
    // Conservative personality = 6

    const attachment = evaluateHorseAttachment(horse, stable);

    expect(attachment.tier).toBe("untouchable");
    expect(attachment.score).toBe(84);
    expect(attachment.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Elite potential" }),
        expect.objectContaining({ label: "Proven earner" }),
        expect.objectContaining({ label: "Slow to sell out of the string" }),
      ]),
    );
  });

  it("penalizes score for horse past its peak", () => {
    const { stable, horse } = setup("trader");
    horse.potential = 70; // 6
    horse.peakAge = 4;
    horse.age = 8; // Past peak + 3

    const attachment = evaluateHorseAttachment(horse, stable);

    // Potential (6) - Trader (-8) - Past Peak (-12) = -14 -> floor 0
    expect(attachment.score).toBe(0);
    expect(attachment.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Past its peak", points: -12 })]),
    );
  });
});
