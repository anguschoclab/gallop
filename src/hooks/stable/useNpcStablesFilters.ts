import { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { getMajorStables, getStablesByTier } from "@/core/stable/stableQueries";

export type NpcStablesSearch = {
  q: string;
  tier: string;
};

type GenericNavigateFn = (opts: {
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
}) => void;

export function useNpcStablesFilters(search: NpcStablesSearch) {
  const { q, tier } = search;
  const navigate = useNavigate() as unknown as GenericNavigateFn;
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
      navigate({
        search: (prev: Record<string, unknown>): Record<string, unknown> => ({ ...prev, [key]: value }),
      });
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    navigate({
      search: (): Record<string, unknown> => ({ q: "", tier: "all" }),
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
