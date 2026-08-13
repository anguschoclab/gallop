import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestGenotype } from "@/tests/helpers/createTestGenotype";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import type { Horse } from "@/core/horse/types";
import type { Jockey } from "@/core/jockey/types";
import type { JockeyTrait } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

vi.mock("@/core/horse/horseFactory", () => ({
  ensurePhenotypeResolved: (h: Horse) => h,
}));

vi.mock("@/core/horse/stats", () => ({
  calculateOverallRating: (h: Horse) => h.potential ?? 50,
}));

import { JockeyRoster } from "@/components/jockey/JockeyRoster";
import { StaffTeamList } from "@/components/staff/StaffTeamList";

describe("Trait Search Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Jockey Roster: seed 3 jockeys with different traits, search by trait text, verify correct subset", () => {
    const jockeys: Jockey[] = [
      createTestJockey({ id: "j1", name: "Alice", traits: ["gate_master"] as JockeyTrait[] }),
      createTestJockey({ id: "j2", name: "Bob", traits: ["hill_specialist"] as JockeyTrait[] }),
      createTestJockey({ id: "j3", name: "Carol", traits: ["bullring_expert"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const searchInput = screen.getByPlaceholderText(/jockey name/i);
    fireEvent.change(searchInput, { target: { value: "hill" } });
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Carol")).toBeNull();
  });

  it("Jockey Roster: trait dropdown filter selects correct subset", () => {
    const jockeys: Jockey[] = [
      createTestJockey({ id: "j1", name: "Alice", traits: ["gate_master"] as JockeyTrait[] }),
      createTestJockey({ id: "j2", name: "Bob", traits: ["hill_specialist"] as JockeyTrait[] }),
      createTestJockey({ id: "j3", name: "Carol", traits: ["gate_master"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const traitSelect = screen.getByDisplayValue("All Traits");
    fireEvent.change(traitSelect, { target: { value: "gate_master" } });
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("Staff: seed 3 staff with different traits, filter by trait, verify correct subset", () => {
    const staff: StaffMember[] = [
      {
        id: "s1",
        name: "Alice",
        role: "trainer",
        tier: "mid",
        salary: 500,
        bonusValue: 0.1,
        traits: ["speed_coach"],
        fame: 50,
      },
      {
        id: "s2",
        name: "Bob",
        role: "veterinarian",
        tier: "mid",
        salary: 500,
        bonusValue: 0.1,
        traits: ["colic_expert"],
        fame: 50,
      },
      {
        id: "s3",
        name: "Carol",
        role: "trainer",
        tier: "elite",
        salary: 1000,
        bonusValue: 0.2,
        traits: ["speed_coach", "distance_guru"],
        fame: 80,
      },
    ];
    renderWithStore(
      <StaffTeamList
        staff={staff}
        honorCounts={{ G1: 0, G2: 0, G3: 0 }}
        showHonors={false}
        onFire={vi.fn()}
        traitFilter="speed_coach"
      />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("Staff: text search matches trait text across staff", () => {
    const staff: StaffMember[] = [
      {
        id: "s1",
        name: "Alice",
        role: "trainer",
        tier: "mid",
        salary: 500,
        bonusValue: 0.1,
        traits: ["speed_coach"],
        fame: 50,
      },
      {
        id: "s2",
        name: "Bob",
        role: "farrier",
        tier: "mid",
        salary: 500,
        bonusValue: 0.1,
        traits: ["mud_expert"],
        fame: 50,
      },
    ];
    renderWithStore(
      <StaffTeamList
        staff={staff}
        honorCounts={{ G1: 0, G2: 0, G3: 0 }}
        showHonors={false}
        onFire={vi.fn()}
        search="mud"
      />,
    );
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });
});
