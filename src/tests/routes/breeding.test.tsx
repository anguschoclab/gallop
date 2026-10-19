/**
 * breeding.test.tsx
 *
 * Slice audit for /breeding: "Breeding & Bloodstock" title; the tab bar is
 * reduced to <=7 visible triggers; every tab value remains reachable via the
 * nested "Records & Sires" group.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "..", "routes", "breeding.tsx"), "utf-8");

/** Extract every <TabsList>...</TabsList> block. */
function tabsListBlocks(content: string): string[] {
  return content.match(/<TabsList>[\s\S]*?<\/TabsList>/g) ?? [];
}

describe("Breeding page structure", () => {
  it("keeps the page title", () => {
    expect(src).toContain("Breeding & Bloodstock");
  });

  it("shows at most 7 top-level tab triggers", () => {
    const blocks = tabsListBlocks(src);
    expect(blocks.length).toBe(2);
    const topTriggers = blocks[0].match(/<TabsTrigger value="([^"]+)"/g) ?? [];
    expect(topTriggers.length).toBeLessThanOrEqual(7);
  });

  it("keeps all secondary tabs reachable inside the nested group", () => {
    const nested = tabsListBlocks(src)[1];
    for (const value of [
      "history",
      "stallions",
      "sire-watch",
      "sire-leaderboards",
      "damsire-leaderboard",
      "blue-hen-leaderboard",
    ]) {
      expect(nested).toContain(`value="${value}"`);
    }
  });

  it("all twelve tab values remain valid in the search schema", () => {
    const schema = src.match(/BREEDING_TABS = \[([\s\S]*?)\]/)?.[1] ?? "";
    for (const value of [
      "planner",
      "shed",
      "broodmares",
      "history",
      "bred",
      "pedigree",
      "programs",
      "stallions",
      "sire-watch",
      "sire-leaderboards",
      "damsire-leaderboard",
      "blue-hen-leaderboard",
    ]) {
      expect(schema).toContain(`"${value}"`);
    }
  });

  it("uses the shared EmptyState for the no-pregnancies state", () => {
    const tab = readFileSync(
      join(__dirname, "..", "..", "domains", "breeding", "ui", "BroodmaresTab.tsx"),
      "utf-8",
    );
    expect(tab).toContain("EmptyState");
  });
});
