/**
 * useAuctionSaleFilters.ts - URL search-param filter state for the auction sale page.
 *
 * EXTRACTED FROM: routes/auction.$saleId.tsx
 */
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { AuctionBrowseSearch } from "@/components/auction/auctionSearchSchema";

const ROUTE_PATH = "/auction/$saleId" as const;

export function useAuctionSaleFilters() {
  const navigate = useNavigate({ from: ROUTE_PATH });
  const filters = useSearch({ from: ROUTE_PATH });
  const { sex, ageBand, reserveBand, q } = filters;

  const [searchDraft, setSearchDraft] = useState(q ?? "");

  // Debounced sync of search draft to URL
  useEffect(() => {
    const id = setTimeout(() => {
      navigate({
        search: (prev: AuctionBrowseSearch) => ({
          ...prev,
          q: searchDraft.trim() || undefined,
        }),
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
      update: Partial<AuctionBrowseSearch> | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
    ) => {
      navigate({
        search: (prev: AuctionBrowseSearch) =>
          typeof update === "function" ? update(prev) : { ...prev, ...update },
      });
    },
    [navigate],
  );

  const onResetFilters = useCallback(
    () => navigate({ search: () => ({}) as AuctionBrowseSearch }),
    [navigate],
  );

  const hasActiveFilters =
    sex !== undefined || ageBand !== undefined || reserveBand !== undefined || q !== undefined;

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
