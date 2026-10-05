import { describe, it, expect } from "vitest";
import {
  REGIONAL_CONFIGS,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
  AWARD_REGION_ORDER,
  AWARD_CATEGORY_ORDER,
  REGIONAL_SCORING,
  SURFACE_BONUSES,
  AWARD_CEREMONY_SCHEDULE,
} from "@/core/awards/types";

describe("awards/types", () => {
  it("all categories defined in configs have display names and descriptions", () => {
    Object.values(REGIONAL_CONFIGS).forEach((config) => {
      config.categories.forEach((category) => {
        expect(CATEGORY_DISPLAY_NAMES).toHaveProperty(category);
        expect(typeof CATEGORY_DISPLAY_NAMES[category]).toBe("string");

        expect(CATEGORY_DESCRIPTIONS).toHaveProperty(category);
        expect(typeof CATEGORY_DESCRIPTIONS[category]).toBe("string");
      });
    });
  });

  it("all regions have scoring weights, surface bonuses, and order defined", () => {
    const regions = Object.keys(REGIONAL_CONFIGS) as Array<keyof typeof REGIONAL_CONFIGS>;

    regions.forEach((region) => {
      expect(REGIONAL_SCORING).toHaveProperty(region);
      expect(SURFACE_BONUSES).toHaveProperty(region);
      expect(AWARD_REGION_ORDER).toHaveProperty(region);
      expect(typeof AWARD_REGION_ORDER[region]).toBe("number");
    });
  });

  it("ceremony schedule matches regions and config days", () => {
    expect(AWARD_CEREMONY_SCHEDULE).toHaveLength(4);

    AWARD_CEREMONY_SCHEDULE.forEach((ceremony) => {
      const config = REGIONAL_CONFIGS[ceremony.region];
      expect(config).toBeDefined();
      expect(ceremony.dayOfYear).toBe(config.ceremonyDay);
      expect(ceremony.name).toBe(config.displayName);
    });
  });

  it("award category order maps every display name to an index", () => {
    Object.keys(CATEGORY_DISPLAY_NAMES).forEach((category) => {
      expect(AWARD_CATEGORY_ORDER).toHaveProperty(category);
      expect(typeof AWARD_CATEGORY_ORDER[category]).toBe("number");
    });
  });
});
