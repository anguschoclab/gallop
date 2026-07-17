import { describe, it, expect, vi } from "vitest";
import { generatePrizeMoneyImpacts } from "@/core/race/impacts/prizeMoney";
import { GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants";
import type { Race, Horse } from "@/game/types";

describe("prizeMoney", () => {
  const baseHorse: Horse = {
    id: "horse1",
    stableId: "stable1",
    // Minimum fields needed for tests
  } as unknown as Horse;

  const baseRace: Race = {
    id: "race1",
    name: "Test Race",
    purse: 100000,
    graded: undefined,
  } as unknown as Race;

  const rng = { next: () => 0.5 } as any;

  describe("generatePrizeMoneyImpacts", () => {
    it("returns null if position is outside prize split length", () => {
      const position = PRIZE_SPLIT.length + 2;
      const impacts = generatePrizeMoneyImpacts(baseHorse, position, baseRace, 1, rng);
      expect(impacts).toBeNull();
    });

    it("returns null if prize amount is 0 or negative", () => {
      const raceZeroPurse = { ...baseRace, purse: 0 };
      const impacts = generatePrizeMoneyImpacts(baseHorse, 1, raceZeroPurse, 1, rng);
      expect(impacts).toBeNull();
    });

    it("generates correct cash impact for a winning stable horse", () => {
      const impacts = generatePrizeMoneyImpacts(baseHorse, 1, baseRace, 1, rng);
      expect(impacts).not.toBeNull();

      const expectedPrize = Math.round(100000 * PRIZE_SPLIT[0]);

      expect(impacts?.cashImpact).toMatchObject({
        day: 1,
        phase: "raceResolution",
        type: "cash_change",
        entityId: "stable1",
        amount: expectedPrize,
      });

      expect(impacts?.transactionImpact).toBeUndefined();
      expect(impacts?.reputationImpact).toBeUndefined();
    });

    it("uses GRADED_PRIZE_SPLIT for graded races", () => {
      const gradedRace = { ...baseRace, graded: { grade: "G1" } } as unknown as Race;
      const impacts = generatePrizeMoneyImpacts(baseHorse, 1, gradedRace, 1, rng);

      const expectedPrize = Math.round(100000 * GRADED_PRIZE_SPLIT[0]);
      expect(impacts?.cashImpact.amount).toBe(expectedPrize);
    });

    it("generates transaction and reputation impacts for NPC horses (no stableId) winning", () => {
      const npcHorse = { ...baseHorse, stableId: undefined } as unknown as Horse;
      const impacts = generatePrizeMoneyImpacts(npcHorse, 1, baseRace, 1, rng);

      expect(impacts).not.toBeNull();
      expect(impacts?.transactionImpact).toBeDefined();
      expect(impacts?.transactionImpact?.type).toBe("transaction");
      expect(impacts?.transactionImpact?.category).toBe("prize_money");

      expect(impacts?.reputationImpact).toBeDefined();
      expect(impacts?.reputationImpact?.type).toBe("reputation_change");
      expect(impacts?.reputationImpact?.source).toBe("race_win");
      expect(impacts?.reputationImpact?.delta).toBeGreaterThan(0);
    });

    it("generates no reputation impact for NPC horses (no stableId) finishing well enough to not lose rep", () => {
      const npcHorse = { ...baseHorse, stableId: undefined } as unknown as Horse;
      const g1Race = {
        ...baseRace,
        graded: { grade: "G1" },
        entries: Array(10).fill({}),
      } as unknown as Race;

      // Position 4 is in GRADED_PRIZE_SPLIT, but is top half of field (10), so no reputation loss
      const position = 4;

      const impacts = generatePrizeMoneyImpacts(npcHorse, position, g1Race, 1, rng);

      expect(impacts).not.toBeNull();
      expect(impacts?.transactionImpact).toBeDefined();

      expect(impacts?.reputationImpact).toBeUndefined();
    });
  });
});
