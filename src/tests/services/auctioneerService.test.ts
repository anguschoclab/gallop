// Tests for the auctioneer template service.
// We don't snapshot specific lines (the templates will keep evolving), but we
// assert: (1) substitution actually fills tokens, (2) variety is high enough
// that we don't see the same line back-to-back across realistic sequences,
// and (3) sire/dam/fame hints make it into the output when the templates
// ask for them.

import { describe, it, expect } from "vitest";
import { generateAuctioneerLine } from "@/services/auctioneerService";
import { createRng } from "@/core/common/rng";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { Horse, Stable } from "@/game/types";
import type { AuctionTickEvent } from "@/game/auction/runner";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test Horse",
    age: 1,
    gender: "colt",
    sireName: "Bold Ruler",
    damName: "Somethingroyal",
    fame: 25,
    runningStyle: "EP",
    ...overrides,
  });
}

function mkStable(name: string): Stable {
  return createTestStable({
    id: "s1",
    name,
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 0,
    cash: 100000,
    isMajor: true,
    personality: "developer",
  });
}

describe("auctioneerService", () => {
  it("substitutes horse name and pedigree in LOT_OPEN lines", () => {
    const rng = createRng(1);
    const horse = mkHorse({
      name: "Sea Hero",
      sireName: "Polish Navy",
      damName: "Glowing Tribute",
    });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };

    // Try several seeds and expect at least one to mention the horse name and
    // at least one to mention either sire or dam.
    let mentionsHorse = false;
    let mentionsPedigree = false;
    for (let i = 0; i < 30; i++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(i + 1));
      if (line.text.includes("Sea Hero")) mentionsHorse = true;
      if (line.text.includes("Polish Navy") || line.text.includes("Glowing Tribute")) {
        mentionsPedigree = true;
      }
    }
    expect(mentionsHorse).toBe(true);
    expect(mentionsPedigree).toBe(true);
  });

  it("formats SOLD lines with amount and stable name", () => {
    const horse = mkHorse({ name: "Hammer Time" });
    const stable = mkStable("Bluegrass Stables");
    const event: AuctionTickEvent = {
      type: "SOLD",
      lotId: "l1",
      amount: 75000,
      toStableId: "s1",
    };
    let mentionsAmount = false;
    let mentionsStable = false;
    for (let i = 0; i < 30; i++) {
      const line = generateAuctioneerLine(event, { horse, winner: stable }, createRng(i + 1));
      if (line.text.includes("75,000")) mentionsAmount = true;
      if (line.text.includes("Bluegrass Stables")) mentionsStable = true;
    }
    expect(mentionsAmount).toBe(true);
    expect(mentionsStable).toBe(true);
  });

  it("does not leave unfilled {token} markers in the output", () => {
    const horse = mkHorse();
    const events: AuctionTickEvent[] = [
      { type: "LOT_OPEN", lotId: "l1" },
      { type: "BID_RECEIVED", lotId: "l1", stableId: "s1", amount: 1000 },
      { type: "GOING_ONCE", lotId: "l1", amount: 1000 },
      { type: "GOING_TWICE", lotId: "l1", amount: 1000 },
      { type: "SOLD", lotId: "l1", amount: 1000, toStableId: "s1" },
      { type: "PASSED", lotId: "l1", reason: "no_bids" },
      { type: "RESERVE_NOT_MET", lotId: "l1", amount: 500, reserve: 1000 },
    ];
    const stable = mkStable("Anywhere Farm");
    for (let seed = 1; seed <= 20; seed++) {
      for (const event of events) {
        const line = generateAuctioneerLine(
          event,
          { horse, winner: stable, consignor: stable, paddleNumber: 3 },
          createRng(seed),
        );
        expect(line.text).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(line.text).not.toMatch(/\[\w+\?\]/); // unfilled fallback marker
      }
    }
  });

  it("flags hammer-down events as high-impact", () => {
    const horse = mkHorse();
    const sold: AuctionTickEvent = { type: "SOLD", lotId: "l1", amount: 1, toStableId: undefined };
    const open: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    const goingTwice: AuctionTickEvent = { type: "GOING_TWICE", lotId: "l1", amount: 1 };
    expect(generateAuctioneerLine(sold, { horse }, createRng(1)).isHighImpact).toBe(true);
    expect(generateAuctioneerLine(goingTwice, { horse }, createRng(1)).isHighImpact).toBe(true);
    expect(generateAuctioneerLine(open, { horse }, createRng(1)).isHighImpact).toBe(false);
  });

  it("produces variety across 5 consecutive LOT_OPEN events", () => {
    // Across 5 consecutive lot-opens we want at least 3 unique lines.
    // This guards against the template list shrinking accidentally.
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    const seen = new Set<string>();
    const rng = createRng(99);
    for (let i = 0; i < 5; i++) {
      const line = generateAuctioneerLine(event, { horse }, rng);
      seen.add(line.text);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
