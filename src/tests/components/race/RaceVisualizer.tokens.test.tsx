/**
 * RaceVisualizer.tokens.test.tsx
 *
 * Verifies the broadcast canvas reads its palette from CSS custom properties
 * (--broadcast-*) so theme changes propagate, with safe fallbacks when vars
 * are unset.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readCanvasTheme } from "@/domains/race/ui/broadcastCanvas";

const VARS = [
  "--broadcast-rail",
  "--broadcast-turf",
  "--broadcast-dirt",
  "--broadcast-accent",
  "--silver",
] as const;

describe("readCanvasTheme", () => {
  beforeEach(() => {
    for (const v of VARS) document.documentElement.style.removeProperty(v);
  });

  afterEach(() => {
    for (const v of VARS) document.documentElement.style.removeProperty(v);
  });

  it("falls back to built-in colors when no custom properties are set", () => {
    const theme = readCanvasTheme();
    expect(theme.turf).toBeTruthy();
    expect(theme.dirt).toBeTruthy();
    expect(theme.accent).toBeTruthy();
    expect(theme.text).toBeTruthy();
  });

  it("reads broadcast custom properties from the document", () => {
    document.documentElement.style.setProperty("--broadcast-turf", "rgb(10, 80, 40)");
    document.documentElement.style.setProperty("--broadcast-dirt", "rgb(120, 90, 60)");
    document.documentElement.style.setProperty("--broadcast-rail", "rgb(250, 250, 250)");
    document.documentElement.style.setProperty("--broadcast-accent", "rgb(250, 204, 21)");
    document.documentElement.style.setProperty("--silver", "rgb(180, 180, 190)");

    const theme = readCanvasTheme();
    expect(theme.turf).toBe("rgb(10, 80, 40)");
    expect(theme.dirt).toBe("rgb(120, 90, 60)");
    expect(theme.finish).toBe("rgb(250, 250, 250)");
    expect(theme.accent).toBe("rgb(250, 204, 21)");
    expect(theme.silkFallback).toBe("rgb(180, 180, 190)");
  });

  it("derives lane and marker stripes from the rail token via color-mix", () => {
    document.documentElement.style.setProperty("--broadcast-rail", "rgb(255, 255, 255)");
    const theme = readCanvasTheme();
    expect(theme.lane).toContain("color-mix");
    expect(theme.marker).toContain("color-mix");
  });
});
