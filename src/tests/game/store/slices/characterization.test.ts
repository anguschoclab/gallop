import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJockeySlice } from "@/game/store/slices/jockeySlice";
import { createCampaignSlice } from "@/game/store/slices/campaignSlice";
import { createHorseAdminSlice } from "@/game/store/slices/horseAdminSlice";
import { createAwardSlice } from "@/game/store/slices/awardSlice";
import type { StoreType, StoreSet, StoreGet } from "@/game/store/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makePlayerOwned } from "@/core/horse/ownership";

function createMockStore(partial: Partial<StoreType> = {}): {
  set: StoreSet;
  get: StoreGet;
  enqueueIntent: ReturnType<typeof vi.fn>;
} {
  const enqueueIntent = vi.fn();
  const state = { day: 10, cash: 100000, enqueueIntent, ...partial } as unknown as StoreType;
  const set = vi.fn((update: any) => {
    if (typeof update === "function") {
      Object.assign(state, update(state));
    } else {
      Object.assign(state, update);
    }
  }) as any;
  const get = vi.fn(() => state) as any;
  return { set, get, enqueueIntent };
}

describe("jockeySlice", () => {
  let mock: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hireJockey should fail if jockey not found", () => {
    mock = createMockStore({ jockeys: [] });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.hireJockey("j1", "standard");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("not found");
  });

  it("hireJockey should fail if jockey already contracted", () => {
    const jockey = { id: "j1", stableId: "other", ridingFee: 100 } as any;
    mock = createMockStore({ jockeys: [jockey] });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.hireJockey("j1", "standard");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("already under contract");
  });

  it("hireJockey should fail if insufficient cash", () => {
    const jockey = { id: "j1", stableId: undefined, ridingFee: 10000 } as any;
    mock = createMockStore({ jockeys: [jockey], cash: 100 });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.hireJockey("j1", "standard");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("Insufficient cash");
  });

  it("hireJockey should enqueue intent on success", () => {
    const jockey = { id: "j1", stableId: undefined, ridingFee: 100 } as any;
    mock = createMockStore({ jockeys: [jockey], cash: 100000 });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.hireJockey("j1", "standard");
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = mock.enqueueIntent.mock.calls[0][0];
    expect(intent.type).toBe("jockey_contract");
    expect(intent.jockeyId).toBe("j1");
  });

  it("hireApprentice should fail for non-apprentice", () => {
    const jockey = { id: "j1", isApprentice: false, stableId: undefined } as any;
    mock = createMockStore({ jockeys: [jockey] });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.hireApprentice("j1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("not an apprentice");
  });

  it("releaseJockey should fail for non-player jockey", () => {
    const jockey = { id: "j1", stableId: "other" } as any;
    mock = createMockStore({ jockeys: [jockey] });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.releaseJockey("j1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("not under contract");
  });

  it("releaseJockey should enqueue intent on success", () => {
    const jockey = { id: "j1", stableId: "player" } as any;
    mock = createMockStore({ jockeys: [jockey] });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.releaseJockey("j1");
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("jockey_release");
  });

  it("rerollJockeySilk should fail for non-player jockey", () => {
    const jockey = { id: "j1", stableId: "other" } as any;
    mock = createMockStore({ jockeys: [jockey], cash: 1000 });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.rerollJockeySilk("j1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("Can only reroll");
  });

  it("rerollJockeySilk should fail if insufficient cash", () => {
    const jockey = { id: "j1", stableId: "player" } as any;
    mock = createMockStore({ jockeys: [jockey], cash: 50 });
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.rerollJockeySilk("j1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("Insufficient cash");
  });

  it("setJockeys should set jockeys", () => {
    mock = createMockStore();
    const slice = createJockeySlice(mock.set, mock.get, mock.enqueueIntent);
    const jockeys = [{ id: "j1" } as any];
    slice.setJockeys(jockeys);
    expect(mock.set).toHaveBeenCalledWith({ jockeys });
  });
});

describe("campaignSlice", () => {
  let mock: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setCampaign should enqueue campaign_creation intent", () => {
    mock = createMockStore();
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    const campaign = { horseId: "h1", goalType: "chase_g1" } as any;
    slice.setCampaign(campaign);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = mock.enqueueIntent.mock.calls[0][0];
    expect(intent.type).toBe("campaign_creation");
    expect(intent.horseId).toBe("h1");
  });

  it("updateCampaignSlot should enqueue campaign_slot intent", () => {
    mock = createMockStore();
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.updateCampaignSlot("h1", 0, { raceId: "r1" });
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = mock.enqueueIntent.mock.calls[0][0];
    expect(intent.type).toBe("campaign_slot");
    expect(intent.slotIndex).toBe(0);
  });

  it("dismissCampaignFlag should enqueue campaign_flag_dismissal intent", () => {
    const campaign = { horseId: "h1", flags: [{}] } as any;
    mock = createMockStore({ campaigns: [campaign] });
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.dismissCampaignFlag("h1", 0);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("campaign_flag_dismissal");
  });

  it("deleteCampaign should enqueue campaign_deletion intent", () => {
    mock = createMockStore();
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.deleteCampaign("h1");
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("campaign_deletion");
  });

  it("generateAutoCampaign should enqueue campaign_creation intent", () => {
    mock = createMockStore();
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.generateAutoCampaign("h1", "chase_g1", "race-key-1");
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = mock.enqueueIntent.mock.calls[0][0];
    expect(intent.type).toBe("campaign_creation");
    expect(intent.targetRaceKey).toBe("race-key-1");
  });

  it("setCampaigns should set campaigns directly", () => {
    mock = createMockStore();
    const slice = createCampaignSlice(mock.set, mock.get, mock.enqueueIntent);
    const campaigns = [{ horseId: "h1" } as any];
    slice.setCampaigns(campaigns);
    expect(mock.set).toHaveBeenCalledWith({ campaigns });
  });
});

