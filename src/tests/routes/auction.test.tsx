/**
 * auction.test.tsx
 *
 * Slice audit for /auction: no decorative non-state-derived chrome; loading
 * and error states use the shared primitives.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const AUCTION_UI = join(__dirname, "..", "..", "domains", "auction", "ui");

function* tsxFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* tsxFiles(full);
    else if (entry.endsWith(".tsx")) yield full;
  }
}

/** Strings that would be fabricated atmosphere rather than real state. */
const FAKE_CHROME = [
  /SECTOR\s+ALPHA/i,
  /LIVE\s+SECURE/i,
  /GLOBAL\s+SURVEILLANCE/i,
  /REAL-?TIME\s+FEED/i,
  /INITIALIZING/i,
  /MAJOR\s+CHALLENGER/i,
  /MARKET\s+POSITION:\s*STABLE/i,
];

describe("Auction route audit", () => {
  it("contains no fabricated status chrome", () => {
    for (const file of tsxFiles(AUCTION_UI)) {
      const src = readFileSync(file, "utf-8");
      for (const pattern of FAKE_CHROME) {
        expect(src, `${file} contains ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("loading/error states use the shared EmptyState/ErrorState primitives", () => {
    const states = readFileSync(join(AUCTION_UI, "AuctionStates.tsx"), "utf-8");
    expect(states).toMatch(/ErrorState|EmptyState/);
  });
});
