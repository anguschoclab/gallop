// Tests for the auctioneer template service.
// We don't snapshot specific lines (the templates will keep evolving), but we
// assert: (1) substitution actually fills tokens, (2) variety is high enough
// that we don't see the same line back-to-back across realistic sequences,
// and (3) sire/dam/fame hints make it into the output when the templates
// ask for them.

import { describe, it, expect } from "vitest";
import { generateAuctioneerLine } from "@/services/auction/auctioneerService";
import { createRng } from "@/core/common/rng";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { Horse, Stable } from "@/game/types";
import type { AuctionTickEvent } from "@/core/auction/runner";

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
    for (let i = 0; i < 15; i++) {
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
    for (let i = 0; i < 15; i++) {
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
    for (let seed = 1; seed <= 10; seed++) {
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

  // -----------------------------------------------------------------------
  // Phase 4: New tests — event type coverage
  // -----------------------------------------------------------------------

  it("BID_WAR event: mentions horse name, isHighImpact: true, no unfilled tokens", () => {
    const horse = mkHorse({ name: "War Admiral" });
    const event: AuctionTickEvent = { type: "BID_WAR", lotId: "l1", stableIds: ["s1", "s2"] };
    let mentionsHorse = false;
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.isHighImpact).toBe(true);
      expect(line.text).not.toMatch(/\{[a-zA-Z]+\}/);
      if (line.text.includes("War Admiral")) mentionsHorse = true;
    }
    expect(mentionsHorse).toBe(true);
  });

  it("BID_RECEIVED player vs NPC: player mentions 'you', NPC mentions stable/paddle", () => {
    const horse = mkHorse();
    const stable = mkStable("Rival Farm");
    const playerEvent: AuctionTickEvent = { type: "BID_RECEIVED", lotId: "l1", amount: 50000 };
    const npcEvent: AuctionTickEvent = { type: "BID_RECEIVED", lotId: "l1", stableId: "s1", amount: 50000 };

    let playerMentionsYou = false;
    let npcMentionsStableOrPaddle = false;
    for (let seed = 1; seed <= 10; seed++) {
      const playerLine = generateAuctioneerLine(playerEvent, { horse }, createRng(seed));
      if (/you|your/i.test(playerLine.text)) playerMentionsYou = true;

      const npcLine = generateAuctioneerLine(npcEvent, { horse, winner: stable, paddleNumber: 7 }, createRng(seed));
      if (npcLine.text.includes("Rival Farm") || npcLine.text.includes("paddle 7")) npcMentionsStableOrPaddle = true;
    }
    expect(playerMentionsYou).toBe(true);
    expect(npcMentionsStableOrPaddle).toBe(true);
  });

  it("GOING_ONCE: amount appears in output, isHighImpact: false", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "GOING_ONCE", lotId: "l1", amount: 42000 };
    let mentionsAmount = false;
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.isHighImpact).toBe(false);
      if (line.text.includes("42,000")) mentionsAmount = true;
    }
    expect(mentionsAmount).toBe(true);
  });

  it("GOING_TWICE: amount appears in output", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "GOING_TWICE", lotId: "l1", amount: 88000 };
    let mentionsAmount = false;
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.isHighImpact).toBe(true);
      if (line.text.includes("88,000")) mentionsAmount = true;
    }
    expect(mentionsAmount).toBe(true);
  });

  it("PASSED: horse name appears in output, isHighImpact: false", () => {
    const horse = mkHorse({ name: "No Sale Boy" });
    const event: AuctionTickEvent = { type: "PASSED", lotId: "l1", reason: "no_bids" };
    let mentionsHorse = false;
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.isHighImpact).toBe(false);
      if (line.text.includes("No Sale Boy")) mentionsHorse = true;
    }
    expect(mentionsHorse).toBe(true);
  });

  it("RESERVE_NOT_MET: amount and reserve appear in output, isHighImpact: false", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "RESERVE_NOT_MET", lotId: "l1", amount: 30000, reserve: 50000 };
    let mentionsAmount = false;
    let mentionsReserve = false;
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.isHighImpact).toBe(false);
      if (line.text.includes("30,000")) mentionsAmount = true;
      if (line.text.includes("50,000")) mentionsReserve = true;
    }
    expect(mentionsAmount).toBe(true);
    expect(mentionsReserve).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Phase 4: New tests — token substitution coverage
  // -----------------------------------------------------------------------

  it("fameBucket: fame >= 60 produces 'household name' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ fame: 60 });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("household name")) found = true;
    }
    expect(found).toBe(true);
  });

  it("fameBucket: fame < 15 produces 'unknown quantity' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ fame: 10 });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("unknown quantity")) found = true;
    }
    expect(found).toBe(true);
  });

  it("potentialHintFromOverall: scoutedOverall 90 produces 'blue-chip' in LOT_OPEN", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse, scoutedOverall: 90 }, createRng(seed));
      if (line.text.includes("blue-chip")) found = true;
    }
    expect(found).toBe(true);
  });

  it("potentialHintFromOverall: scoutedOverall 30 produces 'modest' in LOT_OPEN", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse, scoutedOverall: 30 }, createRng(seed));
      if (line.text.includes("modest")) found = true;
    }
    expect(found).toBe(true);
  });

  it("breezeBucket: breezeSeconds 9.5 produces 'blistering' phrase in LOT_OPEN", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse, breezeSeconds: 9.5 }, createRng(seed));
      if (line.text.includes("blistering")) found = true;
    }
    expect(found).toBe(true);
  });

  it("breezeBucket: breezeSeconds 11.0 produces 'workmanlike effort' in LOT_OPEN", () => {
    const horse = mkHorse();
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse, breezeSeconds: 11.0 }, createRng(seed));
      if (line.text.includes("workmanlike")) found = true;
    }
    expect(found).toBe(true);
  });

  it("pedigreeFragment: horse with only sire produces 'by {sire}' fragment", () => {
    const horse = mkHorse({
      sireName: "Lone Sire",
      damName: undefined as unknown as string,
    });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("by Lone Sire")) found = true;
    }
    expect(found).toBe(true);
  });

  it("pedigreeFragment: horse with only dam produces 'out of {dam}' fragment", () => {
    const horse = mkHorse({
      sireName: undefined as unknown as string,
      damName: "Lone Dam",
    });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 20; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("out of Lone Dam")) found = true;
    }
    expect(found).toBe(true);
  });

  it("pedigreeFragment: horse with neither sire nor dam produces no crash, no unfilled tokens", () => {
    const horse = mkHorse({
      sireName: undefined as unknown as string,
      damName: undefined as unknown as string,
    });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      expect(line.text).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(line.text).not.toMatch(/\[\w+\?\]/);
    }
  });

  it("coat color substitution: horse coatColor appears in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ coatColor: "chestnut" as any });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("chestnut")) found = true;
    }
    expect(found).toBe(true);
  });

  it("gender substitution: colt produces 'colt' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ gender: "colt" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("colt")) found = true;
    }
    expect(found).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Phase 4: New tests — determinism
  // -----------------------------------------------------------------------

  it("determinism: same seed produces identical line for LOT_OPEN", () => {
    const horse = mkHorse({ name: "Deterministic" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    const line1 = generateAuctioneerLine(event, { horse }, createRng(42));
    const line2 = generateAuctioneerLine(event, { horse }, createRng(42));
    expect(line1.text).toBe(line2.text);
    expect(line1.isHighImpact).toBe(line2.isHighImpact);
  });

  it("determinism: same seed produces identical line for SOLD", () => {
    const horse = mkHorse({ name: "Sold Horse" });
    const stable = mkStable("Buyer Farm");
    const event: AuctionTickEvent = {
      type: "SOLD",
      lotId: "l1",
      amount: 125000,
      toStableId: "s1",
    };
    const line1 = generateAuctioneerLine(event, { horse, winner: stable }, createRng(42));
    const line2 = generateAuctioneerLine(event, { horse, winner: stable }, createRng(42));
    expect(line1.text).toBe(line2.text);
    expect(line1.isHighImpact).toBe(line2.isHighImpact);
  });

  // -----------------------------------------------------------------------
  // Phase 1: runningStyle template coverage (tests BEFORE implementation)
  // -----------------------------------------------------------------------

  it("runningStyle: 'E' produces 'early speed' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("early speed")) found = true;
    }
    expect(found).toBe(true);
  });

  it("runningStyle: 'EP' produces 'press the pace' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ runningStyle: "EP" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("press the pace")) found = true;
    }
    expect(found).toBe(true);
  });

  it("runningStyle: 'P' produces 'pace stalker' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ runningStyle: "P" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("pace stalker")) found = true;
    }
    expect(found).toBe(true);
  });

  it("runningStyle: 'S' produces 'deep closer' in LOT_OPEN across seeds", () => {
    const horse = mkHorse({ runningStyle: "S" });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    let found = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line = generateAuctioneerLine(event, { horse }, createRng(seed));
      if (line.text.includes("deep closer")) found = true;
    }
    expect(found).toBe(true);
  });

  it("runningStyle: undefined horse in LOT_OPEN produces no crash and no unfilled tokens", () => {
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };
    for (let seed = 1; seed <= 10; seed++) {
      const line = generateAuctioneerLine(event, {}, createRng(seed));
      expect(line.text).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(line.text).not.toMatch(/\[\w+\?\]/);
    }
  });

  it("fameBucket boundary: fame=34 produces 'talked-about', fame=35 produces 'well-known'", () => {
    const horse34 = mkHorse({ fame: 34 });
    const horse35 = mkHorse({ fame: 35 });
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "l1" };

    let found34 = false;
    let found35 = false;
    for (let seed = 1; seed <= 100; seed++) {
      const line34 = generateAuctioneerLine(event, { horse: horse34 }, createRng(seed));
      if (line34.text.includes("talked-about")) found34 = true;

      const line35 = generateAuctioneerLine(event, { horse: horse35 }, createRng(seed));
      if (line35.text.includes("well-known")) found35 = true;
    }
    expect(found34).toBe(true);
    expect(found35).toBe(true);
  });
});
