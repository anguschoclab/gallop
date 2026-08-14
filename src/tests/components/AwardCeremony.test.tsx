import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AwardCeremony } from "@/components/awards/AwardCeremony";
import type { RegionalAward } from "@/core/awards/types";
import { CATEGORY_DESCRIPTIONS } from "@/core/awards/types";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? children : null,
  DialogContent: ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="dialog-content" className={className} style={style}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="next-btn" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@/components/awards/AwardIcon", () => ({
  AwardIcon: () => <span data-testid="award-icon" />,
}));

vi.mock("@/components/awards/AwardBadge", () => ({
  AwardBadge: () => <span data-testid="award-badge" />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => (
    <a
      href={to as string}
      data-to={to as string}
      data-params={params ? JSON.stringify(params) : ""}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/assets/awards", () => ({
  REGION_COLORS: {
    north_america: { bg: "#ff0000", accent: "#cc0000" },
    europe: { bg: "#00ff00", accent: "#00cc00" },
    asia_pacific: { bg: "#0000ff", accent: "#0000cc" },
    south_america: { bg: "#ffff00", accent: "#cccc00" },
  },
}));

const mkAward = (overrides: Partial<RegionalAward> = {}): RegionalAward => ({
  id: "award-1",
  year: 5,
  region: "north_america",
  category: "champion_3yo_male",
  horseId: "h1",
  horseName: "Thunder",
  points: 100,
  runnerUpPoints: 80,
  margin: 20,
  qualifyingRaces: ["r1", "r2"],
  ceremonyDay: 365,
  ...overrides,
});

const mkCeremony = (
  awards: RegionalAward[],
  region: RegionalAward["region"] = "north_america",
) => ({
  region,
  year: 5,
  awards,
});

describe("AwardCeremony", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders confetti overlay when player has wins", () => {
    const ceremony = mkCeremony([mkAward({ id: "a1", stableId: undefined })]);
    render(<AwardCeremony isOpen={true} onClose={() => {}} ceremonies={[ceremony]} />);
    expect(screen.getByTestId("confetti-overlay")).toBeTruthy();
  });

  it("does NOT render confetti when player has no wins", () => {
    const ceremony = mkCeremony([mkAward({ id: "a1", stableId: "npc-1" })]);
    render(<AwardCeremony isOpen={true} onClose={() => {}} ceremonies={[ceremony]} />);
    expect(screen.queryByTestId("confetti-overlay")).toBeNull();
  });

  it("does NOT render confetti when dialog is closed", () => {
    const ceremony = mkCeremony([mkAward({ id: "a1", stableId: undefined })]);
    render(<AwardCeremony isOpen={false} onClose={() => {}} ceremonies={[ceremony]} />);
    expect(screen.queryByTestId("confetti-overlay")).toBeNull();
  });

  it("resets confetti when navigating to ceremony with no player wins", () => {
    const ceremonies = [
      mkCeremony([mkAward({ id: "a1", stableId: undefined })]),
      mkCeremony([mkAward({ id: "a2", stableId: "npc-1" })], "europe"),
    ];
    render(<AwardCeremony isOpen={true} onClose={() => {}} ceremonies={ceremonies} />);

    expect(screen.getByTestId("confetti-overlay")).toBeTruthy();

    fireEvent.click(screen.getByTestId("next-btn"));

    expect(screen.queryByTestId("confetti-overlay")).toBeNull();
  });

  it("shows confetti again when navigating to ceremony with player wins", () => {
    const ceremonies = [
      mkCeremony([mkAward({ id: "a1", stableId: "npc-1" })]),
      mkCeremony([mkAward({ id: "a2", stableId: undefined })], "europe"),
    ];
    render(<AwardCeremony isOpen={true} onClose={() => {}} ceremonies={ceremonies} />);

    expect(screen.queryByTestId("confetti-overlay")).toBeNull();

    fireEvent.click(screen.getByTestId("next-btn"));

    expect(screen.getByTestId("confetti-overlay")).toBeTruthy();
  });

  it("returns null when ceremonies array is empty", () => {
    const { container } = render(
      <AwardCeremony isOpen={true} onClose={() => {}} ceremonies={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders CATEGORY_DESCRIPTIONS text below each category name in awards list", () => {
    const ceremony = mkCeremony([
      mkAward({ id: "a1", category: "champion_3yo_male", stableId: undefined }),
    ]);
    render(<AwardCeremony isOpen={true} onClose={() => {}} ceremonies={[ceremony]} />);
    expect(screen.getByText(CATEGORY_DESCRIPTIONS.champion_3yo_male)).toBeTruthy();
  });

  it("wraps award entries in Link to /awards/$category", () => {
    const ceremony = mkCeremony([
      mkAward({ id: "a1", category: "champion_3yo_male", stableId: undefined }),
    ]);
    const { container } = render(
      <AwardCeremony isOpen={true} onClose={() => {}} ceremonies={[ceremony]} />,
    );
    const categoryLinks = container.querySelectorAll('a[data-to="/awards/$category"]');
    expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
  });
});
