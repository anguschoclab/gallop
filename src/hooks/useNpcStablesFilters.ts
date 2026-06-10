import { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { getMajorStables, getStablesByTier } from "@/core/stable/stableQueries";

export type NpcStablesSearch = {
  q: string;
  tier: string;
};

export function useNpcStablesFilters(search: NpcStablesSearch) {
  const { q, tier } = search;
  const navigate = useNavigate();
  const npcStables = useNpcStables();

  const majorStables = useMemo(() => getMajorStables(npcStables), [npcStables]);

  const filteredStables = useMemo(() => {
    return majorStables.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.owner.toLowerCase().includes(q.toLowerCase());
      const matchesTier = tier === "all" || s.tier === tier;
      return matchesSearch && matchesTier;
    });
  }, [majorStables, q, tier]);

  const eliteStables = getStablesByTier(filteredStables, "elite");
  const midStables = getStablesByTier(filteredStables, "mid");
  const budgetStables = getStablesByTier(filteredStables, "budget");
  const fillerCount = npcStables.filter((s) => !s.isMajor).length;

  const updateFilter = useCallback(
    (key: keyof NpcStablesSearch, value: string) => {
      (navigate as any)({
        search: (prev: any) => ({ ...prev, [key]: value }),
      });
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    (navigate as any)({
      search: (prev: any) => ({ q: "", tier: "all" }),
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
