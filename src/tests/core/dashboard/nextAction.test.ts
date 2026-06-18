import { describe, it, expect } from "vitest";
import { deriveNextAction, type NextActionInput } from "@/core/dashboard/nextAction";

const base: NextActionInput = {
  urgentMessageCount: 0,
  nextOwnedRace: null,
  lowEnergyCount: 0,
  openAuctionCount: 0,
  day: 10,
};

describe("deriveNextAction", () => {
  it("prioritises an urgent inbox message above all else", () => {
    const a = deriveNextAction({
      ...base,
      urgentMessageCount: 2,
      nextOwnedRace: { id: "r1", day: 11 },
      lowEnergyCount: 3,
    });
    expect(a?.kind).toBe("inbox");
    expect(a?.to).toBe("/inbox");
  });

  it("points to a race the player is entered in over fatigue/auctions", () => {
    const a = deriveNextAction({
      ...base,
      nextOwnedRace: { id: "r1", day: 10 },
      lowEnergyCount: 3,
      openAuctionCount: 1,
    });
    expect(a?.kind).toBe("race");
    expect(a?.to).toBe("/race/$raceId");
    expect(a?.search).toBeUndefined();
    expect(a?.params).toEqual({ raceId: "r1" });
  });

  it("flags fatigued horses when nothing more urgent exists", () => {
    const a = deriveNextAction({ ...base, lowEnergyCount: 2 });
    expect(a?.kind).toBe("fatigue");
    expect(a?.to).toBe("/stable");
    expect(a?.detail).toContain("2");
  });

  it("surfaces an open auction when present and nothing else is pending", () => {
    const a = deriveNextAction({ ...base, openAuctionCount: 1 });
    expect(a?.kind).toBe("auction");
    expect(a?.to).toBe("/auction");
  });

  it("falls back to advancing the day when nothing needs attention", () => {
    const a = deriveNextAction(base);
    expect(a?.kind).toBe("advance");
  });
});