describe("horseAdminSlice", () => {
  let mock: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateStudFee should fail if horse not at stud", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned() });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.updateStudFee("h1", 5000);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("not standing at stud");
  });

  it("updateStudFee should enqueue intent on success", () => {
    const horse = createTestHorse({ id: "h1", stableId: undefined, stud: { atStud: true } } as any);
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.updateStudFee("h1", 5000);
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("update_stud_fee");
  });

  it("retireToStud should fail for female horses", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), gender: "mare" });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.retireToStud("h1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("Only male horses");
  });

  it("retireToStud should fail for horses under 4", () => {
    const horse = createTestHorse({
      id: "h1",
      ownership: makePlayerOwned(),
      gender: "colt",
      age: 3,
    });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.retireToStud("h1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("at least 4");
  });

  it("retireToStud should enqueue intent on success", () => {
    const horse = createTestHorse({
      id: "h1",
      ownership: makePlayerOwned(),
      gender: "horse",
      age: 5,
    });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.retireToStud("h1");
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("stud_retirement");
  });

  it("geldingHorse should fail for mares", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), gender: "mare" });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.geldingHorse("h1");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("Only colts and stallions");
  });

  it("geldingHorse should enqueue intent for colt", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), gender: "colt" });
    mock = createMockStore({ horses: { h1: horse } });
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.geldingHorse("h1");
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("gelding");
  });

  it("renameHorse should fail for duplicate name", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), name: "OldName" });
    mock = createMockStore({
      horses: { h1: horse },
      usedHorseNames: ["takenname"],
    } as any);
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.renameHorse("h1", "TakenName");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("already in use");
  });

  it("renameHorse should fail for reserved name", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), name: "OldName" });
    mock = createMockStore({
      horses: { h1: horse },
      usedHorseNames: [],
      reservedHorseNames: [{ name: "reserved", releasedOnDay: 9999 }],
      day: 100,
    } as any);
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.renameHorse("h1", "Reserved");
    expect(result.ok).toBe(false);
    expect((result as any).reason).toContain("reserved");
  });

  it("renameHorse should enqueue intent on success", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), name: "OldName" });
    mock = createMockStore({
      horses: { h1: horse },
      usedHorseNames: [],
      reservedHorseNames: [],
    } as any);
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    const result = slice.renameHorse("h1", "NewName");
    expect(result.ok).toBe(true);
    expect(mock.enqueueIntent).toHaveBeenCalledTimes(1);
    expect(mock.enqueueIntent.mock.calls[0][0].type).toBe("rename");
  });

  it("registerHorseName should add lowercased name to usedHorseNames", () => {
    mock = createMockStore({ usedHorseNames: [] } as any);
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.registerHorseName("TestName");
    expect(mock.set).toHaveBeenCalled();
  });

  it("unregisterHorseName should remove lowercased name", () => {
    mock = createMockStore({ usedHorseNames: ["testname"] } as any);
    const slice = createHorseAdminSlice(mock.set, mock.get, mock.enqueueIntent);
    slice.unregisterHorseName("TestName");
    expect(mock.set).toHaveBeenCalled();
  });
});

