import { describe, it, expect } from "vitest";
import { findInvitationQualifiers } from "@/core/awards/invitations";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race } from "@/core/race/types";

describe("findInvitationQualifiers", () => {
  const raceMap = new Map<string, Race>([
    [
      "race-1",
      {
        id: "race-1",
        name: "Test Race NA",
        graded: {
          track: "Woodbine",
          grade: "G1",
          key: "race-1",
          trackId: "track-1",
          surface: "Dirt",
        },
      } as Race,
    ],
    [
      "race-2",
      {
        id: "race-2",
        name: "Test Race EU",
        graded: { track: "Ascot", grade: "G1", key: "race-2", trackId: "track-2", surface: "Turf" },
      } as Race,
    ],
    [
      "race-3",
      {
        id: "race-3",
        name: "Test Race G2",
        graded: {
          track: "Woodbine",
          grade: "G2",
          key: "race-3",
          trackId: "track-3",
          surface: "Dirt",
        },
      } as Race,
    ],
  ]);

  it("finds valid top-3 performances for player in a specified year and region", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Valid NA",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 1,
          day: 100,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });

    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(1);
    expect(results[0].horseId).toBe("h1");
  });

  it("ignores performances by NPC-owned horses", () => {
    const horse = createTestHorse({
      id: "h2",
      ownership: { type: "npc", stableId: "npc-1" as any },
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 1,
          day: 100,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(0);
  });

  it("ignores finishes worse than 3rd", () => {
    const horse = createTestHorse({
      id: "h3",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 4,
          day: 100,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(0);
  });

  it("ignores performances outside the specified year", () => {
    const horse = createTestHorse({
      id: "h4",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 1,
          day: 400, // Year 2
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(0);
  });

  it("ignores races outside the specified region", () => {
    const horse = createTestHorse({
      id: "h5",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-2",
          raceName: "Test Race EU",
          position: 1,
          day: 100,
          grade: "G1",
          distance: 2000,
          surface: "Turf",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(0);
  });

  it("ignores non-G1 races", () => {
    const horse = createTestHorse({
      id: "h6",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-3",
          raceName: "Test Race G2",
          position: 1,
          day: 100,
          grade: "G2",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(0);
  });

  it("sorts results by day descending", () => {
    const horse = createTestHorse({
      id: "h7",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 1,
          day: 100,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
        {
          raceId: "race-1",
          raceName: "Test Race NA",
          position: 2,
          day: 200,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });
    const results = findInvitationQualifiers([horse], 1, "north_america", raceMap);
    expect(results).toHaveLength(2);
    expect(results[0].day).toBe(200);
    expect(results[1].day).toBe(100);
  });
});
