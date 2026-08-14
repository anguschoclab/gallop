import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { PersonRaceHistoryTab } from "@/components/person/PersonRaceHistoryTab";
import { createTestHorse } from "@/tests/helpers";
import { h2r } from "@/tests/helpers/sampleGameState";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { Horse, GameState } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) =>
    createElement("a", { href: to.replace("$horseId", params?.horseId ?? ""), ...props }, children),
}));

// Mock Radix-based Select with native HTML select for JSDOM compatibility
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange }: any) =>
    createElement(
      "select",
      {
        "data-testid": "grade-filter",
        value,
        onChange: (e: any) => onValueChange?.(e.target.value),
      },
      [
        createElement("option", { key: "all", value: "all" }, "All Grades"),
        createElement("option", { key: "G1", value: "G1" }, "G1"),
        createElement("option", { key: "G2", value: "G2" }, "G2"),
        createElement("option", { key: "G3", value: "G3" }, "G3"),
      ],
    ),
  SelectTrigger: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectValue: () => null,
}));

type RaceEntry = Horse["raceHistory"][number];

function mkRaceEntry(partial: Partial<RaceEntry> & { raceId: string }): RaceEntry {
  return {
    raceName: "Test Race",
    position: 1,
    day: 1,
    ...partial,
  } as RaceEntry;
}

function mkHorseWithHistory(
  id: string,
  name: string,
  entries: RaceEntry[],
  overrides?: Partial<Horse>,
): Horse {
  return createTestHorse({
    id,
    name,
    raceHistory: entries,
    pedigree: {
      name,
      generation: 0,
      sireName: "Sire",
      damName: "Dam",
    },
    ...overrides,
  });
}

function mkStaff(
  id: string,
  role: StaffMember["role"],
  stableId: string,
  overrides?: Partial<StaffMember>,
): StaffMember {
  return {
    id,
    name: `Test ${role}`,
    role,
    tier: "mid",
    salary: 500,
    bonusValue: 0.25,
    traits: [],
    fame: 50,
    stableId,
    ...overrides,
  };
}

