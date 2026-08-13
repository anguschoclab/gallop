import { describe, it, expect, vi } from "vitest";
import { createBreedingSlice } from "@/game/store/slices/breedingSlice";
import type { StoreGet } from "@/game/store/types";
import type { MatingPlanEntry } from "@/game/store/state/breedingState";

function makeMockState(overrides: Record<string, any> = {}) {
  return {
    day: 10,
    cash: 500000,
    horses: {},
    horseMap: new Map(),
    log: [],
    pregnancies: [],
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

describe("saveMatingPlan", () => {
  it("creates plan with unique ID, stores in savedMatingPlans", () => {
    const { slice, getState } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    const result = slice.saveMatingPlan("Spring Plan", entries);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.planId).toBe("string");
      expect(result.planId.length).toBeGreaterThan(0);
    }
    const plans = (getState() as any).savedMatingPlans;
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe("Spring Plan");
    expect(plans[0].entries).toEqual(entries);
    expect(plans[0].createdDay).toBe(10);
  });

  it("allows duplicate names (no uniqueness constraint)", () => {
    const { slice, getState } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    slice.saveMatingPlan("Same Name", entries);
    slice.saveMatingPlan("Same Name", entries);
    const plans = (getState() as any).savedMatingPlans;
    expect(plans).toHaveLength(2);
    expect(plans[0].id).not.toBe(plans[1].id);
  });
});

describe("deleteMatingPlan", () => {
  it("removes plan from savedMatingPlans", () => {
    const { slice, getState } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    const result = slice.saveMatingPlan("To Delete", entries);
    if (!result.ok) throw new Error("should succeed");
    const planId = result.planId;
    expect((getState() as any).savedMatingPlans).toHaveLength(1);
    slice.deleteMatingPlan(planId);
    expect((getState() as any).savedMatingPlans).toHaveLength(0);
  });

  it("non-existent ID: no-op, no error", () => {
    const { slice, getState } = makeMockStore({});
    slice.deleteMatingPlan("nonexistent-id");
    expect((getState() as any).savedMatingPlans).toHaveLength(0);
  });
});

describe("getSavedMatingPlan", () => {
  it("returns plan by ID", () => {
    const { slice } = makeMockStore({});
    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];
    const result = slice.saveMatingPlan("Find Me", entries);
    if (!result.ok) throw new Error("should succeed");
    const plan = slice.getSavedMatingPlan(result.planId);
    expect(plan).toBeDefined();
    expect(plan?.name).toBe("Find Me");
    expect(plan?.entries).toEqual(entries);
  });

  it("returns undefined for non-existent ID", () => {
    const { slice } = makeMockStore({});
    const plan = slice.getSavedMatingPlan("nonexistent");
    expect(plan).toBeUndefined();
  });
});
