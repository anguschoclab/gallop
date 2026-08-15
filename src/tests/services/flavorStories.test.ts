import { describe, it, expect } from "vitest";
import { FLAVOR_STORIES, ALL_FLAVOR_STORIES } from "@/services/narrative/flavorStories";

describe("flavorStories data", () => {
  it("dictionary has all 6 themes", () => {
    const themes = Object.keys(FLAVOR_STORIES);
    expect(themes).toContain("track");
    expect(themes).toContain("jockeys");
    expect(themes).toContain("breeding");
    expect(themes).toContain("weather");
    expect(themes).toContain("community");
    expect(themes).toContain("industry");
    expect(themes).toHaveLength(6);
  });

  it("every theme has at least 2 stories", () => {
    for (const [theme, stories] of Object.entries(FLAVOR_STORIES)) {
      expect(stories.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every story has valid headline, body, category", () => {
    for (const [theme, stories] of Object.entries(FLAVOR_STORIES)) {
      for (const story of stories) {
        expect(story.headline).toBeTruthy();
        expect(story.headline.length).toBeGreaterThan(5);
        expect(story.body).toBeTruthy();
        expect(story.body.length).toBeGreaterThan(20);
        expect(story.category).toBeDefined();
      }
    }
  });

  it("all categories are 'flavor'", () => {
    for (const story of ALL_FLAVOR_STORIES) {
      expect(story.category).toBe("flavor");
    }
  });

  it("no duplicate headlines in ALL_FLAVOR_STORIES", () => {
    const headlines = ALL_FLAVOR_STORIES.map((s) => s.headline);
    const unique = new Set(headlines);
    expect(unique.size).toBe(headlines.length);
  });

  it("ALL_FLAVOR_STORIES count equals 40", () => {
    expect(ALL_FLAVOR_STORIES.length).toBe(40);
  });

  it("ALL_FLAVOR_STORIES is a superset of all theme arrays", () => {
    const allFromThemes = Object.values(FLAVOR_STORIES).flat();
    expect(allFromThemes.length).toBe(ALL_FLAVOR_STORIES.length);
    for (const story of allFromThemes) {
      expect(ALL_FLAVOR_STORIES).toContainEqual(story);
    }
  });
});
