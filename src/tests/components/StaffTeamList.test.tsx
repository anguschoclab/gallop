import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

import { StaffTeamList } from "@/components/staff/StaffTeamList";

interface TestStaff {
  id: string;
  name: string;
  role: string;
  tier: string;
  salary: number;
  traits: string[];
}

function mkStaff(id: string, overrides: Partial<TestStaff> = {}): TestStaff {
  return {
    id,
    name: `Staff ${id}`,
    role: "trainer",
    tier: "mid",
    salary: 500,
    traits: [],
    ...overrides,
  };
}

const baseProps = {
  honorCounts: { G1: 0, G2: 0, G3: 0 },
  showHonors: false,
  onFire: vi.fn(),
};

describe("StaffTeamList — trait search & filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all staff when no search or trait filter", () => {
    const staff = [mkStaff("s1", { name: "Alice" }), mkStaff("s2", { name: "Bob" })];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("text search 'speed' matches staff with speed_coach trait", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: ["speed_coach"] }),
      mkStaff("s2", { name: "Bob", traits: ["colic_expert"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} search="speed" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("text search 'colic' matches staff with colic_expert trait", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: ["speed_coach"] }),
      mkStaff("s2", { name: "Bob", traits: ["colic_expert"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} search="colic" />);
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("text search also matches staff name", () => {
    const staff = [
      mkStaff("s1", { name: "Alice Wonder", traits: ["speed_coach"] }),
      mkStaff("s2", { name: "Bob Builder", traits: ["colic_expert"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} search="wonder" />);
    expect(screen.getByText("Alice Wonder")).toBeTruthy();
    expect(screen.queryByText("Bob Builder")).toBeNull();
  });

  it("trait filter 'speed_coach' filters to only staff with that trait", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: ["speed_coach"] }),
      mkStaff("s2", { name: "Bob", traits: ["colic_expert"] }),
      mkStaff("s3", { name: "Carol", traits: ["speed_coach"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} traitFilter="speed_coach" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("staff with empty traits shown when no trait filter active", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: [] }),
      mkStaff("s2", { name: "Bob", traits: ["speed_coach"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("staff with empty traits hidden when trait filter is specific", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: [] }),
      mkStaff("s2", { name: "Bob", traits: ["speed_coach"] }),
    ];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} traitFilter="speed_coach" />);
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("combined search + trait filter works", () => {
    const staff = [
      mkStaff("s1", { name: "Alice", traits: ["speed_coach"] }),
      mkStaff("s2", { name: "Alice B", traits: ["speed_coach", "colic_expert"] }),
      mkStaff("s3", { name: "Alice C", traits: ["colic_expert"] }),
    ];
    renderWithStore(
      <StaffTeamList staff={staff} {...baseProps} search="alice" traitFilter="speed_coach" />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Alice B")).toBeTruthy();
    expect(screen.queryByText("Alice C")).toBeNull();
  });

  it("displays formatted trait labels", () => {
    const staff = [mkStaff("s1", { name: "Alice", traits: ["speed_coach"] })];
    renderWithStore(<StaffTeamList staff={staff} {...baseProps} />);
    expect(screen.getByText("SPEED COACH")).toBeTruthy();
  });
});
