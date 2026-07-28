import { describe, it, expect } from "vitest";
import { getHorseInsight } from "@/core/horse/insights";
import type { Horse } from "@/core/horse/types";

describe("getHorseInsight", () => {
  it("returns null for history with less than 3 races", () => {
    const horse = { raceHistory: [{ position: 1, day: 1 }] } as Horse;
    expect(getHorseInsight(horse)).toBeNull();
  });

  it("detects win streaks", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1 },
        { position: 1, day: 2 },
        { position: 1, day: 3 },
        { position: 1, day: 4 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Red Hot");
    expect(insight?.value).toBe("3 Race Win Streak");
  });

  it("detects bridesmaid (2nd place) streaks", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1 },
        { position: 2, day: 2 },
        { position: 2, day: 3 },
        { position: 2, day: 4 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Bridesmaid");
    expect(insight?.value).toBe("3 Consecutive 2nd Place Finishes");
  });

  it("detects Model of Consistency", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1, beyer: 50 },
        { position: 3, day: 2, beyer: 50 },
        { position: 1, day: 3, beyer: 50 },
        { position: 3, day: 4, beyer: 50 },
        { position: 5, day: 5, beyer: 50 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Model of Consistency");
    expect(insight?.value).toBe("80% In The Money");
  });

  it("detects distance specialists", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, distance: 1000, beyer: 50 },
        { position: 5, day: 2, distance: 1000, beyer: 50 },
        { position: 5, day: 3, distance: 1000, beyer: 50 },
        { position: 5, day: 4, distance: 1200, beyer: 90 },
        { position: 5, day: 5, distance: 1200, beyer: 90 },
        { position: 5, day: 6, distance: 1200, beyer: 90 },

      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Distance Specialist");
    expect(insight?.value).toBe("1200m");
  });

  it("handles ties by preferring the first one encountered (based on map iteration)", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, distance: 1000, beyer: 90 },
        { position: 5, day: 2, distance: 1000, beyer: 90 },
        { position: 5, day: 3, distance: 1000, beyer: 90 },
        { position: 5, day: 4, distance: 1200, beyer: 90 },
        { position: 5, day: 5, distance: 1200, beyer: 90 },
        { position: 5, day: 6, distance: 1200, beyer: 90 },

      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Distance Specialist");
    expect(insight?.value).toBe("1000m");
  });

  it("returns Surface Affinity for a horse with 3+ races on the same surface", () => {
    const horse = {
      raceHistory: [
        { position: 3, day: 1, surface: "Turf", beyer: 90 },
        { position: 3, day: 2, surface: "Turf", beyer: 80 },
        { position: 3, day: 3, surface: "Turf", beyer: 85 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Surface Affinity");
    expect(insight?.value).toBe("Turf");
  });

  it("returns null when no surface has 3+ races", () => {
    const horse = {
      raceHistory: [
        { position: 3, day: 1, surface: "Turf", beyer: 80 },
        { position: 3, day: 2, surface: "Turf", beyer: 85 },
        { position: 3, day: 3, surface: "Dirt", beyer: 80 },
        { position: 3, day: 4, surface: "Dirt", beyer: 85 },
      ],
    } as Horse;
    expect(getHorseInsight(horse)).toBeNull();
  });

  it("win streak takes priority over distance specialist", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, distance: 1200, beyer: 90 },
        { position: 1, day: 2, distance: 1200, beyer: 90 },
        { position: 1, day: 3, distance: 1200, beyer: 90 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Red Hot");
  });

  it("does not skip distance 0 due to falsy check", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, distance: 0, beyer: 80 },
        { position: 5, day: 2, distance: 0, beyer: 80 },
        { position: 5, day: 3, distance: 0, beyer: 80 },

      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Distance Specialist");
    expect(insight?.value).toBe("0m");
  });

  it("detects Improving Form trend", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1, beyer: 70 },
        { position: 3, day: 2, beyer: 72 },
        { position: 2, day: 3, beyer: 75 },
        { position: 2, day: 4, beyer: 80 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Trending Up");
    expect(insight?.value).toBe("Improving Form");
  });

  it("does not detect Improving Form if improvement is < 5", () => {
    const horse = {
      raceHistory: [
        { position: 4, day: 1, beyer: 70 },
        { position: 5, day: 2, beyer: 72 },
        { position: 4, day: 3, beyer: 73 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).toBeNull();
  });

  it("detects Fires Fresh insight", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, beyer: 90 }, // fresh (first race)
        { position: 3, day: 30, beyer: 80 }, // active (29 days)
        { position: 3, day: 50, beyer: 80 }, // active (20 days)
        { position: 3, day: 70, beyer: 80 }, // active (20 days)
        { position: 1, day: 200, beyer: 90 }, // fresh (130 days)
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Fires Fresh");
    expect(insight?.value).toBe("Excels off a Layoff");
  });

  it("detects Needs Racing insight", () => {
    const horse = {
      raceHistory: [
        { position: 4, day: 1, beyer: 70 }, // fresh (first race)
        { position: 1, day: 30, beyer: 85 }, // active
        { position: 1, day: 50, beyer: 85 }, // active
        { position: 1, day: 70, beyer: 85 }, // active
        { position: 5, day: 200, beyer: 70 }, // fresh (130 days)
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Needs Racing");
    expect(insight?.value).toBe("Improves with Activity");
  });
});