describe("awardSlice", () => {
  let mock: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setAwards should set awards directly", () => {
    mock = createMockStore();
    const slice = createAwardSlice(mock.set, mock.get);
    const awards = [{ id: "a1" } as any];
    slice.setAwards(awards);
    expect(mock.set).toHaveBeenCalledWith({ awards });
  });

  it("clearPendingCeremonies should clear pending state", () => {
    mock = createMockStore({
      pendingAwardCeremonies: [{ id: "c1" }],
      currentCeremonyIndex: 0,
    } as any);
    const slice = createAwardSlice(mock.set, mock.get);
    slice.clearPendingCeremonies();
    expect(mock.set).toHaveBeenCalledWith({
      pendingAwardCeremonies: undefined,
      currentCeremonyIndex: undefined,
    });
  });

  it("setCeremonyRsvp should update matching invitation", () => {
    const inv = {
      id: "inv1",
      rsvp: "pending",
      awardYear: 2024,
      region: "USA",
      category: "horse",
      horseId: "h1",
    };
    mock = createMockStore({
      awardCeremonyInvitations: [inv],
      day: 10,
    } as any);
    const slice = createAwardSlice(mock.set, mock.get);
    slice.setCeremonyRsvp("inv1", "attending");
    expect(mock.set).toHaveBeenCalled();
    const update = (mock.set as any).mock.calls[0][0];
    expect(typeof update).toBe("function");
  });

  it("setCeremonyRsvp should not modify non-matching invitations", () => {
    const inv = { id: "inv1", rsvp: "pending" };
    mock = createMockStore({
      awardCeremonyInvitations: [inv],
      day: 10,
    } as any);
    const slice = createAwardSlice(mock.set, mock.get);
    slice.setCeremonyRsvp("inv2", "attending");
    expect(mock.set).toHaveBeenCalled();
  });

  it("bulkSetCeremonyRsvp should do nothing with empty array", () => {
    mock = createMockStore({ awardCeremonyInvitations: [] } as any);
    const slice = createAwardSlice(mock.set, mock.get);
    slice.bulkSetCeremonyRsvp([], "attending");
    expect(mock.set).not.toHaveBeenCalled();
  });

  it("bulkSetCeremonyRsvp should update matching invitations", () => {
    const inv1 = {
      id: "inv1",
      rsvp: "pending",
      awardYear: 2024,
      region: "USA",
      category: "horse",
      horseId: "h1",
    };
    const inv2 = {
      id: "inv2",
      rsvp: "pending",
      awardYear: 2024,
      region: "USA",
      category: "horse",
      horseId: "h2",
    };
    mock = createMockStore({
      awardCeremonyInvitations: [inv1, inv2],
      day: 10,
    } as any);
    const slice = createAwardSlice(mock.set, mock.get);
    slice.bulkSetCeremonyRsvp(["inv1", "inv2"], "declined");
    expect(mock.set).toHaveBeenCalled();
  });
});
