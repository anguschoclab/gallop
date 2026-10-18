import { describe, expect, it } from "vitest";
import { runNpcCycle } from "@/domains/agents/simulation/npc/npcCycle";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createRng } from "@/shared/common/rng";
import type { PlayerFacilities } from "@/domains/facilities/simulation";
import { createDefaultPlayerFacilities } from "@/domains/facilities/simulation/facilityDefaults";

describe("npcCycle facility ownership", () => {
  it("does not mutate NPC facilities outside the intent/impact contract", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000 });
    const facilities: PlayerFacilities = {
      ...createDefaultPlayerFacilities(1),
      main_track: {
        type: "main_track",
        level: "basic",
        maintenanceCost: 10,
        upgradeCost: 5000,
        builtDay: 1,
      },
    };
    const npcFacilities = { [stable.id]: facilities };

    const result = runNpcCycle(
      [stable],
      [],
      [],
      [],
      10,
      createRng("facility-path"),
      3,
      new Set(),
      { stableStates: {}, globalDay: 10, regionalKings: {} },
      npcFacilities,
    );

    expect(result.npcFacilities?.[stable.id]).toBe(facilities);
    expect(result.cashChanges).toEqual([]);
  });
});
