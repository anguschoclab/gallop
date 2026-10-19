/**
 * headPortrait.test.tsx - Painterly horse head portrait contracts
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HeadSvg } from "@/domains/horse/ui/HeadSvg";
import {
  generateAppearanceDNA,
  getPalette,
  hashSeed,
  HORSE_PORTRAIT_SCHEMA_VERSION,
  HORSE_PORTRAIT_ASSET_VERSION,
} from "@/domains/horse/simulation/proceduralPortrait";
import type { FaceWhite, CoatColor } from "@/platform/game/types";

function renderHead(overrides: {
  id?: string;
  coat?: CoatColor;
  face?: FaceWhite;
  dna?: ReturnType<typeof generateAppearanceDNA>;
  feminine?: boolean;
}) {
  const coat = overrides.coat ?? "bay";
  const dna =
    overrides.dna ??
    generateAppearanceDNA(hashSeed(overrides.id ?? "h-1"), undefined, getPalette(coat));
  return renderToStaticMarkup(
    createElement(HeadSvg, {
      uid: `t-${overrides.id ?? "h-1"}`,
      palette: getPalette(coat),
      dna,
      feminine: overrides.feminine ?? false,
      face: overrides.face ?? "none",
      alt: "Test horse portrait",
    }),
  );
}

describe("AppearanceDNA versioning", () => {
  it("generated DNA carries current schema and asset versions", () => {
    const dna = generateAppearanceDNA(1, undefined, getPalette("bay"));
    expect(dna.schemaVersion).toBe(HORSE_PORTRAIT_SCHEMA_VERSION);
    expect(dna.assetPackVersion).toBe(HORSE_PORTRAIT_ASSET_VERSION);
  });

  it("painterly fields are within legal bounds", () => {
    for (let i = 0; i < 200; i++) {
      const dna = generateAppearanceDNA(i, undefined, getPalette("bay"));
      expect(dna.lightAngle).toBeGreaterThanOrEqual(-55);
      expect(dna.lightAngle).toBeLessThanOrEqual(55);
      expect(dna.lightStrength).toBeGreaterThan(0);
      expect(dna.lightStrength).toBeLessThanOrEqual(1);
      expect(["sleek", "sheen", "coarse"]).toContain(dna.coatTexture);
      expect(["dawn", "paddock", "stable", "dusk"]).toContain(dna.backgroundId);
      expect(["alert", "relaxed", "back"]).toContain(dna.earPose);
      expect(["tuft", "sweep", "none"]).toContain(dna.forelockStyle);
      expect(["short", "long", "roached"]).toContain(dna.maneStyle);
      expect(dna.muzzleWidth).toBeGreaterThan(0);
      expect(dna.nostrilFlare).toBeGreaterThan(0);
    }
  });
});

describe("HeadSvg", () => {
  it("renders accessible markup", () => {
    const html = renderHead({});
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Test horse portrait"');
  });

  it("markup is self-contained — no external URLs or fonts", () => {
    const html = renderHead({}).replace(/xmlns="[^"]*"/g, "");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("@font-face");
    expect(html).not.toMatch(/href="(?!#)/);
    // Internal url() references only point at local fragment ids.
    for (const m of html.matchAll(/url\(([^)]*)\)/g)) {
      expect(m[1]).toMatch(/^#?["']?#/);
    }
  });

  it("contains painterly light and grain layers", () => {
    const html = renderHead({});
    expect(html).toContain("-light");
    expect(html).toContain("-grain");
    expect(html).toContain("feTurbulence");
  });

  it("renders distinctly for each face marking and stays in bounds", () => {
    const variants = (["none", "star", "blaze", "bald"] as FaceWhite[]).map((face) =>
      renderHead({ face }),
    );
    const [none, star, blaze, bald] = variants;
    expect(star).not.toBe(none);
    expect(blaze).not.toBe(none);
    expect(bald).not.toBe(none);
    expect(blaze).not.toBe(bald);
    for (const html of variants) {
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
    }
  });

  it("uses unique gradient/filter ids per portrait", () => {
    const a = renderHead({ id: "alpha" });
    const b = renderHead({ id: "beta" });
    expect(a).toContain("t-alpha-bg");
    expect(b).toContain("t-beta-bg");
    expect(a).not.toContain("t-beta-bg");
  });

  it("produces markup for every coat color without errors", () => {
    const coats: CoatColor[] = [
      "bay",
      "dark-bay",
      "black",
      "chestnut",
      "liver-chestnut",
      "seal-brown",
      "gray",
      "white",
      "roan",
      "palomino",
      "buckskin",
      "dun",
      "grulla",
      "champagne",
    ];
    for (const coat of coats) {
      const html = renderHead({ id: `c-${coat}`, coat });
      expect(html).toContain("<svg");
      expect(html).not.toContain("NaN");
    }
  });

  it("DNA changes alter the render deterministically", () => {
    const a = renderHead({ id: "same" });
    const b = renderHead({ id: "same" });
    const c = renderHead({ id: "different" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
