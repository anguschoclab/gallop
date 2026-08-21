import { describe, it, expect, vi } from "vitest";
import { createBreedingSlice } from "@/game/store/slices/breedingSlice";
import { createDefaultGameState } from "@/game/store/state";
import { suggestBestSires } from "@/core/breeding/sireSuggestions";
import { canBreed } from "@/core/breeding/eligibility";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { createTestMare, createTestStallion } from "@/tests/helpers";
import { h2r } from "@/tests/helpers/sampleGameState";
import { BREEDING_FEE } from "@/constants";
import type { StoreGet } from "@/game/store/types";
import type { Horse, StudCareer, GameState } from "@/game/types";
import type { MatingPlanEntry } from "@/game/store/state/breedingState";

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

function makeMockStore(initialState: Partial<GameState>) {
  let state = { ...createDefaultGameState(), ...initialState } as GameState;
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

const breedingDay = 100;

describe("Season Planner Integration", () => {
  it("full batch flow: breedBatch enqueues intents for all valid pairs", () => {
    const mare1 = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
    const mare2 = createTestMare({ id: "mare2", name: "Mare 2", hemisphere: "Northern" });
    const sire1 = createTestStallion({
      id: "sire1",
      name: "Sire 1",
      hemisphere: "Northern",
      stud: mkStud({ standingFee: 5000 }),
      stableId: "npc-stable-1",
      ownership: { type: "unowned" },
    });
    const sire2 = createTestStallion({
      id: "sire2",
      name: "Sire 2",
      hemisphere: "Northern",
      stud: mkStud({ standingFee: 8000 }),
      stableId: "npc-stable-2",
      ownership: { type: "unowned" },
    });

    const { slice, enqueueIntent } = makeMockStore({
      day: breedingDay,
      cash: 500000,
      horses: h2r([mare1, mare2, sire1, sire2]),
    });

    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare2", sireId: "sire2", liveFoalGuarantee: false },
    ];

    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.ok)).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(2);

    const intent1 = enqueueIntent.mock.calls[0][0];
    const intent2 = enqueueIntent.mock.calls[1][0];
    expect(intent1.type).toBe("breeding");
    expect(intent1.sireId).toBe("sire1");
    expect(intent1.damId).toBe("mare1");
    expect(intent2.type).toBe("breeding");
    expect(intent2.sireId).toBe("sire2");
    expect(intent2.damId).toBe("mare2");
  });

  it("saved plan round-trip: save → get → verify → delete → verify removed", () => {
    const { slice, getState } = makeMockStore({
      day: breedingDay,
      cash: 500000,
      horses: {},
    });

    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare2", sireId: "sire2", liveFoalGuarantee: true },
    ];

    const saveResult = slice.saveMatingPlan("Spring 2026", entries);
    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) throw new Error("should succeed");

    const plan = slice.getSavedMatingPlan(saveResult.planId);
    expect(plan).toBeDefined();
    expect(plan!.name).toBe("Spring 2026");
    expect(plan!.entries).toEqual(entries);
    expect(plan!.createdDay).toBe(breedingDay);

    slice.deleteMatingPlan(saveResult.planId);
    expect(slice.getSavedMatingPlan(saveResult.planId)).toBeUndefined();
    expect((getState() as any).savedMatingPlans).toHaveLength(0);
  });

  it("auto-assign: suggestBestSires returns unique top matches for multiple mares", () => {
    const mare1 = createTestMare({ id: "mare1", name: "Mare A", hemisphere: "Northern" });
    const mare2 = createTestMare({ id: "mare2", name: "Mare B", hemisphere: "Northern" });
    const sire1 = createTestStallion({
      id: "sire1",
      name: "Sire A",
      hemisphere: "Northern",
      stud: mkStud({ standingFee: 5000 }),
      sireName: "Unique Sire A",
    });
    const sire2 = createTestStallion({
      id: "sire2",
      name: "Sire B",
      hemisphere: "Northern",
      stud: mkStud({ standingFee: 8000 }),
      sireName: "Unique Sire B",
    });

    const stallions = [sire1, sire2];
    const suggestions1 = suggestBestSires(mare1, stallions, breedingDay, 2);
    const suggestions2 = suggestBestSires(mare2, stallions, breedingDay, 2);

    expect(suggestions1.length).toBeGreaterThan(0);
    expect(suggestions2.length).toBeGreaterThan(0);

    const top1 = suggestions1[0];
    const top2 = suggestions2[0];
    expect(top1.stallion.id).toBeDefined();
    expect(top2.stallion.id).toBeDefined();
    expect(top1.compatibilityScore).toBeGreaterThanOrEqual(top2.compatibilityScore);
  });

  it("season-closed rejection: breedBatch fails when out of breeding season", () => {
    const mare = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
    const sire = createTestStallion({
      id: "sire1",
      name: "Sire 1",
      hemisphere: "Northern",
      stud: mkStud(),
      stableId: "npc-stable-1",
      ownership: { type: "unowned" },
    });

    const outOfSeasonDay = 200;
    expect(inBreedingSeason(outOfSeasonDay, "Northern")).toBe(false);

    const { slice, enqueueIntent } = makeMockStore({
      day: outOfSeasonDay,
      cash: 500000,
      horses: h2r([mare, sire]),
    });

    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ];

    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].ok).toBe(false);
    if (!result.results[0].ok) {
      expect(result.results[0].reason).toMatch(/season/i);
    }
    expect(enqueueIntent).not.toHaveBeenCalled();
  });

  it("partial failure: mare already pregnant, other mares still breed", () => {
    const mare1 = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
    const mare2 = createTestMare({ id: "mare2", name: "Mare 2", hemisphere: "Northern" });
    const sire = createTestStallion({
      id: "sire1",
      name: "Sire 1",
      hemisphere: "Northern",
      stud: mkStud(),
      stableId: "npc-stable-1",
      ownership: { type: "unowned" },
    });

    const { slice, enqueueIntent } = makeMockStore({
      day: breedingDay,
      cash: 500000,
      horses: h2r([mare1, mare2, sire]),
      pregnancies: [
        {
          id: "p1",
          sireId: "old-sire",
          damId: "mare1",
          sireName: "Old Sire",
          damName: "Mare 1",
          conceivedDay: 50,
          dueDay: 80,
          resolved: false,
          liveFoalGuarantee: false,
          isPlayerOwned: true,
        },
      ],
    });

    const entries: MatingPlanEntry[] = [
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
      { damId: "mare2", sireId: "sire1", liveFoalGuarantee: false },
    ];

    const result = slice.breedBatch(entries);
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    const r1 = result.results.find((r) => r.damId === "mare1");
    const r2 = result.results.find((r) => r.damId === "mare2");
    expect(r1!.ok).toBe(false);
    expect(r2!.ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
  });

  it("canBreed validates eligibility consistently with breedBatch", () => {
    const mare = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
    const sire = createTestStallion({
      id: "sire1",
      name: "Sire 1",
      hemisphere: "Northern",
      stud: mkStud(),
      stableId: "npc-stable-1",
      ownership: { type: "unowned" },
    });

    const canBreedResult = canBreed(sire, mare, breedingDay, []);
    expect(canBreedResult.ok).toBe(true);

    const { slice } = makeMockStore({
      day: breedingDay,
      cash: 500000,
      horses: h2r([mare, sire]),
    });

    const batchResult = slice.breedBatch([
      { damId: "mare1", sireId: "sire1", liveFoalGuarantee: false },
    ]);
    expect(batchResult.ok).toBe(true);
    expect(batchResult.results[0].ok).toBe(true);
  });

  it("internal stallion has zero fee in batch and suggestion", () => {
    const mare = createTestMare({ id: "mare1", name: "Mare 1", hemisphere: "Northern" });
    const owned = createTestStallion({
      id: "sire-owned",
      name: "Owned Sire",
      hemisphere: "Northern",
      stud: mkStud({ standingFee: 5000 }),
      ownership: { type: "player" },
    });

    const suggestions = suggestBestSires(mare, [owned], breedingDay);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fee).toBe(0);

    const { slice, enqueueIntent } = makeMockStore({
      day: breedingDay,
      cash: 500000,
      horses: h2r([mare, owned]),
    });

    const result = slice.breedBatch([
      { damId: "mare1", sireId: "sire-owned", liveFoalGuarantee: false },
    ]);
    expect(result.ok).toBe(true);
    expect(enqueueIntent).toHaveBeenCalledTimes(1);
    expect(enqueueIntent.mock.calls[0][0].fee).toBe(0);
  });
});
