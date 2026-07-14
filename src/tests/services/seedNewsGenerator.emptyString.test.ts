import { describe, it, expect } from "vitest";
import { seedGazetteNews } from "@/services/narrative/seedNewsGenerator";
import { createTestRng } from "@/tests/helpers";
import type { PlayerProfile } from "@/core/stable/types";

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    stableName: "Thunder Ranch",
    ownerName: "John Doe",
    silk: { pattern: "solid", primary: "#FF0000", secondary: "#FFFFFF", cap: "#000000" },
    backstoryId: "inheritor",
    founded: 1,
    country: "USA",
    ...overrides,
  };
}

describe("seedGazetteNews — season opener empty-string fallback", () => {
  it("returns capitalized fallback when stableName is empty string", () => {
    const profile = makeProfile({ stableName: "", ownerName: "" });
    const result = seedGazetteNews([], [], [], profile, createTestRng());
    const seasonOpener = result.news.find(
      (n) => n.category === "flavor" && n.importance === "high",
    );
    expect(seasonOpener).toBeDefined();
    const text = `${seasonOpener!.headline} ${seasonOpener!.body}`;
    expect(text).toContain("A New Racing Operation");
  });

  it("returns capitalized fallback when ownerName is empty string", () => {
    const profile = makeProfile({ ownerName: "" });
    const result = seedGazetteNews([], [], [], profile, createTestRng());
    const seasonOpener = result.news.find(
      (n) => n.category === "flavor" && n.importance === "high",
    );
    expect(seasonOpener).toBeDefined();
    expect(seasonOpener!.body).toContain("A Daring Newcomer");
  });

  it("uses actual stableName when non-empty", () => {
    const profile = makeProfile({ stableName: "Thunder Ranch", ownerName: "John" });
    const result = seedGazetteNews([], [], [], profile, createTestRng());
    const seasonOpener = result.news.find(
      (n) => n.category === "flavor" && n.importance === "high",
    );
    expect(seasonOpener).toBeDefined();
    expect(seasonOpener!.headline).toContain("Thunder Ranch");
  });

  it("uses capitalized fallback when profile is undefined", () => {
    const result = seedGazetteNews([], [], [], undefined, createTestRng());
    const seasonOpener = result.news.find(
      (n) => n.category === "flavor" && n.importance === "high",
    );
    expect(seasonOpener).toBeDefined();
    const text = `${seasonOpener!.headline} ${seasonOpener!.body}`;
    expect(text).toContain("A New Racing Operation");
  });
});
