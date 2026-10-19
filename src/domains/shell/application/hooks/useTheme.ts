import { useEffect } from "react";
import { useGame } from "@/platform/game/store";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

/** localStorage key used to cache the resolved theme for pre-hydration reads. */
export const THEME_STORAGE_KEY = "gallop.theme";

const SYSTEM_QUERY = "(prefers-color-scheme: light)";

/**
 * Resolve a user's theme preference into a concrete theme.
 * Unknown/missing preferences (e.g. saves predating the field) resolve to dark.
 */
export function resolveTheme(
  preference: ThemePreference | undefined,
  systemTheme: ResolvedTheme | null,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  if (preference === "system") return systemTheme ?? "dark";
  return "dark";
}

/** Apply the resolved theme to an element (normally document.documentElement). */
export function applyThemeClass(el: HTMLElement, theme: ResolvedTheme) {
  el.classList.toggle("dark", theme === "dark");
  el.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode, tests); theme still applies.
  }
}

function systemThemeFromMedia(): ResolvedTheme | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(SYSTEM_QUERY).matches ? "light" : "dark";
}

/**
 * Applies the user's display.theme setting to <html>. Dark is the default
 * (racing noir is the product identity); "system" follows the OS preference
 * and re-resolves when it changes.
 */
export function useTheme() {
  const preference = useGame((s) => s.userSettings?.display?.theme) ?? "dark";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () =>
      applyThemeClass(document.documentElement, resolveTheme(preference, systemThemeFromMedia()));
    apply();
    if (preference !== "system" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(SYSTEM_QUERY);
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [preference]);
}
