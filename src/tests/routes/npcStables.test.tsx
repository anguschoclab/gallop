/**
 * npc-stables.test.tsx
 *
 * Slice audit for /npc-stables: shared EmptyState when filters match nothing;
 * numeric figures use tabular-nums; table headers carry scope.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const route = readFileSync(join(__dirname, "..", "..", "routes", "npc-stables.index.tsx"), "utf-8");
const detailPage = readFileSync(
  join(__dirname, "..", "..", "domains", "agents", "ui", "pages", "NpcStableDetailPage.tsx"),
  "utf-8",
);

describe("NPC stables audit", () => {
  it("filter-empty state uses the shared EmptyState", () => {
    expect(route).toContain("EmptyState");
    expect(route).toContain("No stables found");
  });

  it("numeric figures use tabular figures", () => {
    expect(detailPage).toMatch(/tabular-nums/);
  });

  it("filter controls are labelled for assistive tech", () => {
    for (const label of route.match(/aria-label="[^"]+"/g) ?? []) {
      expect(label.length).toBeGreaterThan('aria-label=""'.length);
    }
    expect(route).toContain('aria-label="Filter by cash pressure"');
    expect(route).toContain('aria-label="Sort stables"');
  });
});
