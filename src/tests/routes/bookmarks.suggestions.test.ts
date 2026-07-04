import { describe, it, expect } from "vitest";

function filterAvailableSuggestions(
  suggestions: string[],
  bookmarkTags: string[] | undefined,
): string[] {
  const bookmarkTagsLower = new Set((bookmarkTags ?? []).map((t) => t.toLowerCase()));
  return suggestions.filter((s) => !bookmarkTagsLower.has(s.toLowerCase()));
}

describe("BookmarkCard — Set-based suggestion filtering", () => {
  it("excludes tags already on bookmark", () => {
    const result = filterAvailableSuggestions(["speed", "stamina", "grass"], ["speed", "stamina"]);
    expect(result).toEqual(["grass"]);
  });

  it("is case-insensitive", () => {
    const result = filterAvailableSuggestions(["Speed", "Stamina"], ["speed"]);
    expect(result).toEqual(["Stamina"]);
  });

  it("works when bookmark has no tags", () => {
    const result = filterAvailableSuggestions(["speed", "stamina"], []);
    expect(result).toEqual(["speed", "stamina"]);
  });

  it("works when bookmark.tags is undefined", () => {
    const result = filterAvailableSuggestions(["speed", "stamina"], undefined);
    expect(result).toEqual(["speed", "stamina"]);
  });

  it("handles mixed case in both suggestions and tags", () => {
    const result = filterAvailableSuggestions(["SpEeD", "STAMINA", "GrAsS"], ["SPEED", "stamina"]);
    expect(result).toEqual(["GrAsS"]);
  });
});
