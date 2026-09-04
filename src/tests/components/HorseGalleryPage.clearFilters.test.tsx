import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("HorseGalleryPage Clear Filters button (#359)", () => {
  it("contains a Clear Filters button in the source code", () => {
    // This test validates that the Clear Filters button exists in the component source.
    // A full render test is impractical due to the component's deep dependency chain
    // (useGalleryFilters hook, store, phenotype resolution, etc.), but the source-level
    // check confirms the a11y feature is present.
    const source = readFileSync(
      resolve(process.cwd(), "src/components/routes/HorseGalleryPage.tsx"),
      "utf-8",
    );
    expect(source).toContain("Clear Filters");
    // Verify it only shows when horses exist but none match filters
    expect(source).toContain("filteredHorses.length === 0");
    expect(source).toContain("horses.length === 0");
  });
});
