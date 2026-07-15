import { useMemo, useState } from "react";

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface UseLeaderboardControlsConfig<T> {
  items: T[];
  sortOptions: SortOption[];
  filterOptions?: FilterOption[];
  defaultSort?: string;
  defaultFilter?: string;
  searchFn?: (item: T, query: string) => boolean;
  sortFns: Record<string, (a: T, b: T) => number>;
  filterFns?: Record<string, (item: T) => boolean>;
}

export interface UseLeaderboardControlsResult<T> {
  sortValue: string;
  setSortValue: (v: string) => void;
  filterValue: string;
  setFilterValue: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  processed: T[];
  sortOptions: SortOption[];
  filterOptions?: FilterOption[];
}

export function useLeaderboardControls<T>({
  items,
  sortOptions,
  filterOptions,
  defaultSort,
  defaultFilter,
  searchFn,
  sortFns,
  filterFns,
}: UseLeaderboardControlsConfig<T>): UseLeaderboardControlsResult<T> {
  const [sortValue, setSortValue] = useState(defaultSort ?? sortOptions[0]?.value ?? "");
  const [filterValue, setFilterValue] = useState(
    defaultFilter ?? filterOptions?.[0]?.value ?? "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const processed = useMemo(() => {
    let result = items;

    if (filterFns && filterValue !== "all" && filterFns[filterValue]) {
      result = result.filter(filterFns[filterValue]);
    }

    if (searchFn && searchQuery.trim()) {
      const q = searchQuery.trim();
      result = result.filter((item) => searchFn(item, q));
    }

    const sortFn = sortFns[sortValue];
    if (sortFn) {
      result = [...result].sort(sortFn);
    }

    return result;
  }, [items, filterValue, searchQuery, sortValue, filterFns, searchFn, sortFns]);

  return {
    sortValue,
    setSortValue,
    filterValue,
    setFilterValue,
    searchQuery,
    setSearchQuery,
    processed,
    sortOptions,
    filterOptions,
  };
}
