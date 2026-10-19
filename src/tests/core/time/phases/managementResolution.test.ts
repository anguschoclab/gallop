/**
 * Tests for management resolution phase — N+1 optimization coverage
 */

import { describe, it, expect } from "vitest";
import { managementResolutionPhase } from "@/platform/time/phases/managementResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { createRng } from "@/shared/common/rng";
import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";
import type {
  FacilityUpgradeIntent,
  InsuranceCancelIntent,
  InsuranceClaimIntent,
  InsurancePurchaseIntent,
  StaffIntent,
  StudRetirementIntent,
} from "@/platform/resolver/intents";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { h2r } from "@/tests/helpers/sampleGameState";

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
        horses: h2r([h1, h2]),
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
        horses: {},
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
        horses: h2r([h1, h2]),
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
        horses: h2r([h1]),
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
        horses: {},
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
        horses: h2r([h1, h2]),
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

  describe("insurance purchase and cancel intents", () => {
    it("converts an insurance purchase into a policy impact with calculated terms", () => {
      const horse = createTestHorse({ id: "h1", name: "Cover Me" });
      const state: GameState = { ...createTestState(), horses: h2r([horse]) };
      const intent: InsurancePurchaseIntent = {
        id: "i1",
        day: 10,
        type: "insurance_purchase",
        entityId: "h1",
        source: "player",
        priority: 100,
        horseId: "h1",
        policyType: "comprehensive",
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      const impact = result.impacts.find((i) => i.type === "insurance_purchase");
      expect(impact).toMatchObject({
        type: "insurance_purchase",
        horseId: "h1",
        policy: {
          type: "comprehensive",
          coveragePercent: 0.75,
          activeSinceDay: 10,
        },
      });
      expect((impact as any).policy.premiumPerDay).toBeGreaterThan(0);
    });

    it("converts an insurance cancellation into a cancellation impact", () => {
      const horse = createTestHorse({
        id: "h1",
        name: "Cancel Me",
        insurancePolicy: {
          type: "comprehensive",
          premiumPerDay: 100,
          coveragePercent: 0.75,
          activeSinceDay: 1,
        },
      });
      const state: GameState = { ...createTestState(), horses: h2r([horse]) };
      const intent: InsuranceCancelIntent = {
        id: "i1",
        day: 10,
        type: "insurance_cancel",
        entityId: "h1",
        source: "player",
        priority: 100,
        horseId: "h1",
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      expect(result.impacts).toContainEqual(
        expect.objectContaining({ type: "insurance_cancel", horseId: "h1" }),
      );
    });
  });

  describe("facility upgrade intents", () => {
    it("preserves NPC ownership in facility and cash impacts", () => {
      const state: GameState = {
        ...createTestState(),
        npcFacilities: {
          "stable-1": {
            main_track: {
              type: "main_track",
              level: "basic",
              maintenanceCost: 10,
              upgradeCost: 5000,
              builtDay: 1,
            },
          } as any,
        },
      };
      const intent: FacilityUpgradeIntent = {
        id: "i1",
        day: 10,
        type: "facility_upgrade",
        entityId: "stable-1",
        source: "npc",
        sourceId: "stable-1",
        priority: 15,
        facilityId: "main_track",
        nextLevel: "standard",
        cost: 5000,
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      expect(result.impacts).toContainEqual(
        expect.objectContaining({
          type: "facility_upgrade",
          entityId: "stable-1",
          facilityId: "main_track",
          nextLevel: "standard",
        }),
      );
      expect(result.impacts).toContainEqual(
        expect.objectContaining({
          type: "cash_change",
          entityId: "stable-1",
          amount: -5000,
        }),
      );
    });
  });

  describe("staff intents", () => {
    it("converts a hire intent into a staff impact carrying negotiated terms", () => {
      const staff: StaffMember = {
        id: "staff-1" as any,
        person: generatePersonIdentity({
          id: "staff-1",
          displayName: "Casey Trainer",
          role: "trainer",
          ageBand: "adult",
        }),
        name: "Casey Trainer",
        role: "trainer",
        tier: "elite",
        salary: 2000,
        bonusValue: 0.2,
        traits: ["sprinter"],
        fame: 80,
      };
      const state: GameState = { ...createTestState(), staffPool: [staff], hiredStaff: [] };
      const intent: StaffIntent = {
        id: "i1",
        day: 10,
        type: "staff",
        entityId: "staff-1",
        source: "player",
        priority: 100,
        action: "hire",
        staffId: "staff-1",
        role: "trainer",
        tier: "elite",
        salary: 1800,
        stableId: "" as any,
      };

      const result = managementResolutionPhase.execute(createContext(state, [intent]));
      expect(result.impacts).toContainEqual(
        expect.objectContaining({
          type: "staff",
          action: "hire",
          staffId: "staff-1",
          role: "trainer",
          tier: "elite",
          salary: 1800,
        }),
      );
    });
  });
});
