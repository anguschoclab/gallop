import { describe, it, expect } from "vitest";
import {
  getRacecoursePrestige,
  getRacecoursePrestigeByName,
  racecoursePrestigeMultiplier,
} from "@/core/prestige/racecoursePrestige";
import {
  calculateAverageCampaignPrestige,
  getPrestigeTier,
  type PrestigeTier,
} from "@/core/prestige/strategyPrestigeHelpers";
import type { CampaignRaceSlot, Race } from "@/game/types";

describe("Track Prestige Calculations & Strategy Helpers", () => {
  it("correctly looks up track prestige score and multiplier for major venues", () => {
    // Churchill Downs has multiple G1 races
    const cdScore = getRacecoursePrestigeByName("Churchill Downs");
    expect(cdScore).toBeGreaterThanOrEqual(70);

    const cdMultiplier = racecoursePrestigeMultiplier(undefined, "Churchill Downs");
    expect(cdMultiplier).toBeGreaterThan(1.0);

    // Saratoga
    const saratogaScore = getRacecoursePrestigeByName("Saratoga");
    expect(saratogaScore).toBeGreaterThanOrEqual(70);

    // Unknown/regional venue floor
    const unknownScore = getRacecoursePrestigeByName("Unknown Fairgrounds");
    expect(unknownScore).toBe(14); // RACECOURSE_FLOOR_PRESTIGE
  });

  it("calculates average campaign track prestige across planned slots", () => {
    const raceMap = new Map<string, Race>([
      [
        "r1",
        {
          id: "r1",
          name: "Saratoga Derby",
          track: "Saratoga",
          trackId: "saratoga",
        } as unknown as Race,
      ],
      [
        "r2",
        {
          id: "r2",
          name: "Kentucky Derby",
          track: "Churchill Downs",
          trackId: "churchill_downs",
        } as unknown as Race,
      ],
      [
        "r3",
        {
          id: "r3",
          name: "County Fair Stakes",
          track: "Unknown Fairgrounds",
        } as unknown as Race,
      ],
    ]);

    const slots: CampaignRaceSlot[] = [
      { dayTarget: 50, dayWindow: 5, raceId: "r1", role: "prep", status: "planned" },
      { dayTarget: 120, dayWindow: 5, raceId: "r2", role: "target", status: "planned" },
      { dayTarget: 180, dayWindow: 5, raceId: "r3", role: "prep", status: "planned" },
    ];

    const avgPrestige = calculateAverageCampaignPrestige(slots, (id) => raceMap.get(id));
    expect(avgPrestige).toBeGreaterThan(50);
    expect(avgPrestige).toBeLessThan(100);
  });

  it("determines prestige tier category correctly", () => {
    expect(getPrestigeTier(95)).toBe("Cathedral");
    expect(getPrestigeTier(90)).toBe("Cathedral");
    expect(getPrestigeTier(85)).toBe("Premier");
    expect(getPrestigeTier(70)).toBe("Premier");
    expect(getPrestigeTier(55)).toBe("Metropolitan");
    expect(getPrestigeTier(45)).toBe("Metropolitan");
    expect(getPrestigeTier(30)).toBe("Circuit");
    expect(getPrestigeTier(14)).toBe("Circuit");
  });
});
