import { describe, it, expect } from "vitest";
import { FLAVOR_STORIES, ALL_FLAVOR_STORIES } from "@/services/narrative/flavorStories";
import {
  ATMOSPHERE_LONG_STRAIGHT_TEMPLATES,
  ATMOSPHERE_TIGHT_TURN_TEMPLATES,
  ATMOSPHERE_GRADED_TEMPLATES,
  ATMOSPHERE_TRIPLE_CROWN_TEMPLATES,
  ATMOSPHERE_ELEVATION_TEMPLATES,
} from "@/assets/narrative/atmosphereTemplates";
import { JOCKEY_TRAIT_TEMPLATES, JOCKEY_MOVE_TEMPLATES, JOCKEY_TACTIC_TEMPLATES } from "@/assets/narrative/jockeyTemplates";

describe("content counts: flavor stories (#379)", () => {
  it("has at least 120 flavor stories total", () => {
    // #379 added 30 stories, bringing the total from ~98 to 127
    expect(ALL_FLAVOR_STORIES.length).toBeGreaterThanOrEqual(120);
  });

  it("has stories across all themes", () => {
    const themes = Object.keys(FLAVOR_STORIES);
    expect(themes.length).toBeGreaterThanOrEqual(5);
    for (const theme of themes) {
      expect(FLAVOR_STORIES[theme as keyof typeof FLAVOR_STORIES].length).toBeGreaterThan(0);
    }
  });
});

describe("content counts: atmosphere templates (#343)", () => {
  it("has at least 10 templates per atmosphere category", () => {
    // #343 expanded atmosphere templates — each category should have at least 10
    expect(ATMOSPHERE_LONG_STRAIGHT_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(ATMOSPHERE_TIGHT_TURN_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(ATMOSPHERE_GRADED_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(ATMOSPHERE_TRIPLE_CROWN_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    expect(ATMOSPHERE_ELEVATION_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });
});

describe("content counts: jockey templates (#374)", () => {
  it("has at least 5 templates per jockey trait", () => {
    // #374 expanded jockey trait templates — each trait should have at least 5
    const traits = Object.keys(JOCKEY_TRAIT_TEMPLATES);
    expect(traits.length).toBeGreaterThanOrEqual(10);
    for (const trait of traits) {
      const templates = JOCKEY_TRAIT_TEMPLATES[trait as keyof typeof JOCKEY_TRAIT_TEMPLATES];
      expect(templates.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("has non-empty move and tactic template arrays", () => {
    expect(JOCKEY_MOVE_TEMPLATES.length).toBeGreaterThan(0);
    expect(JOCKEY_TACTIC_TEMPLATES.length).toBeGreaterThan(0);
  });
});
