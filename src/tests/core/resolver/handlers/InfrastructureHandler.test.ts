import { describe, it, expect } from "vitest";
import { InfrastructureHandler } from "@/core/resolver/handlers/InfrastructureHandler";
import type { GameState } from "@/game/store/state";
import type {
  FacilityUpgradeImpact,
  StaffImpact,
  TransportImpact,
  OutpostImpact,
} from "@/core/resolver/impacts/index";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { Horse, Stable } from "@/game/types";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import { createFacilityAIState } from "@/domains/agents/simulation/facilityAITypes";

describe("InfrastructureHandler", () => {
  it("facility_upgrade updates facility level", () => {
    const handler = new InfrastructureHandler();
    const state = {
      horses: {},
      facilities: { training_track: { level: 1 } },
    } as unknown as GameState;

    const impact: FacilityUpgradeImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "facility_upgrade",
      facilityId: "training_track",
      nextLevel: "premium",
      cost: 50000,
      reason: "Facility upgrade started",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.facilities.training_track.level).toBe("premium");
  });

  it("facility_upgrade targets the owning NPC stable without changing player facilities", () => {
    const handler = new InfrastructureHandler();
    const playerFacility = {
      type: "main_track",
      level: "basic",
      maintenanceCost: 10,
      upgradeCost: 5000,
      builtDay: 1,
    };
    const npcFacility = { ...playerFacility };
    const state = {
      horses: {},
      facilities: { main_track: playerFacility },
      npcFacilities: { "stable-1": { main_track: npcFacility } },
    } as unknown as GameState;

    const impact: FacilityUpgradeImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "facility_upgrade",
      entityId: "stable-1",
      facilityId: "main_track",
      nextLevel: "standard",
      cost: 5000,
      reason: "NPC facility upgrade",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.npcFacilities["stable-1"].main_track.level).toBe("standard");
    expect(draft.facilities.main_track.level).toBe("basic");
  });

  it("records NPC facility investment learning when the upgrade impact is applied", () => {
    const handler = new InfrastructureHandler();
    const stable = createTestStable({ id: "stable-1", cash: 100_000 }) as Stable;
    const stableAI = createStableAIState(stable, 1);
    stableAI.facilityAI = createFacilityAIState(stable);
    const facility = {
      type: "main_track",
      level: "basic",
      maintenanceCost: 10,
      upgradeCost: 5000,
      builtDay: 1,
    };
    const state = {
      horses: {},
      npcStables: [stable],
      npcFacilities: { "stable-1": { main_track: facility } },
      npcAIManager: { stableStates: { "stable-1": stableAI }, globalDay: 10, regionalKings: {} },
    } as unknown as GameState;
    const impact: FacilityUpgradeImpact = {
      id: "imp-1",
      intentId: "intent-1",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "facility_upgrade",
      entityId: "stable-1",
      facilityId: "main_track",
      nextLevel: "standard",
      cost: 5000,
      reason: "NPC facility upgrade",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    const updatedAI = draft.npcAIManager.stableStates["stable-1"].facilityAI;
    expect(updatedAI.investmentHistory).toHaveLength(1);
    expect(updatedAI.investmentHistory[0]).toMatchObject({
      facilityType: "main_track",
      fromLevel: "basic",
      toLevel: "standard",
      cost: 5000,
      stableId: "stable-1",
      day: 10,
    });
    expect(updatedAI.roiTracking["main_track:standard"].totalInvestment).toBe(5000);
  });

  it("staff hire moves staff from pool to hiredStaff and deducts salary", () => {
    const handler = new InfrastructureHandler();
    const state = {
      cash: 10000,
      horses: {},
      staffPool: [{ id: "staff-1", name: "Bob", role: "trainer" }],
      hiredStaff: [],
    } as unknown as GameState;

    const impact: StaffImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "staff",
      action: "hire",
      staffId: "staff-1",
      role: "trainer",
      tier: "mid",
      salary: 2000,
      stableId: "",
      reason: "Hired trainer",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.hiredStaff).toHaveLength(1);
    expect(draft.hiredStaff[0].id).toBe("staff-1");
    expect(draft.hiredStaff[0].salary).toBe(2000);
    expect(draft.staffPool).toHaveLength(0);
    expect(draft.cash).toBe(8000);
  });

  it("staff fire removes from hiredStaff", () => {
    const handler = new InfrastructureHandler();
    const state = {
      cash: 10000,
      horses: {},
      staffPool: [],
      hiredStaff: [{ id: "staff-1", name: "Bob", role: "trainer", salary: 2000, stableId: "" }],
    } as unknown as GameState;

    const impact: StaffImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "managementResolution",
      logLevel: "always",
      type: "staff",
      action: "fire",
      staffId: "staff-1",
      role: "trainer",
      tier: "mid",
      salary: 2000,
      stableId: "",
      reason: "Fired trainer",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.hiredStaff).toHaveLength(0);
  });

  it("transport_horse updates outpost and fatigue", () => {
    const handler = new InfrastructureHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", fatigue: 10, stableId: "" }] as unknown as Horse[]),
      npcStables: [],
    } as unknown as GameState;

    const impact: TransportImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "transport_horse",
      horseId: "h1",
      fromOutpostId: "outpost-0",
      toOutpostId: "outpost-1",
      fatigueSpike: 15,
      acclimatizationDays: 7,
      reason: "Transported",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.horses["h1"].outpostId).toBe("outpost-1");
    expect(draft.horses["h1"].fatigue).toBe(25);
  });

  it("outpost_action create adds a new outpost", () => {
    const handler = new InfrastructureHandler();
    const state = {
      horses: {},
      npcStables: [],
      outposts: [],
    } as unknown as GameState;

    const impact: OutpostImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "outpost_action",
      stableId: "player",
      action: "create",
      outpostId: "outpost-1",
      metadata: { name: "East Coast Base", region: "North America (East)" },
      reason: "Outpost created",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.outposts).toHaveLength(1);
    expect(draft.outposts[0].id).toBe("outpost-1");
    expect(draft.outposts[0].name).toBe("East Coast Base");
  });

  it("transport_horse with player horse updates draft.outposts acclimatization", () => {
    const handler = new InfrastructureHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", fatigue: 10, stableId: "" }] as unknown as Horse[]),
      npcStables: [],
      outposts: [
        {
          id: "outpost-1",
          name: "East",
          region: "NA",
          totalSlots: 12,
          facilities: {},
          acclimatizationDays: {},
        },
      ],
    } as unknown as GameState;

    const impact: TransportImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "transport_horse",
      horseId: "h1",
      fromOutpostId: "outpost-0",
      toOutpostId: "outpost-1",
      fatigueSpike: 15,
      acclimatizationDays: 7,
      reason: "Transported",
    };

    const draft: any = structuredClone(state);
    handler.handle(draft, impact);

    expect(draft.horses["h1"].outpostId).toBe("outpost-1");
    expect(draft.outposts[0].acclimatizationDays["h1"]).toBe(7);
  });

  it("canHandle returns true for infrastructure impact types only", () => {
    const handler = new InfrastructureHandler();
    expect(handler.canHandle("facility_upgrade")).toBe(true);
    expect(handler.canHandle("staff")).toBe(true);
    expect(handler.canHandle("transport_horse")).toBe(true);
    expect(handler.canHandle("outpost_action")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});
