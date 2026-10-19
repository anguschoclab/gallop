import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createDefaultUserSettings } from "@/domains/settings/model/settingsTypes";
import {
  applyThemeClass,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "@/domains/shell/application/hooks/useTheme";

describe("settings.theme", () => {
  it("defaults to dark", () => {
    expect(createDefaultUserSettings().display.theme).toBe("dark");
  });
});

describe("resolveTheme", () => {
  it("passes through explicit dark/light", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("resolves system via media preference", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", null)).toBe("dark");
  });

  it("treats missing theme as dark", () => {
    expect(resolveTheme(undefined, "light")).toBe("dark");
  });
});

describe("applyThemeClass", () => {
  let el: HTMLElement;
  beforeEach(() => {
    el = document.createElement("html");
  });
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it("adds .dark for dark theme and removes .light", () => {
    el.classList.add("light");
    applyThemeClass(el, "dark");
    expect(el.classList.contains("dark")).toBe(true);
    expect(el.classList.contains("light")).toBe(false);
  });

  it("adds .light for light theme and removes .dark", () => {
    el.classList.add("dark");
    applyThemeClass(el, "light");
    expect(el.classList.contains("light")).toBe(true);
    expect(el.classList.contains("dark")).toBe(false);
  });

  it("caches the resolved theme for pre-hydration reads", () => {
    applyThemeClass(el, "light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
