import { describe, it, expect } from "vitest";
import {
  generateNpcFacilityUpgradeIntents,
  generateNpcOutpostIntents,
  generateNpcTransportIntents,
} from "@/domains/agents/simulation/npc/intents/facilityIntents";
import type { Stable, PlayerFacilities } from "@/game/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createDefaultPlayerFacilities } from "@/core/facilities/facilityDefaults";

describe("generateNpcFacilityUpgradeIntents with facilityWeight", () => {
  const stable: Stable = {
    id: "stable-1",
    name: "Apex Stable",
    cash: 100000,
    personality: "aggressive",
  } as any;

  const stableAI: any = {
    budgetAllocation: {
      facilities: 50000,
    },
  };

  const npcFacilities: Record<string, PlayerFacilities> = {
    "stable-1": createDefaultPlayerFacilities(1),
  };

  it("generates upgrade intent when facility weight is positive", () => {
    const intents = generateNpcFacilityUpgradeIntents(stable, stableAI, 10, npcFacilities, 1.0);
    expect(intents.length).toBeGreaterThan(0);
    expect(intents[0].type).toBe("facility_upgrade");
  });

  it("suppresses upgrade intents when facility weight is 0", () => {
    const intents = generateNpcFacilityUpgradeIntents(stable, stableAI, 10, npcFacilities, 0);
    expect(intents.length).toBe(0);
  });

  it("does not reserve an outpost the stable cannot pay for", () => {
    const poorStable = { ...stable, cash: 1000 } as Stable;
    const richBudgetAI = {
      budgetAllocation: { facilities: 100000 },
      financialDistress: { level: "healthy" },
    } as any;
    const stableHash = poorStable.id
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    const eligibleDay = 14 - (stableHash % 14);

    expect(generateNpcOutpostIntents(poorStable, richBudgetAI, eligibleDay)).toHaveLength(0);
  });

  it("does not emit transport commitments beyond the stable cash balance", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 4,
      ownership: { type: "npc", stableId: stable.id },
      surfaceAptitude: { Turf: 80, Dirt: 20 } as any,
    });
    const poorStable = {
      ...stable,
      cash: 4000,
      outposts: [
        {
          id: "outpost-1",
          name: "East",
          region: "North America (East)",
          totalSlots: 4,
          facilities: {},
          acclimatizationDays: { [horse.id]: 0 },
        },
        {
          id: "outpost-2",
          name: "West",
          region: "North America (West)",
          totalSlots: 4,
          facilities: {
            0: { type: "main_track", level: "basic", branch: "turf" },
          },
          acclimatizationDays: {},
        },
      ],
    } as Stable;

    expect(generateNpcTransportIntents(poorStable, 10, [horse])).toHaveLength(0);
  });
});
