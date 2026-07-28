import { useNavigate, useSearch } from "@tanstack/react-router";

type GenericNavigateFn = (opts: {
  search?: Record<string, unknown>;
  replace?: boolean;
}) => void;

/**
 * URL-search-param-backed tab state. Deep-linkable and back-button friendly.
 *
 * @param fallback - default tab when none/invalid is in the URL
 * @param valid - allowed tab values (guards against junk in the URL)
 */
export function useTabParam<T extends string>(fallback: T, valid: readonly T[]) {
  const navigate = useNavigate() as unknown as GenericNavigateFn;
  const search = useSearch({ strict: false }) as { tab?: string };

  const tab = (valid as readonly string[]).includes(search.tab ?? "")
    ? (search.tab as T)
    : fallback;

  const setTab = (next: T) => {
    navigate({
      search: { ...search, tab: next },
    });
  };

  return { tab, setTab };
}
