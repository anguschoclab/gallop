import { describe, it, expect } from "vitest";
import { resolveCampaignIntent } from "@/core/time/phases/campaignManagementResolvers";
import { SystemHandler } from "@/core/resolver/handlers/SystemHandler";
import { createCampaignSlice } from "@/game/store/slices/campaignSlice";
import type { PipelineContext } from "@/core/time/pipeline";
import type { AutoManageToggleIntent, CampaignCreationIntent } from "@/core/resolver/campaignIntents";
import type { AutoManageToggleImpact, CampaignCreationImpact } from "@/core/resolver/impacts/campaignImpacts";
import type { AnyImpact } from "@/core/resolver/impacts";
import type { GameState, HorseCampaign } from "@/game/types";
import { asHorseId } from "@/core/types/branded";
import { createRng } from "@/core/common/rng";

describe("Campaign Management & Resolver Integration", () => {
  it("resolves auto_manage_toggle intent into AutoManageToggleImpact", () => {
    const intent: AutoManageToggleIntent = {
      id: "intent-toggle-1",
      entityId: "horse-1",
      source: "player",
      day: 10,
      priority: 100,
      type: "auto_manage_toggle",
      horseId: "horse-1",
      autoManaged: true,
    };

    const context: PipelineContext = {
      state: {} as any,
      newDay: 10,
      previousDay: 9,
      horseMap: new Map(),
      raceMap: new Map(),
      stableMap: new Map(),
      jockeyMap: new Map(),
      intents: [intent],
      impacts: [],
      impactLog: [],
      logs: [],
      dailyRng: createRng(1),
    };

    const impacts: AnyImpact[] = [];
    const handled = resolveCampaignIntent(intent, context, impacts);

    expect(handled).toBe(true);
    expect(impacts.length).toBe(1);
    const impact = impacts[0] as AutoManageToggleImpact;
    expect(impact.type).toBe("auto_manage_toggle");
    expect(impact.horseId).toBe("horse-1");
    expect(impact.autoManaged).toBe(true);
  });

  it("updates existing campaign on campaign_creation instead of creating duplicates", () => {
    const horseId = asHorseId("horse-update-1");
    const existingCampaign: HorseCampaign = {
      horseId,
      goalType: "develop_maiden",
      autoManaged: false,
      createdDay: 1,
      lastReviewedDay: 5,
      slots: [],
      flags: [],
      confirmedAptitudes: {
        surfaceStarts: { Turf: 1, Dirt: 0, Synthetic: 0 },
        distanceBandStarts: { sprint: 1, mile: 0, intermediate: 0, staying: 0 },
      },
    };

    const draftState = {
      campaigns: [existingCampaign],
    } as unknown as GameState;

    const creationImpact: CampaignCreationImpact = {
      id: "impact-create-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "campaign_creation",
      horseId,
      goalType: "chase_g1",
      targetRaceKey: "derby",
      autoManaged: true,
      slots: [
        {
          dayTarget: 120,
          dayWindow: 5,
          role: "target",
          status: "planned",
        },
      ],
      reason: "Campaign updated",
    };

    const handler = new SystemHandler();
    handler.handle(draftState as any, creationImpact);

    // Should not have duplicated campaigns
    expect(draftState.campaigns?.length).toBe(1);
    const updated = draftState.campaigns?.[0];
    expect(updated?.goalType).toBe("chase_g1");
    expect(updated?.targetRaceKey).toBe("derby");
    expect(updated?.autoManaged).toBe(true);
    expect(updated?.slots.length).toBe(1);
    // Should preserve confirmed aptitudes
    expect(updated?.confirmedAptitudes.surfaceStarts.Turf).toBe(1);
  });

  it("exposes toggleAutoManaged and slot management on campaignSlice", () => {
    let enqueuedIntent: any = null;
    let storeState: any = {
      day: 20,
      campaigns: [
        {
          horseId: "horse-slice-1",
          goalType: "chase_g2",
          autoManaged: false,
          slots: [
            { dayTarget: 50, dayWindow: 5, role: "prep", status: "planned" },
            { dayTarget: 80, dayWindow: 5, role: "target", status: "planned" },
          ],
          flags: [],
          confirmedAptitudes: {
            surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
            distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
          },
          createdDay: 1,
          lastReviewedDay: 20,
        },
      ],
    };

    const set = (updater: any) => {
      if (typeof updater === "function") {
        storeState = updater(storeState);
      } else {
        storeState = { ...storeState, ...updater };
      }
    };
    const get = () => storeState;
    const enqueueIntent = (intent: any) => {
      enqueuedIntent = intent;
    };

    const slice = createCampaignSlice(set, get, enqueueIntent);

    // 1. toggleAutoManaged
    (slice as any).toggleAutoManaged("horse-slice-1", true);
    expect(enqueuedIntent).toBeDefined();
    expect(enqueuedIntent.type).toBe("auto_manage_toggle");
    expect(enqueuedIntent.autoManaged).toBe(true);

    // 2. addCampaignSlot
    (slice as any).addCampaignSlot("horse-slice-1", {
      dayTarget: 100,
      dayWindow: 7,
      role: "target",
      status: "planned",
    });
    expect(enqueuedIntent.type).toBe("campaign_slot");
    expect(enqueuedIntent.slot.dayTarget).toBe(100);

    // 3. removeCampaignSlot
    (slice as any).removeCampaignSlot("horse-slice-1", 0);
    expect(storeState.campaigns[0].slots.length).toBe(2);
    expect(storeState.campaigns[0].slots[0].dayTarget).toBe(80);
  });
});
