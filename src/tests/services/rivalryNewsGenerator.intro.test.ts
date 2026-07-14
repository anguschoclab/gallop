import { describe, it, expect } from "vitest";
import { generateStableIntroNews } from "@/services/narrative/rivalryNewsGenerator";
import { createTestStable, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";

describe("generateStableIntroNews", () => {
  it("13.1 — Headline contains stable name", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith" });
    const news = generateStableIntroNews(stable, 5, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.headline).toContain("Shadow Racing");
  });

  it("13.2 — Body contains stable owner name", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith" });
    const news = generateStableIntroNews(stable, 5, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.body).toContain("John Smith");
  });

  it("13.3 — Body contains country when set; fallback 'parts unknown' when undefined", () => {
    const stableWithCountry = createTestStable({ id: "s1", name: "Stable A", owner: "Owner A", country: "Ireland" });
    const newsWith = generateStableIntroNews(stableWithCountry, 5, createTestRng());
    expect(newsWith).not.toBeNull();
    expect(newsWith!.body).toContain("Ireland");

    const stableNoCountry = createTestStable({ id: "s2", name: "Stable B", owner: "Owner B", country: undefined });
    const newsWithout = generateStableIntroNews(stableNoCountry, 5, createTestRng());
    expect(newsWithout).not.toBeNull();
    expect(newsWithout!.body).toContain("parts unknown");
  });

  it("13.4 — Body contains description when set; fallback generic when undefined", () => {
    const stableWithDesc = createTestStable({ id: "s1", name: "Stable A", owner: "Owner A", description: "A legendary operation with decades of history." });
    const newsWith = generateStableIntroNews(stableWithDesc, 5, createTestRng());
    expect(newsWith).not.toBeNull();
    expect(newsWith!.body).toContain("A legendary operation with decades of history.");

    const stableNoDesc = createTestStable({ id: "s2", name: "Stable B", owner: "Owner B", description: undefined });
    const newsWithout = generateStableIntroNews(stableNoDesc, 5, createTestRng());
    expect(newsWithout).not.toBeNull();
    expect(newsWithout!.body.length).toBeGreaterThan(0);
  });

  it("13.5 — entityLinks contains { type: 'stable', id, name }", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith" });
    const news = generateStableIntroNews(stable, 5, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.entityLinks).toBeDefined();
    expect(news!.entityLinks).toContainEqual(expect.objectContaining({ type: "stable", id: "s1", name: "Shadow Racing" }));
  });

  it("13.6 — category === 'stable', importance === 'low'", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith" });
    const news = generateStableIntroNews(stable, 5, createTestRng());
    expect(news).not.toBeNull();
    expect(news!.category).toBe("stable");
    expect(news!.importance).toBe("low");
  });

  it("13.7 — Deterministic with same seed", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith", country: "USA", description: "A top stable." });
    const n1 = generateStableIntroNews(stable, 5, createTestRng("seed-x"));
    const n2 = generateStableIntroNews(stable, 5, createTestRng("seed-x"));
    expect(n1).toEqual(n2);
  });

  it("13.8 — id is valid UUID", () => {
    const stable = createTestStable({ id: "s1", name: "Shadow Racing", owner: "John Smith" });
    const news = generateStableIntroNews(stable, 5, createTestRng());
    expect(news).not.toBeNull();
    expect(isValidUUID(news!.id)).toBe(true);
  });
});
