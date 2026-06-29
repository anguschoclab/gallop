/**
 * useAuctionSaleFilters.ts - URL search-param filter state for the auction sale page.
 *
 * EXTRACTED FROM: routes/auction.$saleId.tsx
 */
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { AuctionBrowseSearch } from "@/constants/auctionSearchSchema";

const routeApi = getRouteApi("/auction/$saleId");

type NavigateFn = ReturnType<typeof routeApi.useNavigate>;

export function useAuctionSaleFilters() {
  const navigate = routeApi.useNavigate();
  const filters = routeApi.useSearch();
  const { sex, ageBand, reserveBand, q } = filters;

  const [searchDraft, setSearchDraft] = useState(q ?? "");

  // Debounced sync of search draft to URL
  useEffect(() => {
    const id = setTimeout(() => {
      (navigate as NavigateFn)({
        // Router's generic search type isn't inferable through getRouteApi here.
        search: ((prev: AuctionBrowseSearch) => ({
          ...prev,
          q: searchDraft.trim() || undefined,
        })) as never,
      });
    }, 200);
    return () => clearTimeout(id);
  }, [searchDraft, navigate]);

  // Keep local draft in sync if URL q changes externally
  useEffect(() => {
    setSearchDraft(q ?? "");
  }, [q]);

  const onUpdateFilter = useCallback(
    (
      update:
        | Partial<AuctionBrowseSearch>
        | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
    ) => {
      (navigate as NavigateFn)({
        search: ((prev: AuctionBrowseSearch) =>
          typeof update === "function" ? update(prev) : { ...prev, ...update }) as never,
      });
    },
    [navigate],
  );

  const onResetFilters = useCallback(
    () => (navigate as NavigateFn)({ search: (() => ({})) as never }),
    [navigate],
  );

  const hasActiveFilters =
    sex !== undefined ||
    ageBand !== undefined ||
    reserveBand !== undefined ||
    q !== undefined;

  return {
    filters,
    searchDraft,
    setSearchDraft,
    onUpdateFilter,
    onResetFilters,
    hasActiveFilters,
    navigate,
  };
}
