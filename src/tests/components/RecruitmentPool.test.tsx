import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

import { RecruitmentPool } from "@/components/staff/RecruitmentPool";

interface PoolMember {
  id: string;
  name: string;
  role: string;
  tier: string;
  salary: number;
  bonusValue: number;
  traits: string[];
  offended?: boolean;
  offendedUntil?: number;
}

function mkPoolMember(id: string, overrides: Partial<PoolMember> = {}): PoolMember {
  return {
    id,
    name: `Member ${id}`,
    role: "trainer",
    tier: "mid",
    salary: 500,
    bonusValue: 0.1,
    traits: [],
    ...overrides,
  };
}

const baseProps = {
  day: 1,
  onNegotiate: vi.fn(),
};

describe("RecruitmentPool — trait search & filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all pool members when no search or trait filter", () => {
    const pool = [mkPoolMember("p1", { name: "Alice" }), mkPoolMember("p2", { name: "Bob" })];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("text search 'speed' matches members with speed_coach trait", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice", traits: ["speed_coach"] }),
      mkPoolMember("p2", { name: "Bob", traits: ["colic_expert"] }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} search="speed" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("text search 'colic' matches members with colic_expert trait", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice", traits: ["speed_coach"] }),
      mkPoolMember("p2", { name: "Bob", traits: ["colic_expert"] }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} search="colic" />);
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("text search also matches member name", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice Wonder" }),
      mkPoolMember("p2", { name: "Bob Builder" }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} search="wonder" />);
    expect(screen.getByText("Alice Wonder")).toBeTruthy();
    expect(screen.queryByText("Bob Builder")).toBeNull();
  });

  it("trait filter 'speed_coach' filters to only members with that trait", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice", traits: ["speed_coach"] }),
      mkPoolMember("p2", { name: "Bob", traits: ["colic_expert"] }),
      mkPoolMember("p3", { name: "Carol", traits: ["speed_coach"] }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} traitFilter="speed_coach" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("members with empty traits shown when no trait filter active", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice", traits: [] }),
      mkPoolMember("p2", { name: "Bob", traits: ["speed_coach"] }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("members with empty traits hidden when trait filter is specific", () => {
    const pool = [
      mkPoolMember("p1", { name: "Alice", traits: [] }),
      mkPoolMember("p2", { name: "Bob", traits: ["speed_coach"] }),
    ];
    renderWithStore(<RecruitmentPool staffPool={pool} {...baseProps} traitFilter="speed_coach" />);
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });
});
