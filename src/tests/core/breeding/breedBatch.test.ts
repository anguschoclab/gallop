import { describe, it, expect, vi } from "vitest";
import { createBreedingSlice } from "@/game/store/slices/breedingSlice";
import type { StoreGet } from "@/game/store/types";
import { createTestMare, createTestStallion } from "@/tests/helpers";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE, MAX_BATCH_BREEDING } from "@/constants";
import type { Horse, StudCareer, Pregnancy } from "@/game/types";
import type { MatingPlanEntry } from "@/game/store/state/breedingState";
import { makePlayerOwned, makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

function mkStud(overrides: Partial<StudCareer> = {}): StudCareer {
  return {
    atStud: true,
    standingFee: 10000,
    previousStandingFee: undefined,
    lifetimeStakesFoals: 0,
    lifetimeG1Foals: 0,
    bookSize: 120,
    seasonBookings: 0,
    lifetimeFoals: 0,
    ...overrides,
  };
}

const day = 100;

function makeMockState(overrides: Record<string, any> = {}) {
  const mare1 = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
  const mare2 = createTestMare({ id: "mare2", name: "Mare 2", hemisphere: "Northern" });
  const sire1 = createTestStallion({
    id: "sire1",
    name: "Sire 1",
    hemisphere: "Northern",
    stud: mkStud({ standingFee: 5000 }),
    ownership: makeNpcOwned(asNpcStableId("npc-stable")),
  });
  const sire2 = createTestStallion({
    id: "sire2",
    name: "Sire 2",
    hemisphere: "Northern",
    stud: mkStud({ standingFee: 8000 }),
    ownership: makeNpcOwned(asNpcStableId("npc-stable")),
  });
  const owned = createTestStallion({
    id: "sire-owned",
    name: "Owned Sire",
    hemisphere: "Northern",
    stud: mkStud({ standingFee: 5000 }),
    ownership: makePlayerOwned(),
  });

  return {
    day,
    cash: 500000,
    horses: {
      mare1,
      mare2,
      sire1,
      sire2,
      "sire-owned": owned,
    },
    horseMap: new Map<string, Horse>(),
    log: [],
    pregnancies: [] as Pregnancy[],
    syndicates: {},
    syndicateInvestors: {},
    savedMatingPlans: [],
    ...overrides,
  };
}

function makeMockStore(initialState: Record<string, any>) {
  let state = makeMockState(initialState);
  const get: StoreGet = () => state as any;
  const set = vi.fn((partial: any) => {
    if (typeof partial === "function") {
      state = { ...state, ...partial(state) };
    } else {
      state = { ...state, ...partial };
    }
  });
  const enqueueIntent = vi.fn();
  const slice = createBreedingSlice(set as any, get, enqueueIntent);
  return { slice, getState: () => state, set, enqueueIntent };
}

describe("breedBatch", () => {
  it("batch success: all entries valid, all intents enqueued", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare2", sireId: "sire2", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r: any) => r.ok)).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(2);
  });

  it("partial failure: only valid entries enqueued, results report per-entry status", () => {
    const pregnant: Pregnancy = {
      id: "p1",
      sireId: "sire1",
      damId: "mare1",
      sireName: "Sire 1",
      damName: "Mare 1",
      conceivedDay: 50,
      dueDay: 80,
      resolved: false,
      liveFoalGuarantee: false,
      isPlayerOwned: true,
    };
    const { slice, enqueueIntent } = makeMockStore({ pregnancies: [pregnant] });
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare2", sireId: "sire2", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    const failed = result.results.find((r: any) => r.damId === "mare1");
    const success = result.results.find((r: any) => r.damId === "mare2");
    expect(failed?.ok).toBe(false);
    expect(success?.ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
  });

  it("insufficient funds: no intents enqueued", () => {
    const { slice, enqueueIntent } = makeMockStore({ cash: 100 });
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    expect(enqueueIntent).not.toHaveBeenCalled();
  });

  it("empty batch: returns ok with empty results", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const result = slice.breedBatch([]);
    expect(result.ok).toBe(true);
    expect(result.results).toEqual([]);
    expect(enqueueIntent).not.toHaveBeenCalled();
  });

  it("internal stallion (owned, no stableId): fee = 0, still enqueues intent", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire-owned", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results[0].ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = enqueueIntent.mock.calls[0][0];
    expect(intent.fee).toBe(0);
  });

  it("external stallion: fee = BREEDING_FEE + studFee + LFG", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: true },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = enqueueIntent.mock.calls[0][0];
    expect(intent.fee).toBe(BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE + 5000);
  });

  it("duplicate dam in batch: second entry fails", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare1", sireId: "sire2", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    const r1 = result.results[0];
    const r2 = result.results[1];
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.reason).toMatch(/already|batch/i);
    }
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
  });

  it("syndicate fee reduction: player-owned shares reduce stud fee", () => {
    const { slice, enqueueIntent } = makeMockStore({
      syndicates: {
        sire1: {
          id: "syn-1",
          stallionId: "sire1",
          stallionName: "Sire 1",
          totalShares: 40,
          shareHolders: { player: 20 },
          sharePrice: 50000,
          studFee: 10000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
    });
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
    const intent = enqueueIntent.mock.calls[0][0];
    // player owns 20/40 = 50% shares, so pays 50% of stud fee
    const expectedStudFee = 5000 * 0.5;
    expect(intent.fee).toBe(BREEDING_FEE + expectedStudFee);
  });

  it("rejects batch exceeding MAX_BATCH_BREEDING limit", () => {
    const { slice, enqueueIntent } = makeMockStore({});
    const entries: MatingPlanEntry[] = Array.from({ length: MAX_BATCH_BREEDING + 1 }, (_, i) => ({
      damId: `mare-${i}`,
      sireId: "sire1",
      liveFoalGuarantee: false,
    }));
    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    if (!result.ok) {
      expect(result.reason).toContain("maximum");
    }
    expect(enqueueIntent).not.toHaveBeenCalled();
  });
});
