import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Horse } from "@/core/horse/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestGenotype } from "@/tests/helpers/createTestGenotype";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/core/horse/horseFactory", () => ({
  ensurePhenotypeResolved: (h: Horse) => h,
}));

vi.mock("@/core/horse/stats", () => ({
  calculateOverallRating: (h: Horse) => h.potential ?? 50,
}));

import { useGalleryFilters } from "@/hooks/horse/useGalleryFilters";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

let mockState: any;

beforeEach(() => {
  mockState = {
    horses: {},
  };
});

function mkHorse(id: string, overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    ownership: makePlayerOwned(),
    ...overrides,
  });
}

describe("useGalleryFilters — trait filtering", () => {
  it("returns all horses when no filters applied", () => {
    mockState.horses = {
      h1: mkHorse("h1", { runningStyle: "E" }),
      h2: mkHorse("h2", { runningStyle: "S" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    expect(result.current.filteredHorses).toHaveLength(2);
  });

  it("filters by runningStyle 'E'", () => {
    mockState.horses = {
      h1: mkHorse("h1", { runningStyle: "E" }),
      h2: mkHorse("h2", { runningStyle: "S" }),
      h3: mkHorse("h3", { runningStyle: "E" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setTraitCategory("runningStyle");
      result.current.setTraitFilter("E");
    });
    const ids = result.current.filteredHorses.map((h) => h.id);
    expect(ids).toContain("h1");
    expect(ids).toContain("h3");
    expect(ids).not.toContain("h2");
  });

  it("filters by fiberBias 'sprinter'", () => {
    mockState.horses = {
      h1: mkHorse("h1", { fiberBias: "sprinter" }),
      h2: mkHorse("h2", { fiberBias: "stayer" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setTraitCategory("fiberBias");
      result.current.setTraitFilter("sprinter");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("filters by temperament 'excellent' using resolved genotype", () => {
    mockState.horses = {
      h1: mkHorse("h1", {
        genotype: createTestGenotype({ mental: [5, 5] as [number, number] }),
      }),
      h2: mkHorse("h2", {
        genotype: createTestGenotype({ mental: [1, 1] as [number, number] }),
      }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setTraitCategory("temperament");
      result.current.setTraitFilter("excellent");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("filters by constitution 'poor' using resolved genotype", () => {
    mockState.horses = {
      h1: mkHorse("h1", {
        genotype: createTestGenotype({ physical: [1, 1] as [number, number] }),
      }),
      h2: mkHorse("h2", {
        genotype: createTestGenotype({ physical: [5, 5] as [number, number] }),
      }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setTraitCategory("constitution");
      result.current.setTraitFilter("poor");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("combined coat + trait filter works", () => {
    mockState.horses = {
      h1: mkHorse("h1", { coatColor: "bay", runningStyle: "E" }),
      h2: mkHorse("h2", { coatColor: "bay", runningStyle: "S" }),
      h3: mkHorse("h3", { coatColor: "black", runningStyle: "E" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setCoatFilter("bay");
      result.current.setTraitCategory("runningStyle");
      result.current.setTraitFilter("E");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("trait filter 'all' returns all horses (no filtering)", () => {
    mockState.horses = {
      h1: mkHorse("h1", { runningStyle: "E" }),
      h2: mkHorse("h2", { runningStyle: "S" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setTraitCategory("runningStyle");
      result.current.setTraitFilter("all");
    });
    expect(result.current.filteredHorses).toHaveLength(2);
  });

  it("text search matches horse name", () => {
    mockState.horses = {
      h1: mkHorse("h1", { name: "Thunder" }),
      h2: mkHorse("h2", { name: "Lightning" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setSearch("thun");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].name).toBe("Thunder");
  });

  it("text search matches trait values (e.g. 'sprinter' matches fiberBias)", () => {
    mockState.horses = {
      h1: mkHorse("h1", { name: "Alpha", fiberBias: "sprinter" }),
      h2: mkHorse("h2", { name: "Beta", fiberBias: "stayer" }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setSearch("sprinter");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("text search matches resolved temperament rating", () => {
    mockState.horses = {
      h1: mkHorse("h1", {
        name: "Alpha",
        genotype: createTestGenotype({
          mental: [5, 5] as [number, number],
          physical: [1, 1] as [number, number],
        }),
      }),
      h2: mkHorse("h2", {
        name: "Beta",
        genotype: createTestGenotype({
          mental: [1, 1] as [number, number],
          physical: [1, 1] as [number, number],
        }),
      }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    act(() => {
      result.current.setSearch("excellent");
    });
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });

  it("only owned horses are included", () => {
    mockState.horses = {
      h1: mkHorse("h1", { ownership: makePlayerOwned() }),
      h2: mkHorse("h2", { ownership: makeUnowned() }),
    };
    const { result } = renderHook(() => useGalleryFilters());
    expect(result.current.filteredHorses).toHaveLength(1);
    expect(result.current.filteredHorses[0].id).toBe("h1");
  });
});
