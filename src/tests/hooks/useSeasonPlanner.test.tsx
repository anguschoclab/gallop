/**
 * Characterization tests for useSeasonPlanner.
 *
 * Pins the planner's return-map contract, assignment CRUD, fee math, and
 * saved-plan round-trips ahead of the useMatingAssignments /
 * useMatingPlanActions extraction refactor.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/platform/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/domains/breeding/simulation/sireSuggestions", () => ({
  suggestBestSires: vi.fn(() => [
    { stallion: { id: "st1" }, compatibilityScore: 0.9, fee: 5000, reason: "Excellent match" },
  ]),
}));

import { useSeasonPlanner } from "@/domains/breeding/application/hooks/useSeasonPlanner";
import { createDefaultGameState } from "@/platform/game/store/state";
import { h2r } from "@/tests/helpers/sampleGameState";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/domains/breeding/model/breedingConstants";

let mockState: any;
const breedBatch = vi.fn(() => ({ ok: true }));
const saveMatingPlan = vi.fn(() => ({ ok: true, id: "p1" }));
const deleteMatingPlan = vi.fn(() => ({ ok: true }));
let savedPlans: Record<string, { entries: any[] }>;
const getSavedMatingPlan = vi.fn((id: string) => savedPlans[id]);

const mkMare = (id: string, overrides: Partial<any> = {}) => ({
  id,
  name: `Mare ${id}`,
  gender: "mare",
  age: 4,
  lifecycleStatus: "active",
  ownership: { type: "player" },
  hemisphere: "Northern",
  ...overrides,
});

const mkStallion = (id: string, overrides: Partial<any> = {}) => ({
  id,
  name: `Stallion ${id}`,
  gender: "horse",
  age: 6,
  lifecycleStatus: "active",
  ownership: { type: "npc", stableId: "npc1" },
  hemisphere: "Northern",
  stud: { atStud: true, standingFee: 5000 },
  ...overrides,
});

function seedState(overrides: Record<string, unknown> = {}) {
  mockState = {
    ...createDefaultGameState(),
    breedBatch,
    saveMatingPlan,
    deleteMatingPlan,
    getSavedMatingPlan,
    ...overrides,
  } as any;
}

beforeEach(() => {
  savedPlans = {};
  vi.clearAllMocks();
  seedState({
    horses: h2r([mkMare("m1"), mkStallion("st1")] as any),
    pregnancies: [],
    savedMatingPlans: [],
    day: 30,
    cash: 1_000_000,
  });
});

describe("useSeasonPlanner", () => {
  it("filters eligibleMares to alive, non-pregnant player-owned females aged 3+", () => {
    seedState({
      horses: h2r([
        mkMare("m1"),
        mkMare("colt1", { gender: "colt" }),
        mkMare("npc1", { ownership: { type: "npc", stableId: "s" } }),
        mkMare("dead1", { lifecycleStatus: "deceased" }),
        mkMare("preg1"),
        mkMare("young1", { age: 2 }),
      ] as any),
      pregnancies: [{ damId: "preg1", resolved: false }],
    });
    const { result } = renderHook(() => useSeasonPlanner());
    expect(result.current.eligibleMares.map((m: any) => m.id)).toEqual(["m1"]);
  });

  it("lists only living males at stud aged 3+ as availableStallions", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    expect(result.current.availableStallions.map((s: any) => s.id)).toEqual(["st1"]);
  });

  it("setSireForMare / setLFGForMare / clearMare / clearAll manage assignments", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.setSireForMare("m1", "st1"));
    expect(result.current.assignments["m1"]).toMatchObject({
      sireId: "st1",
      liveFoalGuarantee: false,
    });
    expect(result.current.assignedCount).toBe(1);

    act(() => result.current.setLFGForMare("m1", true));
    expect(result.current.assignments["m1"].liveFoalGuarantee).toBe(true);

    act(() => result.current.setLFGForMare("unassigned", true));
    expect(result.current.assignments["unassigned"]).toBeUndefined();

    act(() => result.current.clearMare("m1"));
    expect(result.current.assignments["m1"]).toBeUndefined();

    act(() => result.current.setSireForMare("m1", "st1"));
    act(() => result.current.clearAll());
    expect(result.current.assignedCount).toBe(0);
  });

  it("calculateFee charges BREEDING_FEE + stud fee for external sires, +LFG fee, 0 for own/missing", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    const external = { damId: "m1", sireId: "st1", liveFoalGuarantee: false };
    expect(result.current.calculateFee(external)).toBe(BREEDING_FEE + 5000);
    expect(result.current.calculateFee({ ...external, liveFoalGuarantee: true })).toBe(
      BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE + 5000,
    );
    expect(result.current.calculateFee({ ...external, sireId: "missing" })).toBe(0);
  });

  it("totalCost and canAffordAll track assignments and cash", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.setSireForMare("m1", "st1"));
    expect(result.current.totalCost).toBe(BREEDING_FEE + 5000);
    expect(result.current.canAffordAll).toBe(true);

    seedState({
      horses: h2r([mkMare("m1"), mkStallion("st1")] as any),
      pregnancies: [],
      savedMatingPlans: [],
      cash: 0,
    });
    const poor = renderHook(() => useSeasonPlanner());
    act(() => poor.result.current.setSireForMare("m1", "st1"));
    expect(poor.result.current.canAffordAll).toBe(false);
  });

  it("autoAssign fills unassigned mares from suggestions and keeps existing assignments", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.autoAssign());
    expect(result.current.assignments["m1"].sireId).toBe("st1");

    act(() => result.current.setSireForMare("m1", "custom"));
    act(() => result.current.autoAssign());
    expect(result.current.assignments["m1"].sireId).toBe("custom");
  });

  it("confirmAll rejects empty plans and clears assignments after a successful batch", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    let res: any;
    act(() => {
      res = result.current.confirmAll();
    });
    expect(res).toMatchObject({ ok: false });
    expect(breedBatch).not.toHaveBeenCalled();

    act(() => result.current.setSireForMare("m1", "st1"));
    act(() => {
      res = result.current.confirmAll();
    });
    expect(res).toMatchObject({ ok: true });
    expect(breedBatch).toHaveBeenCalledTimes(1);
    expect(result.current.assignedCount).toBe(0);
  });

  it("savePlan forwards assignment entries to the store action", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.setSireForMare("m1", "st1"));
    act(() => result.current.savePlan("My Plan"));
    expect(saveMatingPlan).toHaveBeenCalledWith("My Plan", [
      expect.objectContaining({ damId: "m1", sireId: "st1" }),
    ]);
  });

  it("loadPlan restores only entries whose dams are still eligible", () => {
    savedPlans["p1"] = {
      entries: [
        { damId: "m1", sireId: "st1", liveFoalGuarantee: true },
        { damId: "gone", sireId: "st2", liveFoalGuarantee: false },
      ],
    };
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.loadPlan("p1"));
    expect(Object.keys(result.current.assignments)).toEqual(["m1"]);
    expect(result.current.assignments["m1"].liveFoalGuarantee).toBe(true);
  });

  it("deletePlan forwards to the store action", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    act(() => result.current.deletePlan("p1"));
    expect(deleteMatingPlan).toHaveBeenCalledWith("p1");
  });

  it("exposes season state", () => {
    const { result } = renderHook(() => useSeasonPlanner());
    expect(typeof result.current.seasonOpen).toBe("boolean");
    expect(result.current.nextSeasonStart).toBeGreaterThanOrEqual(result.current.day);
  });
});
