/**
 * Tests for management resolution phase — N+1 optimization coverage
 */

import { describe, it, expect } from "vitest";
import { managementResolutionPhase } from "@/core/time/phases/managementResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { createRng } from "@/core/common/rng";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { StudRetirementIntent, InsuranceClaimIntent } from "@/core/resolver/intents";

describe("managementResolutionPhase — N+1 optimization coverage", () => {
  const createTestState = (): GameState => makeGameState({ day: 10, cash: 100000 }) as GameState;

  const createContext = (state: GameState, intents: any[]): PipelineContext => ({
    ...createMockPipelineContext({ state, intents, newDay: 10 }),
    dailyRng: createRng(42),
  });

  it("should have correct name", () => {
    expect(managementResolutionPhase.name).toBe("managementResolution");
  });

  describe("stud_retirement intents", () => {
    it("should process multiple stud_retirement intents for different horses", () => {
      const h1 = createTestHorse({ id: "h1", name: "Stallion One", gender: "horse", age: 5 });
      const h2 = createTestHorse({ id: "h2", name: "Stallion Two", gender: "horse", age: 5 });
      const state: GameState = {
        ...createTestState(),
        horses: [h1, h2],
      };

      const intents: StudRetirementIntent[] = [
        {
          id: "i1",
          day: 10,
          type: "stud_retirement",
          entityId: "h1",
          source: "player",
          priority: 100,
          horseId: "h1",
          standingFee: 5000,
          bookSize: 40,
        },
        {
          id: "i2",
          day: 10,
          type: "stud_retirement",
          entityId: "h2",
          source: "player",
          priority: 100,
          horseId: "h2",
          standingFee: 3000,
          bookSize: 30,
        },
      ];

      const result = managementResolutionPhase.execute(createContext(state, intents));
      const studImpacts = result.impacts.filter((i) => i.type === "stud_career");
      expect(studImpacts).toHaveLength(2);
      expect((studImpacts[0] as any).horseId).toBe("h1");
      expect((studImpacts[1] as any).horseId).toBe("h2");
    });

    it("should process stud_retirement intent for non-existent horse without inbox", () => {
      const state: GameState = {
        ...createTestState(),
        horses: [],
      };

      const intent: StudRetirementIntent = {
        id: "i1",
        day: 10,
        type: "stud_retirement",
        entityId: "ghost",
        source: "player",
        priority: 100,
        horseId: "ghost",
        standingFee: 5000,
        bookSize: 40,
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      const studImpacts = result.impacts.filter((i) => i.type === "stud_career");
      expect(studImpacts).toHaveLength(1);
      const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
      expect(inboxImpacts).toHaveLength(0);
    });
  });

  describe("insurance_claim intents", () => {
    it("should process multiple insurance_claim intents", () => {
      const h1 = createTestHorse({
        id: "h1",
        name: "Insured One",
        insurancePolicy: { type: "mortality", premium: 100, startDate: 1 } as any,
      });
      const h2 = createTestHorse({
        id: "h2",
        name: "Insured Two",
        insurancePolicy: { type: "mortality", premium: 100, startDate: 1 } as any,
      });
      const state: GameState = {
        ...createTestState(),
        horses: [h1, h2],
      };

      const intents: InsuranceClaimIntent[] = [
        {
          id: "i1",
          day: 10,
          type: "insurance_claim",
          entityId: "h1",
          source: "player",
          priority: 100,
          horseId: "h1",
          payout: 50000,
        },
        {
          id: "i2",
          day: 10,
          type: "insurance_claim",
          entityId: "h2",
          source: "player",
          priority: 100,
          horseId: "h2",
          payout: 30000,
        },
      ];

      const result = managementResolutionPhase.execute(createContext(state, intents));
      const payoutImpacts = result.impacts.filter((i) => i.type === "insurance_payout");
      expect(payoutImpacts).toHaveLength(2);
      expect((payoutImpacts[0] as any).horseId).toBe("h1");
      expect((payoutImpacts[1] as any).horseId).toBe("h2");
    });

    it("should skip insurance_claim for horse without insurance", () => {
      const h1 = createTestHorse({ id: "h1", name: "Uninsured" });
      const state: GameState = {
        ...createTestState(),
        horses: [h1],
      };

      const intent: InsuranceClaimIntent = {
        id: "i1",
        day: 10,
        type: "insurance_claim",
        entityId: "h1",
        source: "player",
        priority: 100,
        horseId: "h1",
        payout: 50000,
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      const payoutImpacts = result.impacts.filter((i) => i.type === "insurance_payout");
      expect(payoutImpacts).toHaveLength(0);
    });

    it("should skip insurance_claim for non-existent horse", () => {
      const state: GameState = {
        ...createTestState(),
        horses: [],
      };

      const intent: InsuranceClaimIntent = {
        id: "i1",
        day: 10,
        type: "insurance_claim",
        entityId: "ghost",
        source: "player",
        priority: 100,
        horseId: "ghost",
        payout: 50000,
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      const payoutImpacts = result.impacts.filter((i) => i.type === "insurance_payout");
      expect(payoutImpacts).toHaveLength(0);
    });
  });

  describe("mixed intent types in single batch", () => {
    it("should process mixed stud_retirement and insurance_claim intents", () => {
      const h1 = createTestHorse({ id: "h1", name: "Stud Hopeful", gender: "horse", age: 5 });
      const h2 = createTestHorse({
        id: "h2",
        name: "Insured One",
        insurancePolicy: { type: "mortality", premium: 100, startDate: 1 } as any,
      });
      const state: GameState = {
        ...createTestState(),
        horses: [h1, h2],
      };

      const intents: any[] = [
        {
          id: "i1",
          day: 10,
          type: "stud_retirement",
          entityId: "h1",
          source: "player",
          priority: 100,
          horseId: "h1",
          standingFee: 5000,
          bookSize: 40,
        },
        {
          id: "i2",
          day: 10,
          type: "insurance_claim",
          entityId: "h2",
          source: "player",
          priority: 100,
          horseId: "h2",
          payout: 30000,
        },
      ];

      const result = managementResolutionPhase.execute(createContext(state, intents));
      const studImpacts = result.impacts.filter((i) => i.type === "stud_career");
      const payoutImpacts = result.impacts.filter((i) => i.type === "insurance_payout");
      expect(studImpacts).toHaveLength(1);
      expect(payoutImpacts).toHaveLength(1);
    });
  });
});
