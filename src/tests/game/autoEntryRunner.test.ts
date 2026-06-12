/**
 * Tests for auto-entry runner
 * Tests automatic race entry for auto-managed campaigns
 */

import { describe, it, expect, vi } from "vitest";
import { runAutoEntries, reconcileSlotStatuses } from "@/core/campaign/autoEntry";
import type { Horse, Race, HorseCampaign } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

// Mock data setup
function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    energy: 80,
    ...overrides,
  }) as Horse;
}

function createMockRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    surface: "Dirt",
    raceClass: "Stakes",
    entryFee: 100,
    purse: 100000,
    fieldSize: 8,
    graded: { key: "test", grade: "G3", track: "Test Track", trackId: "track-1", surface: "Dirt" },
    entries: [],
    resolved: false,
    ...overrides,
  };
}

function createMockCampaign(overrides: Partial<HorseCampaign> = {}): HorseCampaign {
  return {
    horseId: "horse-1",
    goalType: "chase_g1",
    autoManaged: true,
    slots: [
      {
        status: "planned",
        dayTarget: 100,
        dayWindow: 7,
        raceId: "race-1",
        role: "target",
      },
    ],
    flags: [],
    confirmedAptitudes: {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    },
    createdDay: 1,
    lastReviewedDay: 1,
    ...overrides,
  };
}

describe("runAutoEntries", () => {
  it("should return empty result for non-auto-managed campaigns", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign({ autoManaged: false });
    const races = [createMockRace()];
    const currentDay = 100;
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.updatedSlots).toEqual(campaign.slots);
  });

  it("should not enter races outside day window", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign();
    const races = [createMockRace()];
    const currentDay = 50; // Outside window (100-7 to 100)
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(result.updatedSlots[0].status).toBe("planned");
  });

  it("should enter race when within window and conditions met", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign();
    const races = [createMockRace()];
    const currentDay = 95; // Within window (93 to 100)
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toHaveLength(1);
    expect(result.entered[0].raceId).toBe("race-1");
    expect(result.updatedSlots[0].status).toBe("entered");
    expect(enterRaceFn).toHaveBeenCalledWith("race-1", "horse-1");
  });

  it("should skip when no matching race found", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign({
      slots: [
        {
          status: "planned",
          dayTarget: 100,
          dayWindow: 7,
          role: "target",
          constraintDistance: 3000,
        },
      ],
    });
    const races = [createMockRace({ id: "race-2", distance: 1600 })]; // Distance doesn't match constraint
    const currentDay = 95;
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("No matching race found in window");
  });

  it("should skip when insufficient cash", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign();
    const races = [createMockRace({ entryFee: 20000 })];
    const currentDay = 95;
    const cash = 10000; // Less than entry fee
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toContain("Insufficient cash");
    expect(enterRaceFn).not.toHaveBeenCalled();
  });

  it("should skip when entry race function fails", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign();
    const races = [createMockRace()];
    const currentDay = 95;
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: false as const, reason: "Race full" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("Race full");
  });

  it("should handle already entered slots", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign({
      slots: [
        { status: "entered", dayTarget: 100, dayWindow: 7, raceId: "race-1", role: "target" },
      ],
    });
    const races = [createMockRace()];
    const currentDay = 95;
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.entered).toEqual([]);
    expect(enterRaceFn).not.toHaveBeenCalled();
  });

  it("should update slot status to entered after successful entry", () => {
    const horse = createMockHorse();
    const campaign = createMockCampaign();
    const races = [createMockRace()];
    const currentDay = 95;
    const cash = 10000;
    const enterRaceFn = vi.fn(() => ({ ok: true, reason: "" }));

    const result = runAutoEntries({ horse, campaign, races, currentDay, cash, enterRaceFn });

    expect(result.updatedSlots[0].status).toBe("entered");
    expect(result.updatedSlots[0].raceId).toBe("race-1");
  });
});

describe("reconcileSlotStatuses", () => {
  it("should return unchanged slots for non-entered slots", () => {
    const campaign = createMockCampaign({
      slots: [
        { status: "planned", dayTarget: 100, dayWindow: 7, raceId: "race-1", role: "target" },
      ],
    });
    const races = [createMockRace({ id: "race-1", resolved: true })];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("planned");
  });

  it("should mark entered slots as completed when race is resolved", () => {
    const campaign = createMockCampaign({
      slots: [
        { status: "entered", dayTarget: 100, dayWindow: 7, raceId: "race-1", role: "target" },
      ],
    });
    const races = [createMockRace({ id: "race-1", resolved: true })];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("completed");
  });

  it("should keep entered status when race is not resolved", () => {
    const campaign = createMockCampaign({
      slots: [
        { status: "entered", dayTarget: 100, dayWindow: 7, raceId: "race-1", role: "target" },
      ],
    });
    const races = [createMockRace({ id: "race-1", resolved: false })];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("entered");
  });

  it("should handle slots without raceId", () => {
    const campaign = createMockCampaign({
      slots: [{ status: "entered", dayTarget: 100, dayWindow: 7, role: "target" }],
    });
    const races = [createMockRace({ resolved: true })];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("entered");
  });

  it("should handle missing races", () => {
    const campaign = createMockCampaign({
      slots: [
        {
          status: "entered",
          dayTarget: 100,
          dayWindow: 7,
          raceId: "nonexistent-race",
          role: "target",
        },
      ],
    });
    const races = [createMockRace({ id: "race-1", resolved: true })];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("entered");
  });

  it("should process multiple slots", () => {
    const campaign = createMockCampaign({
      slots: [
        { status: "entered", dayTarget: 100, dayWindow: 7, raceId: "race-1", role: "target" },
        { status: "entered", dayTarget: 150, dayWindow: 7, raceId: "race-2", role: "prep" },
        { status: "planned", dayTarget: 200, dayWindow: 7, raceId: "race-3", role: "target" },
      ],
    });
    const races = [
      createMockRace({ id: "race-1", resolved: true }),
      createMockRace({ id: "race-2", resolved: false }),
      createMockRace({ id: "race-3", resolved: true }),
    ];

    const result = reconcileSlotStatuses(campaign, races);

    expect(result[0].status).toBe("completed");
    expect(result[1].status).toBe("entered");
    expect(result[2].status).toBe("planned");
  });
});
