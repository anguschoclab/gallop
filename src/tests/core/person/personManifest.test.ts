/**
 * personManifest.test.ts - Person portrait asset manifest contracts
 */

import { describe, it, expect } from "vitest";
import {
  FACE_BASES,
  getFacePath,
  getSkinTone,
  getHairColor,
  getEyeColor,
  isRacewearContext,
} from "@/domains/person/ui/portrait-assets/manifest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PORTRAIT_SRC = join(__dirname, "../../../domains/person/ui/PersonPortrait.tsx");

describe("person manifest", () => {
  it("face base IDs are unique and non-empty", () => {
    const ids = Object.keys(FACE_BASES);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) expect(id).toMatch(/^[a-z-]+$/);
  });

  it("every face base renders a valid path at all target sizes", () => {
    for (const id of Object.keys(FACE_BASES)) {
      for (const [w, h] of [
        [30, 36],
        [55, 66],
        [95, 114],
        [200, 240],
      ]) {
        const d = getFacePath(id, w, h);
        expect(d.startsWith("M")).toBe(true);
        expect(d).not.toContain("NaN");
        expect(d).not.toContain("undefined");
      }
    }
  });

  it("unknown face base falls back to oval without throwing", () => {
    expect(getFacePath("nonexistent", 55, 66)).toBe(getFacePath("oval", 55, 66));
  });

  it("palette lookups return the stored color token", () => {
    expect(getSkinTone("#e0ac69")).toBe("#e0ac69");
    expect(getHairColor("#3b2410")).toBe("#3b2410");
    expect(getEyeColor("#2a4a7a")).toBe("#2a4a7a");
  });

  it("racewear context detection is exact", () => {
    expect(isRacewearContext("jockey-racewear")).toBe(true);
    expect(isRacewearContext("jockey-casual")).toBe(false);
    expect(isRacewearContext("owner-formal")).toBe(false);
  });
});

describe("person renderer self-containment", () => {
  it("portrait source contains no external resource references", () => {
    const src = readFileSync(PORTRAIT_SRC, "utf8");
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toContain("@font-face");
    expect(src).not.toMatch(/url\((?!#)/);
  });

  it("portrait source performs no runtime network requests or random calls", () => {
    const src = readFileSync(PORTRAIT_SRC, "utf8");
    expect(src).not.toContain("fetch(");
    expect(src).not.toContain("Math.random");
    expect(src).not.toContain("crypto.randomUUID");
  });
});
