import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  getAwardSvg,
  getRegionColor,
  getRegionAccent,
  REGION_COLORS,
  REGION_COLOR_CLASSES,
} from "@/assets/awards";
import type { AwardRegion, RegionalAwardCategory } from "@/core/awards/types";

const ALL_REGIONS: AwardRegion[] = ["north_america", "europe", "asia_pacific", "south_america"];

const EXPECTED_REGION_COLORS: Record<AwardRegion, string> = {
  north_america: "#1E3A5F",
  europe: "#4B0082",
  asia_pacific: "#006400",
  south_america: "#8B0000",
};

const EXPECTED_REGION_ACCENTS: Record<AwardRegion, string> = {
  north_america: "#C9A227",
  europe: "#C0C0C0",
  asia_pacific: "#FFD700",
  south_america: "#FFD700",
};

const NON_HOTY_CATEGORIES: RegionalAwardCategory[] = [
  "champion_2yo_male",
  "champion_2yo_colt",
  "champion_2yo",
  "potrillo_del_ano",
];

describe("getAwardSvg", () => {
  it("returns an object with Icon, color, and accent for every region × HOTY", () => {
    for (const region of ALL_REGIONS) {
      const svg = getAwardSvg(region, "horse_of_the_year");
      expect(svg.Icon).toBeDefined();
      expect(typeof svg.Icon).toBe("function");
      expect(svg.color).toBeTruthy();
      expect(typeof svg.color).toBe("string");
      expect(svg.accent).toBeTruthy();
      expect(typeof svg.accent).toBe("string");
    }
  });

  it("returns an object with Icon, color, and accent for every region × non-HOTY", () => {
    for (let i = 0; i < ALL_REGIONS.length; i++) {
      const region = ALL_REGIONS[i];
      const category = NON_HOTY_CATEGORIES[i];
      const svg = getAwardSvg(region, category);
      expect(svg.Icon).toBeDefined();
      expect(typeof svg.Icon).toBe("function");
      expect(svg.color).toBeTruthy();
      expect(typeof svg.color).toBe("string");
      expect(svg.accent).toBeTruthy();
      expect(typeof svg.accent).toBe("string");
    }
  });

  it("returns the HOTY icon for horse_of_the_year category", () => {
    for (const region of ALL_REGIONS) {
      const svg = getAwardSvg(region, "horse_of_the_year");
      const html = renderToStaticMarkup(createElement(svg.Icon, { width: 48, height: 48 }));
      expect(html).toContain("HOTY");
    }
  });

  it("returns the category icon for non-HOTY categories", () => {
    for (let i = 0; i < ALL_REGIONS.length; i++) {
      const region = ALL_REGIONS[i];
      const category = NON_HOTY_CATEGORIES[i];
      const svg = getAwardSvg(region, category);
      const html = renderToStaticMarkup(createElement(svg.Icon, { width: 48, height: 48 }));
      expect(html).toContain("Category");
    }
  });

  it("returns correct primary color for each region", () => {
    for (const region of ALL_REGIONS) {
      const svg = getAwardSvg(region, "horse_of_the_year");
      expect(svg.color).toBe(EXPECTED_REGION_COLORS[region]);
    }
  });

  it("returns correct hoty accent for each region", () => {
    for (const region of ALL_REGIONS) {
      const svg = getAwardSvg(region, "horse_of_the_year");
      expect(svg.accent).toBe(EXPECTED_REGION_ACCENTS[region]);
    }
  });

  it("NA hoty accent is #C9A227 (not #C0C0C0) — regression guard", () => {
    const svg = getAwardSvg("north_america", "horse_of_the_year");
    expect(svg.accent).toBe("#C9A227");
    expect(svg.accent).not.toBe("#C0C0C0");
  });

  it("NA category accent is #C0C0C0 (differs from hoty)", () => {
    const svg = getAwardSvg("north_america", "champion_2yo_male");
    expect(svg.accent).toBe("#C0C0C0");
  });
});

describe("getRegionColor", () => {
  it("returns correct primary color for each region", () => {
    for (const region of ALL_REGIONS) {
      expect(getRegionColor(region)).toBe(EXPECTED_REGION_COLORS[region]);
    }
  });
});

describe("getRegionAccent", () => {
  it("returns correct hoty accent for each region", () => {
    for (const region of ALL_REGIONS) {
      expect(getRegionAccent(region)).toBe(EXPECTED_REGION_ACCENTS[region]);
    }
  });
});

describe("REGION_COLORS", () => {
  it("has all 4 regions", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_COLORS[region]).toBeDefined();
    }
  });

  it("each entry has bg and accent CSS var strings", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_COLORS[region].bg).toBeTruthy();
      expect(REGION_COLORS[region].bg).toContain("var(");
      expect(REGION_COLORS[region].accent).toBeTruthy();
      expect(REGION_COLORS[region].accent).toContain("var(");
    }
  });
});

describe("REGION_COLOR_CLASSES", () => {
  it("has all 4 regions", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_COLOR_CLASSES[region]).toBeDefined();
    }
  });

  it("each entry is a non-empty string", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_COLOR_CLASSES[region]).toBeTruthy();
      expect(typeof REGION_COLOR_CLASSES[region]).toBe("string");
      expect(REGION_COLOR_CLASSES[region].length).toBeGreaterThan(0);
    }
  });
});
