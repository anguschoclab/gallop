/**
 * Tests for campaign action helpers extracted from campaignSlice.
 */

import { describe, it, expect } from "vitest";
import {
  buildCampaignIntent,
  upsertCampaign,
  buildAutoCampaign,
} from "@/core/campaign/campaignActions";
import type { HorseCampaign } from "@/game/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("buildCampaignIntent", () => {
  it("builds an intent with the common envelope fields", () => {
    const intent = buildCampaignIntent({ horseId: "h1", day: 5 }, "campaign_creation", {
      goalType: "chase_g1",
    });
    expect(intent.entityId).toBe("h1");
    expect(intent.source).toBe("player");
    expect(intent.day).toBe(5);
    expect(intent.priority).toBe(100);
    expect(intent.type).toBe("campaign_creation");
    expect(intent.id).toBeTypeOf("string");
  });

  it("includes type-specific payload fields", () => {
    const intent = buildCampaignIntent({ horseId: "h1", day: 3 }, "campaign_slot", {
      slotIndex: 0,
      slot: { targetRaceKey: "race1" },
    });
    expect(intent).toHaveProperty("slotIndex", 0);
    expect(intent).toHaveProperty("slot");
  });
});

describe("upsertCampaign", () => {
  const c1: HorseCampaign = {
    horseId: "h1",
    goalType: "chase_g1",
    targetRaceKey: undefined,
    slots: [],
    flags: [],
    autoManaged: false,
    confirmedAptitudes: {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    },
    createdDay: 1,
    lastReviewedDay: 1,
  };
  const c2: HorseCampaign = { ...c1, horseId: "h2" };

  it("appends when the campaign does not exist", () => {
    const result = upsertCampaign([c1], c2);
    expect(result).toHaveLength(2);
    expect(result[1].horseId).toBe("h2");
  });

  it("replaces when the campaign exists", () => {
    const updated: HorseCampaign = { ...c1, goalType: "maximize_earnings" };
    const result = upsertCampaign([c1, c2], updated);
    expect(result).toHaveLength(2);
    expect(result[0].goalType).toBe("maximize_earnings");
  });

  it("returns a single-element array when campaigns is undefined", () => {
    const result = upsertCampaign(undefined, c1);
    expect(result).toHaveLength(1);
    expect(result[0].horseId).toBe("h1");
  });

  it("does not mutate the input array", () => {
    const input = [c1];
    const result = upsertCampaign(input, c2);
    expect(input).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

describe("buildAutoCampaign", () => {
  it("builds a campaign with the given parameters", () => {
    const campaign = buildAutoCampaign({
      horseId: "h1",
      goalType: "chase_g1",
      targetRaceKey: "race1",
      slots: [],
      currentDay: 5,
    });
    expect(campaign.horseId).toBe("h1");
    expect(campaign.goalType).toBe("chase_g1");
    expect(campaign.targetRaceKey).toBe("race1");
    expect(campaign.autoManaged).toBe(true);
    expect(campaign.createdDay).toBe(5);
    expect(campaign.lastReviewedDay).toBe(5);
    expect(campaign.flags).toEqual([]);
    expect(campaign.confirmedAptitudes.surfaceStarts).toEqual({ Turf: 0, Dirt: 0, Synthetic: 0 });
  });
});
