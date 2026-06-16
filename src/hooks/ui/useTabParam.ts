import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * URL-search-param-backed tab state. Deep-linkable and back-button friendly.
 *
 * @param fallback - default tab when none/invalid is in the URL
 * @param valid - allowed tab values (guards against junk in the URL)
 */
export function useTabParam<T extends string>(fallback: T, valid: readonly T[]) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: string };

  const tab = (valid as readonly string[]).includes(search.tab ?? "")
    ? (search.tab as T)
    : fallback;

  const setTab = (next: T) => {
    navigate({
      search: { tab: next } as any,
    });
  };

  return { tab, setTab };
}
