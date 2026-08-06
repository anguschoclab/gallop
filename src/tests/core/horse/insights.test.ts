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
        { position: 5, day: 1, surface: "Turf", beyer: 90 },
        { position: 5, day: 2, surface: "Turf", beyer: 80 },
        { position: 5, day: 3, surface: "Turf", beyer: 85 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Surface Affinity");
    expect(insight?.value).toBe("Turf");
  });

  it("returns null when no surface has 3+ races", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, surface: "Turf", beyer: 80 },
        { position: 5, day: 2, surface: "Turf", beyer: 85 },
        { position: 5, day: 3, surface: "Dirt", beyer: 80 },
        { position: 5, day: 4, surface: "Dirt", beyer: 85 },
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
        { position: 5, day: 1, beyer: 70 },
        { position: 3, day: 2, beyer: 72 },
        { position: 5, day: 3, beyer: 75 },
        { position: 5, day: 4, beyer: 80 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Trending Up");
    expect(insight?.value).toBe("Improving Form");
  });

  it("does not detect Improving Form if improvement is < 5", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 70 },
        { position: 5, day: 2, beyer: 72 },
        { position: 5, day: 3, beyer: 73 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).toBeNull();
  });

  it("detects Fires Fresh insight", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 90 }, // fresh (first race)
        { position: 5, day: 30, beyer: 80 }, // active (29 days)
        { position: 5, day: 50, beyer: 80 }, // active (20 days)
        { position: 5, day: 70, beyer: 80 }, // active (20 days)
        { position: 5, day: 200, beyer: 90 }, // fresh (130 days)
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Fires Fresh");
    expect(insight?.value).toBe("Excels off a Layoff");
  });

  it("detects Needs Racing insight", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 70 }, // fresh (first race)
        { position: 5, day: 30, beyer: 85 }, // active
        { position: 5, day: 50, beyer: 85 }, // active
        { position: 5, day: 70, beyer: 85 }, // active
        { position: 5, day: 200, beyer: 70 }, // fresh (130 days)
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).toBe("Needs Racing");
    expect(insight?.value).toBe("Improves with Activity");
  });
});

describe("Bridesmaid insight", () => {
  it("detects 3 consecutive 2nd place finishes", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 50 },
        { position: 2, day: 2, beyer: 70 },
        { position: 2, day: 3, beyer: 72 },
        { position: 2, day: 4, beyer: 75 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Bridesmaid");
    expect(insight!.type).toBe("neutral");
    expect(insight!.value).toContain("3");
  });

  it("does not trigger with only 2 consecutive 2nd places", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 50 },
        { position: 2, day: 2, beyer: 70 },
        { position: 2, day: 3, beyer: 72 },
        { position: 5, day: 4, beyer: 65 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).not.toBe("Bridesmaid");
  });

  it("detects 5 consecutive 2nd place finishes", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1, beyer: 70 },
        { position: 2, day: 2, beyer: 72 },
        { position: 2, day: 3, beyer: 75 },
        { position: 2, day: 4, beyer: 71 },
        { position: 2, day: 5, beyer: 73 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight!.label).toBe("Bridesmaid");
    expect(insight!.value).toContain("5");
  });
});

describe("Model of Consistency insight", () => {
  it("detects 80%+ top-3 finish rate with min 5 starts", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, beyer: 80 },
        { position: 3, day: 2, beyer: 75 },
        { position: 2, day: 3, beyer: 78 },
        { position: 1, day: 4, beyer: 82 },
        { position: 3, day: 5, beyer: 76 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Model of Consistency");
    expect(insight!.type).toBe("positive");
    expect(insight!.value).toContain("100%");
  });

  it("does not trigger with < 5 starts", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, beyer: 80 },
        { position: 2, day: 2, beyer: 75 },
        { position: 3, day: 3, beyer: 78 },
        { position: 1, day: 4, beyer: 82 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).not.toBe("Model of Consistency");
  });

  it("does not trigger with < 80% top-3 rate", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, beyer: 80 },
        { position: 5, day: 2, beyer: 60 },
        { position: 2, day: 3, beyer: 78 },
        { position: 1, day: 4, beyer: 82 },
        { position: 4, day: 5, beyer: 70 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).not.toBe("Model of Consistency");
  });
});

