import { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { getMajorStables, getStablesByTier } from "@/core/stable/stableQueries";
import { evaluateCashPressure } from "@/core/stable/cashPressure";

/** Cash-pressure filter buckets, from flush to desperate. */
export const CASH_PRESSURE_FILTERS = [
  { value: "all", label: "Any cash pressure" },
  { value: "comfortable", label: "Flush" },
  { value: "tight", label: "Cash tight" },
  { value: "strained", label: "Short of cash" },
  { value: "desperate", label: "Desperate" },
  { value: "pressured", label: "Any pressure (tight+)" },
] as const;

/** Sort options for the rival stable directory. */
export const NPC_STABLE_SORTS = [
  { value: "name", label: "Name" },
  { value: "pressure-desc", label: "Cash pressure: high to low" },
  { value: "pressure-asc", label: "Cash pressure: low to high" },
  { value: "reputation", label: "Reputation" },
] as const;

export type NpcStablesSearch = {
  q: string;
  tier: string;
  pressure: string;
  sort: string;
};

type GenericNavigateFn = (opts: {
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
}) => void;

export function useNpcStablesFilters(search: NpcStablesSearch) {
  const { q, tier, pressure, sort } = search;
  const navigate = useNavigate() as unknown as GenericNavigateFn;
  const npcStables = useNpcStables();

  const majorStables = useMemo(() => getMajorStables(npcStables), [npcStables]);

  const filteredStables = useMemo(() => {
    const matches = majorStables.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.owner.toLowerCase().includes(q.toLowerCase());
      const matchesTier = tier === "all" || s.tier === tier;
      const label = evaluateCashPressure(s).label;
      const matchesPressure =
        pressure === "all" ||
        (pressure === "pressured" ? label !== "comfortable" : label === pressure);
      return matchesSearch && matchesTier && matchesPressure;
    });

    const sorted = [...matches];
    if (sort === "pressure-desc" || sort === "pressure-asc") {
      const dir = sort === "pressure-desc" ? -1 : 1;
      sorted.sort((a, b) => dir * (evaluateCashPressure(a).meter - evaluateCashPressure(b).meter));
    } else if (sort === "reputation") {
      sorted.sort((a, b) => b.reputation - a.reputation);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [majorStables, q, tier, pressure, sort]);

  const eliteStables = getStablesByTier(filteredStables, "elite");
  const midStables = getStablesByTier(filteredStables, "mid");
  const budgetStables = getStablesByTier(filteredStables, "budget");
  const fillerCount = npcStables.filter((s) => !s.isMajor).length;

  const updateFilter = useCallback(
    (key: keyof NpcStablesSearch, value: string) => {
      navigate({
        search: (prev: Record<string, unknown>): Record<string, unknown> => ({
          ...prev,
          [key]: value,
        }),
      });
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    navigate({
      search: (): Record<string, unknown> => ({
        q: "",
        tier: "all",
        pressure: "all",
        sort: "name",
      }),
    });
  }, [navigate]);

  return {
    npcStables,
    filteredStables,
    eliteStables,
    midStables,
    budgetStables,
    fillerCount,
    updateFilter,
    clearFilters,
  };
}
