/**
 * useRivalCareerFilters.ts - Filter and sort controls for the rival career comparison view
 *
 * Pure filtering/sorting logic lives in filterAndSortRivalCandidates so it can
 * be unit tested without React; the hook wraps it in component state.
 *
 * Dependencies: react
 * Related files: src/routes/npc-stables.rival-careers.tsx (consumer)
 */

import { useMemo, useState } from "react";

export type RivalCareerSortKey = "fame" | "wins" | "earnings" | "starts" | "age" | "name";

export interface RivalCareerCandidate {
  id: string;
  name: string;
  stableId?: string;
  age: number;
  starts: number;
  wins: number;
  earnings: number;
  fame: number;
  stage: string;
}

export interface RivalCareerFilterState {
  search: string;
  /** "all" or one of the NpcCareerStage keys */
  stage: string;
  /** "any" | "2".."6" | "7+" */
  age: string;
  /** "any" | numeric string minimum */
  minWins: string;
  minStarts: string;
  minEarnings: string;
  minFame: string;
  sort: RivalCareerSortKey;
}

export const DEFAULT_RIVAL_CAREER_FILTERS: RivalCareerFilterState = {
  search: "",
  stage: "all",
  age: "any",
  minWins: "any",
  minStarts: "any",
  minEarnings: "any",
  minFame: "any",
  sort: "fame",
};

function minOf(value: string): number {
  return value === "any" ? 0 : Number(value);
}

/**
 * Narrow and sort rival candidates. All numeric filters are inclusive
 * minimums; age supports an exact year or a "7+" floor; name sorts ascending,
 * every numeric sort key descending.
 * @param candidates
 * @param filters
 */
export function filterAndSortRivalCandidates(
  candidates: RivalCareerCandidate[],
  filters: RivalCareerFilterState,
): RivalCareerCandidate[] {
  const q = filters.search.trim().toLowerCase();
  const minWins = minOf(filters.minWins);
  const minStarts = minOf(filters.minStarts);
  const minEarnings = minOf(filters.minEarnings);
  const minFame = minOf(filters.minFame);

  const out = candidates.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (filters.stage !== "all" && c.stage !== filters.stage) return false;
    if (filters.age === "7+") {
      if (c.age < 7) return false;
    } else if (filters.age !== "any" && c.age !== Number(filters.age)) {
      return false;
    }
    if (c.wins < minWins) return false;
    if (c.starts < minStarts) return false;
    if (c.earnings < minEarnings) return false;
    if (c.fame < minFame) return false;
    return true;
  });

  const key = filters.sort;
  return [...out].sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name);
    const va = a[key];
    const vb = b[key];
    return vb - va;
  });
}

/**
 * True when any filter differs from its default (drives the Reset button).
 * @param filters
 */
export function hasActiveRivalCareerFilters(filters: RivalCareerFilterState): boolean {
  const d = DEFAULT_RIVAL_CAREER_FILTERS;
  return (
    filters.search !== d.search ||
    filters.stage !== d.stage ||
    filters.age !== d.age ||
    filters.minWins !== d.minWins ||
    filters.minStarts !== d.minStarts ||
    filters.minEarnings !== d.minEarnings ||
    filters.minFame !== d.minFame
  );
}

export function useRivalCareerFilters(candidates: RivalCareerCandidate[]) {
  const [filters, setFilters] = useState<RivalCareerFilterState>(DEFAULT_RIVAL_CAREER_FILTERS);

  const patch = (p: Partial<RivalCareerFilterState>) => setFilters((prev) => ({ ...prev, ...p }));

  const filtered = useMemo(
    () => filterAndSortRivalCandidates(candidates, filters),
    [candidates, filters],
  );

  const reset = () => setFilters(DEFAULT_RIVAL_CAREER_FILTERS);

  return {
    filters,
    patch,
    filtered,
    reset,
    hasActiveFilters: hasActiveRivalCareerFilters(filters),
  };
}
