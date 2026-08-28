import { describe, it, expect } from "vitest";
import {
  knownBuyerPremiumMultiplier,
  attachmentAdjustedAsk,
  evaluateHorseAttachment,
} from "@/core/horse/attachment";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { Horse, Stable } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";

// ── Helpers ──────────────────────────────────────────────────────────────────

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "stable-1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["horse-1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
    ...overrides,
  }) as Stable;

/** Horse that scores as "available" (low fame, low potential). */
const mkAvailableHorse = (): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 0,
    potential: 50,
    careerStarts: 0,
    careerWins: 0,
    lifetimeEarnings: 0,
    fanCount: 0,
  });

/** Horse that scores as "valued" (moderate fame/potential). */
const mkValuedHorse = (): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 20,
    potential: 70,
    careerStarts: 0,
    careerWins: 0,
    lifetimeEarnings: 0,
    fanCount: 0,
  });

/** Horse that scores as "protected" (high fame, high potential, proven). */
const mkProtectedHorse = (): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 40,
    potential: 82,
    careerStarts: 10,
    careerWins: 6,
    lifetimeEarnings: 300_000,
    fanCount: 800,
  });

/** Horse that scores as "untouchable" (elite everything). */
const mkUntouchableHorse = (): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 60,
    potential: 90,
    careerStarts: 10,
    careerWins: 7,
    lifetimeEarnings: 500_000,
    fanCount: 1000,
  });

// ── knownBuyerPremiumMultiplier ───────────────────────────────────────────────

describe("knownBuyerPremiumMultiplier", () => {
  it("returns 0 for available tier regardless of reputation score", () => {
    for (const score of [0, 150, 300, 900]) {
      expect(knownBuyerPremiumMultiplier("available", score)).toBe(0);
    }
  });

  it("returns 0 for valued tier regardless of reputation score", () => {
    for (const score of [0, 150, 300, 900]) {
      expect(knownBuyerPremiumMultiplier("valued", score)).toBe(0);
    }
  });

  it("returns 0 for protected tier when reputation score is 0 (unknown)", () => {
    expect(knownBuyerPremiumMultiplier("protected", 0)).toBe(0);
  });

  it("returns 0 for protected tier when reputation score is 150 (local)", () => {
    expect(knownBuyerPremiumMultiplier("protected", 150)).toBe(0);
  });

  it("returns 0 for protected tier when reputation score is 299 (just below regional)", () => {
    expect(knownBuyerPremiumMultiplier("protected", 299)).toBe(0);
  });

  it("returns 0.10 for protected tier when reputation score is 300 (regional)", () => {
    expect(knownBuyerPremiumMultiplier("protected", 300)).toBe(0.10);
  });

  it("returns 0.15 for protected tier when reputation score is 450 (national)", () => {
    expect(knownBuyerPremiumMultiplier("protected", 450)).toBe(0.15);
  });

  it("returns 0.20 for untouchable tier when reputation score is 600 (international)", () => {
    expect(knownBuyerPremiumMultiplier("untouchable", 600)).toBe(0.20);
  });

  it("returns 0.25 for untouchable tier when reputation score is 750 (world_class)", () => {
    expect(knownBuyerPremiumMultiplier("untouchable", 750)).toBe(0.25);
  });

  it("returns 0.30 for untouchable tier when reputation score is 900 (legendary)", () => {
    expect(knownBuyerPremiumMultiplier("untouchable", 900)).toBe(0.30);
  });

  it("premium increases monotonically with reputation tier for protected", () => {
    const premiums = [300, 450, 600, 750, 900].map((score) =>
      knownBuyerPremiumMultiplier("protected", score),
    );
    for (let i = 0; i < premiums.length - 1; i++) {
      expect(premiums[i]).toBeLessThan(premiums[i + 1]);
    }
  });

  it("same premium fraction for protected and untouchable at the same reputation tier", () => {
    for (const score of [300, 450, 600, 750, 900]) {
      expect(knownBuyerPremiumMultiplier("protected", score)).toBe(
        knownBuyerPremiumMultiplier("untouchable", score),
      );
    }
  });
});

// ── attachmentAdjustedAsk with reputation ─────────────────────────────────────

describe("attachmentAdjustedAsk with reputation", () => {
  it("ask unchanged when reputationScore parameter is omitted", () => {
    const horse = mkProtectedHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithUndefined = attachmentAdjustedAsk(horse, stable, marketValue, undefined);
    expect(askWithUndefined).toBe(askWithoutRep);
  });

  it("ask unchanged when reputation score is 0 (unknown) even for untouchable horse", () => {
    const horse = mkUntouchableHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep0 = attachmentAdjustedAsk(horse, stable, marketValue, 0);
    expect(askWithRep0).toBe(askWithoutRep);
  });

  it("ask unchanged when reputation score is 150 (local) for protected horse", () => {
    const horse = mkProtectedHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep150 = attachmentAdjustedAsk(horse, stable, marketValue, 150);
    expect(askWithRep150).toBe(askWithoutRep);
  });

  it("ask is higher for protected horse when reputation is 300 (regional)", () => {
    const horse = mkProtectedHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep = attachmentAdjustedAsk(horse, stable, marketValue, 300);
    expect(askWithRep).toBeGreaterThan(askWithoutRep);
    expect(askWithRep).toBe(Math.round(askWithoutRep * 1.10));
  });

  it("ask is higher for untouchable horse when reputation is 900 (legendary)", () => {
    const horse = mkUntouchableHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep = attachmentAdjustedAsk(horse, stable, marketValue, 900);
    expect(askWithRep).toBeGreaterThan(askWithoutRep);
    expect(askWithRep).toBe(Math.round(askWithoutRep * 1.30));
  });

  it("ask unchanged for available horse even at reputation 900 (legendary)", () => {
    const horse = mkAvailableHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep = attachmentAdjustedAsk(horse, stable, marketValue, 900);
    expect(askWithRep).toBe(askWithoutRep);
  });

  it("ask scales up with higher reputation tiers for the same protected horse", () => {
    const horse = mkProtectedHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const scores = [300, 450, 600, 750, 900];
    const asks = scores.map((score) => attachmentAdjustedAsk(horse, stable, marketValue, score));
    for (let i = 0; i < asks.length - 1; i++) {
      expect(asks[i]).toBeLessThan(asks[i + 1]);
    }
  });

  it("ask unchanged for valued horse even at reputation 900 (legendary)", () => {
    const horse = mkValuedHorse();
    const stable = mkStable();
    const marketValue = 100_000;
    const askWithoutRep = attachmentAdjustedAsk(horse, stable, marketValue);
    const askWithRep = attachmentAdjustedAsk(horse, stable, marketValue, 900);
    expect(askWithRep).toBe(askWithoutRep);
  });
});
