import { describe, it, expect } from "vitest";
import { InfrastructureHandler } from "@/core/resolver/handlers/InfrastructureHandler";
import type { GameState } from "@/game/store/state";
import type {
  FacilityUpgradeImpact,
  StaffImpact,
  TransportImpact,
  OutpostImpact,
} from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";

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
      nextLevel: 2,
      cost: 50000,
      reason: "Facility upgrade started",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.facilities.training_track.level).toBe(2);
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

    const draft = JSON.parse(JSON.stringify(state));
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

    const draft = JSON.parse(JSON.stringify(state));
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

    const draft = JSON.parse(JSON.stringify(state));
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

    const draft = JSON.parse(JSON.stringify(state));
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

    const draft = JSON.parse(JSON.stringify(state));
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
