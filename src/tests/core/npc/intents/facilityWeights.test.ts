import { describe, it, expect } from "vitest";
import { generateNpcFacilityUpgradeIntents } from "@/core/npc/intents/facilityIntents";
import type { Stable, PlayerFacilities } from "@/game/types";
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
    const intents = generateNpcFacilityUpgradeIntents(
      stable,
      stableAI,
      10,
      npcFacilities,
      1.0,
    );
    expect(intents.length).toBeGreaterThan(0);
    expect(intents[0].type).toBe("facility_upgrade");
  });

  it("suppresses upgrade intents when facility weight is 0", () => {
    const intents = generateNpcFacilityUpgradeIntents(
      stable,
      stableAI,
      10,
      npcFacilities,
      0,
    );
    expect(intents.length).toBe(0);
  });
});
