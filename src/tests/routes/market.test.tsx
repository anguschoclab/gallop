/**
 * market.test.tsx
 *
 * Slice audit for /market: display header conventions and tabular figures on
 * the capital readout.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "..", "routes", "market.tsx"), "utf-8");

describe("Market route audit", () => {
  it("renders a page heading", () => {
    expect(src).toMatch(/<h1[\s>]/);
  });

  it("capital figure uses tabular figures", () => {
    expect(src).toMatch(/tabular-nums/);
  });
});
