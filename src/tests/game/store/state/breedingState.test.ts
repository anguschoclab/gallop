import { describe, it, expect } from "vitest";
import { createDefaultBreedingState } from "@/game/store/state/breedingState";

describe("createDefaultBreedingState", () => {
  it("pregnancies is empty array", () => {
    const state = createDefaultBreedingState();
    expect(state.pregnancies).toEqual([]);
  });

  it("triplecrownHistory is empty array", () => {
    const state = createDefaultBreedingState();
    expect(state.triplecrownHistory).toEqual([]);
  });

  it("activeBreedingProgram is null", () => {
    const state = createDefaultBreedingState();
    expect(state.activeBreedingProgram).toBeNull();
  });

  it("syndicates is empty object", () => {
    const state = createDefaultBreedingState();
    expect(state.syndicates).toEqual({});
  });

  it("returns a new object each call", () => {
    const a = createDefaultBreedingState();
    const b = createDefaultBreedingState();
    expect(a).not.toBe(b);
    expect(a.pregnancies).not.toBe(b.pregnancies);
    expect(a.syndicates).not.toBe(b.syndicates);
  });
});