describe("PersonRaceHistoryTab", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Renders correct number of races for jockey role
  it("renders correct number of races for jockey role", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-1", position: 1, day: 10 }),
        mkRaceEntry({ raceId: "r-2", jockeyId: "j-1", position: 2, day: 20 }),
      ]),
      mkHorseWithHistory("h-2", "Horse 2", [
        mkRaceEntry({ raceId: "r-3", jockeyId: "j-1", position: 3, day: 30 }),
        mkRaceEntry({ raceId: "r-4", jockeyId: "j-1", position: 1, day: 40 }),
      ]),
      mkHorseWithHistory("h-3", "Horse 3", [
        mkRaceEntry({ raceId: "r-5", jockeyId: "j-1", position: 2, day: 50 }),
        mkRaceEntry({ raceId: "r-6", jockeyId: "j-1", position: 1, day: 60 }),
        mkRaceEntry({ raceId: "r-7", jockeyId: "j-other", position: 1, day: 70 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    const rows = screen.getAllByTestId("race-row");
    expect(rows).toHaveLength(6);
  });

  // 2. Displays accurate role badge per entry
  it("displays accurate role badge per entry", () => {
    // Use personId "t-1" which is both the jockeyId for jockey entries,
    // the stableId for owner entries, and the staff id for trainer entries.
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        // Entry matching jockey role (jockeyId = personId)
        mkRaceEntry({ raceId: "r-1", jockeyId: "t-1", stableId: "s-1", position: 1, day: 10 }),
        // Entry matching owner role (stableId = personId, different jockeyId)
        mkRaceEntry({ raceId: "r-2", jockeyId: "other", stableId: "t-1", position: 2, day: 20 }),
        // Entry matching trainer role (stableId in trainerStableIds, different jockeyId)
        mkRaceEntry({ raceId: "r-3", jockeyId: "other", stableId: "s-1", position: 3, day: 30 }),
      ]),
    ];
    const hiredStaff: StaffMember[] = [mkStaff("t-1", "trainer", "s-1")];

    renderWithStore(
      <PersonRaceHistoryTab personId="t-1" roles={["jockey", "owner", "trainer"]} />,
      { horses: h2r(horses), hiredStaff } as unknown as Partial<GameState>,
    );

    const rows = screen.getAllByTestId("race-row");
    expect(rows).toHaveLength(3);

    // Rows are sorted by day desc: day 30 (trainer), day 20 (owner), day 10 (jockey)
    expect(within(rows[0]).getByText("trainer")).toBeTruthy();
    expect(within(rows[1]).getByText("owner")).toBeTruthy();
    expect(within(rows[2]).getByText("jockey")).toBeTruthy();
  });

  // 3. Displays accurate outcome fields (position, grade, beyer)
  it("displays accurate outcome fields (position, grade, beyer)", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({
          raceId: "r-1",
          jockeyId: "j-1",
          position: 1,
          day: 10,
          grade: "G1",
          beyer: 95,
        }),
        mkRaceEntry({
          raceId: "r-2",
          jockeyId: "j-1",
          position: 3,
          day: 20,
        }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    const rows = screen.getAllByTestId("race-row");

    // First row (newest first — day 20 is first)
    const row1 = rows[0];
    expect(within(row1).getByText("3")).toBeTruthy();
    expect(within(row1).queryByText("G1")).toBeNull();

    // Second row (day 10)
    const row2 = rows[1];
    expect(within(row2).getByText("1")).toBeTruthy();
    expect(within(row2).getByText("G1")).toBeTruthy();
    expect(within(row2).getByText("95")).toBeTruthy();
  });

  // 4. Stats summary matches seeded data
  it("stats summary matches seeded data (starts/wins/podium/win%)", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-1", position: 1, day: 10 }),
        mkRaceEntry({ raceId: "r-2", jockeyId: "j-1", position: 1, day: 20 }),
        mkRaceEntry({ raceId: "r-3", jockeyId: "j-1", position: 2, day: 30 }),
        mkRaceEntry({ raceId: "r-4", jockeyId: "j-1", position: 3, day: 40 }),
        mkRaceEntry({ raceId: "r-5", jockeyId: "j-1", position: 5, day: 50 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    // Stats are inside StatBox components — use getAllByText since position
    // values in race rows can collide with stat values
    const startsBox = screen.getByText("Starts").closest("div")?.parentElement;
    expect(startsBox?.querySelector(".text-lg")?.textContent).toBe("5");

    const winsBox = screen.getByText("Wins").closest("div")?.parentElement;
    expect(winsBox?.querySelector(".text-lg")?.textContent).toBe("2");

    const podiumBox = screen.getByText("Podium").closest("div")?.parentElement;
    expect(podiumBox?.querySelector(".text-lg")?.textContent).toBe("4");

    // Win % is unique enough to use getByText directly
    expect(screen.getByText("40.0%")).toBeTruthy();
  });

  // 5. Grade filter narrows results
  it("grade filter narrows results", async () => {
    const user = userEvent.setup();
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-1", position: 1, day: 10, grade: "G1" }),
        mkRaceEntry({ raceId: "r-2", jockeyId: "j-1", position: 2, day: 20, grade: "G2" }),
        mkRaceEntry({ raceId: "r-3", jockeyId: "j-1", position: 3, day: 30, grade: "G3" }),
        mkRaceEntry({ raceId: "r-4", jockeyId: "j-1", position: 1, day: 40, grade: "G1" }),
        mkRaceEntry({ raceId: "r-5", jockeyId: "j-1", position: 2, day: 50 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    // All 5 rows initially
    expect(screen.getAllByTestId("race-row")).toHaveLength(5);

    // Select G1 using the native select mock
    const gradeFilter = screen.getByTestId("grade-filter") as HTMLSelectElement;
    await user.selectOptions(gradeFilter, "G1");

    // Only 2 G1 rows
    expect(screen.getAllByTestId("race-row")).toHaveLength(2);

    // Reset to All
    await user.selectOptions(gradeFilter, "all");

    expect(screen.getAllByTestId("race-row")).toHaveLength(5);
  });

  // 6. Sort toggle reverses date order
  it("sort toggle reverses date order", async () => {
    const user = userEvent.setup();
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({
          raceId: "r-1",
          jockeyId: "j-1",
          position: 1,
          day: 10,
          raceName: "Day 10 Race",
        }),
        mkRaceEntry({
          raceId: "r-2",
          jockeyId: "j-1",
          position: 2,
          day: 30,
          raceName: "Day 30 Race",
        }),
        mkRaceEntry({
          raceId: "r-3",
          jockeyId: "j-1",
          position: 3,
          day: 20,
          raceName: "Day 20 Race",
        }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    const rows = screen.getAllByTestId("race-row");
    // Default: newest first (day 30, 20, 10)
    expect(within(rows[0]).getByText("Day 30 Race")).toBeTruthy();
    expect(within(rows[1]).getByText("Day 20 Race")).toBeTruthy();
    expect(within(rows[2]).getByText("Day 10 Race")).toBeTruthy();

    // Click sort toggle
    const sortToggle = screen.getByTestId("sort-toggle");
    await user.click(sortToggle);

    // Now oldest first (day 10, 20, 30)
    const rowsAfter = screen.getAllByTestId("race-row");
    expect(within(rowsAfter[0]).getByText("Day 10 Race")).toBeTruthy();
    expect(within(rowsAfter[1]).getByText("Day 20 Race")).toBeTruthy();
    expect(within(rowsAfter[2]).getByText("Day 30 Race")).toBeTruthy();
  });

  // 7. Trainer role finds races via hiredStaff stableId
  it("trainer role finds races via hiredStaff stableId", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", stableId: "s-1", position: 1, day: 10 }),
        mkRaceEntry({ raceId: "r-2", stableId: "s-1", position: 2, day: 20 }),
      ]),
      mkHorseWithHistory("h-2", "Horse 2", [
        mkRaceEntry({ raceId: "r-3", stableId: "s-1", position: 3, day: 30 }),
        mkRaceEntry({ raceId: "r-4", stableId: "s-other", position: 1, day: 40 }),
      ]),
    ];
    const hiredStaff: StaffMember[] = [mkStaff("t-1", "trainer", "s-1")];

    renderWithStore(<PersonRaceHistoryTab personId="t-1" roles={["trainer"]} />, {
      horses: h2r(horses),
      hiredStaff,
    } as unknown as Partial<GameState>);

    const rows = screen.getAllByTestId("race-row");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(within(row).getByText("trainer")).toBeTruthy();
    }
  });

  // 8. Owner role finds races via stableId match
  it("owner role finds races via stableId match", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", stableId: "stable-1", position: 1, day: 10 }),
      ]),
      mkHorseWithHistory("h-2", "Horse 2", [
        mkRaceEntry({ raceId: "r-2", stableId: "stable-1", position: 2, day: 20 }),
      ]),
      mkHorseWithHistory("h-3", "Horse 3", [
        mkRaceEntry({ raceId: "r-3", stableId: "stable-1", position: 3, day: 30 }),
        mkRaceEntry({ raceId: "r-4", stableId: "stable-other", position: 1, day: 40 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="stable-1" roles={["owner"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    const rows = screen.getAllByTestId("race-row");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(within(row).getByText("owner")).toBeTruthy();
    }
  });

  // 9. Empty state when no matching entries
  it("renders empty state when no matching entries", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-other", position: 1, day: 10 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    expect(screen.getByText(/No race records on file/i)).toBeTruthy();
    expect(screen.queryByTestId("race-row")).toBeNull();
  });

  // 10. Horse link points to /stable/$horseId
  it("horse link points to /stable/$horseId", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-1", position: 1, day: 10 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    const link = screen.getByRole("link", { name: "Horse 1" });
    expect(link.getAttribute("href")).toContain("/stable/h-1");
  });

  // 11. Gate is displayed when present in race history entry
  it("displays gate in race row when present", () => {
    const horses: Horse[] = [
      mkHorseWithHistory("h-1", "Horse 1", [
        mkRaceEntry({ raceId: "r-1", jockeyId: "j-1", position: 2, day: 10, gate: 7 }),
      ]),
    ];

    renderWithStore(<PersonRaceHistoryTab personId="j-1" roles={["jockey"]} />, {
      horses: h2r(horses),
    } as unknown as Partial<GameState>);

    expect(screen.getByText("G7")).toBeTruthy();
  });
});