describe("Fires Fresh / Needs Racing insights", () => {
  it("detects Fires Fresh when fresh avg >= active avg + 8", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 90 },
        { position: 5, day: 80, beyer: 88 },
        { position: 5, day: 90, beyer: 70 },
        { position: 5, day: 100, beyer: 72 },
        { position: 5, day: 110, beyer: 74 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Fires Fresh");
    expect(insight!.type).toBe("positive");
  });

  it("detects Needs Racing when active avg >= fresh avg + 8", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 60 },
        { position: 5, day: 80, beyer: 62 },
        { position: 5, day: 90, beyer: 80 },
        { position: 5, day: 100, beyer: 82 },
        { position: 5, day: 110, beyer: 84 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Needs Racing");
    expect(insight!.type).toBe("neutral");
  });

  it("does not trigger with insufficient fresh runs (< 2)", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 90 },
        { position: 5, day: 90, beyer: 70 },
        { position: 5, day: 100, beyer: 72 },
        { position: 5, day: 110, beyer: 74 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).not.toBe("Fires Fresh");
    expect(insight?.label).not.toBe("Needs Racing");
  });

  it("does not trigger with insufficient active runs (< 3)", () => {
    const horse = {
      raceHistory: [
        { position: 5, day: 1, beyer: 90 },
        { position: 5, day: 80, beyer: 88 },
        { position: 5, day: 90, beyer: 70 },
        { position: 5, day: 100, beyer: 72 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight?.label).not.toBe("Fires Fresh");
    expect(insight?.label).not.toBe("Needs Racing");
  });
});

describe("Insight priority ordering", () => {
  it("Win Streak takes priority over Bridesmaid", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1, beyer: 70 },
        { position: 2, day: 2, beyer: 72 },
        { position: 2, day: 3, beyer: 75 },
        { position: 1, day: 4, beyer: 80 },
        { position: 1, day: 5, beyer: 85 },
        { position: 1, day: 6, beyer: 90 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight!.label).toBe("Red Hot");
  });

  it("Bridesmaid takes priority over Model of Consistency", () => {
    const horse = {
      raceHistory: [
        { position: 2, day: 1, beyer: 70 },
        { position: 2, day: 2, beyer: 72 },
        { position: 2, day: 3, beyer: 75 },
        { position: 2, day: 4, beyer: 71 },
        { position: 2, day: 5, beyer: 73 },
      ],
    } as Horse;
    const insight = getHorseInsight(horse);
    expect(insight!.label).toBe("Bridesmaid");
  });
});

describe("Play Style Success insights", () => {
  it("detects Catch Me If You Can when horse has 2+ wire-to-wire wins", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [1, 1, 1] },
        { position: 1, day: 2, pacePositions: [1, 1, 1] },
        { position: 3, day: 3, pacePositions: [2, 2, 3] },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Catch Me If You Can");
    expect(insight!.type).toBe("positive");
  });
});

// Tipster insight variants — scaffolding for merge validation.
// These tests are skipped until the corresponding Tipster branches are merged.
// After merge, un-skip and verify each insight triggers correctly.
describe.skip("Tipster: Closing Kick insight", () => {
  it("detects Closing Kick when horse passes 6+ positions from first call", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [8, 5, 1], fieldSize: 8 },
        { position: 3, day: 2, pacePositions: [3, 3, 3], fieldSize: 8 },
        { position: 5, day: 3, pacePositions: [5, 4, 5], fieldSize: 8 },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Closing Kick");
  });
});

describe.skip("Tipster: From the Clouds insight", () => {
  it("detects From the Clouds when firstCall > ceil(fieldSize/2)", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [5, 3, 1], fieldSize: 8 },
        { position: 4, day: 2, pacePositions: [4, 4, 4], fieldSize: 8 },
        { position: 5, day: 3, pacePositions: [5, 5, 5], fieldSize: 8 },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("From the Clouds");
  });
});

describe.skip("Tipster: Late Bloomer insight", () => {
  it("detects Late Bloomer when firstCall > max(5, fieldSize * 0.65) with fieldSize >= 6", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [7, 4, 1], fieldSize: 10 },
        { position: 4, day: 2, pacePositions: [4, 4, 4], fieldSize: 10 },
        { position: 5, day: 3, pacePositions: [5, 5, 5], fieldSize: 10 },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Late Bloomer");
  });
});

describe.skip("Tipster: Surface Versatility insight", () => {
  it("detects Surface Versatility when horse wins on 2+ surfaces", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, surface: "Turf", beyer: 80 },
        { position: 1, day: 2, surface: "Dirt", beyer: 80 },
        { position: 5, day: 3, surface: "Turf", beyer: 70 },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Surface Versatility");
  });
});

describe.skip("Tipster: Tactical Versatility insight", () => {
  it("detects Tactical Versatility when horse has both wire-to-wire and closer wins", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [1, 1, 1] },
        { position: 1, day: 2, pacePositions: [6, 3, 1] },
        { position: 5, day: 3, pacePositions: [3, 3, 5] },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Tactical Versatility");
  });
});

describe.skip("Tipster: Late Charge insight", () => {
  it("detects Late Charge when horse has 2+ closer wins", () => {
    const horse = {
      raceHistory: [
        { position: 1, day: 1, pacePositions: [5, 3, 1] },
        { position: 1, day: 2, pacePositions: [6, 4, 1] },
        { position: 5, day: 3, pacePositions: [3, 3, 5] },
      ],
    };
    const insight = getHorseInsight(horse as unknown as import("@/core/horse/types").Horse);
    expect(insight).not.toBeNull();
    expect(insight!.label).toBe("Late Charge");
  });
});
