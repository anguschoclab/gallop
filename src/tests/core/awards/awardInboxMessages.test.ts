import { describe, it, expect } from "vitest";
import { generateAwardInboxMessage } from "@/core/awards/awardInboxMessages";
import type { RegionalAward } from "@/core/awards/types";

function createMockAward(overrides: Partial<RegionalAward> = {}): RegionalAward {
  return {
    id: "award-1",
    horseId: "h1",
    horseName: "Thunder Strike",
    stableId: undefined,
    region: "north_america",
    category: "horse_of_the_year",
    year: 2,
    points: 350,
    runnerUpPoints: 200,
    margin: 150,
    qualifyingRaces: ["r1", "r2"],
    ceremonyDay: 400,
    ...overrides,
  };
}

describe("generateAwardInboxMessage", () => {
  it("generates inbox message with CTA for player-owned horse", () => {
    const award = createMockAward();
    const msg = generateAwardInboxMessage(award, 400);

    expect(msg.category).toBe("hall_of_fame");
    expect(msg.priority).toBe("urgent");
    expect(msg.title).toContain("Thunder Strike");
    expect(msg.cta).toBeDefined();
    expect(msg.cta?.route).toBe("awards.$category");
    expect(msg.cta?.params?.category).toBe("horse_of_the_year");
  });

  it("generates inbox message for NPC-owned horse with lower priority", () => {
    const award = createMockAward({ stableId: "npc-stable-1", horseName: "NPC Champion" });
    const msg = generateAwardInboxMessage(award, 400);

    expect(msg.priority).toBe("info");
    expect(msg.title).toContain("NPC Champion");
  });

  it("CTA label includes category display name", () => {
    const award = createMockAward({ category: "champion_sprint_male" });
    const msg = generateAwardInboxMessage(award, 400);

    expect(msg.cta).toBeDefined();
    expect(msg.cta?.label).toMatch(/sprint/i);
  });

  it("message body includes region and year", () => {
    const award = createMockAward({ region: "europe", year: 3 });
    const msg = generateAwardInboxMessage(award, 400);

    expect(msg.body).toContain("Europe");
    expect(msg.body).toContain("Year 3");
  });

  it("HOTY award gets urgent priority for player horses", () => {
    const award = createMockAward({ category: "horse_of_the_year" });
    const msg = generateAwardInboxMessage(award, 400);

    expect(msg.priority).toBe("urgent");
  });
});
