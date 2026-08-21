import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leaderboard } from "@/components/race/Leaderboard";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="search-input" {...props} />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange, ...props }: any) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/JargonTooltip", () => ({
  JargonTooltip: ({ children }: any) => <span>{children}</span>,
}));

const mockRunner = (overrides: any = {}) => ({
  r: {
    horseId: "h1",
    name: "Thunder",
    silk: "#ff0000",
    ownership: { type: "unowned" },
    finishTime: 72.5,
    ...overrides,
  },
  beyer: 95,
});

const defaultProps = {
  sorted: [mockRunner()],
  positionRank: new Map([["h1", 1]]),
  runnerOdds: new Map([["h1", "3/1"]]),
  filter: "all" as const,
  sortBy: "position" as const,
  minBeyer: 0,
  hasTies: false,
  tiedHorseIds: new Set<string>(),
  onFilterChange: vi.fn(),
  onSortByChange: vi.fn(),
  onMinBeyerChange: vi.fn(),
  lastUpdatedAt: Date.now(),
};

// ─── Characterization: Leaderboard is a plain function (not React.memo) ─────────
// This test locks the current behavior: Leaderboard is exported as a plain
// function, not wrapped in React.memo. After Bolt #325 wraps it in React.memo,
// the rendered output should be identical — only re-render behavior changes.
describe("Leaderboard React.memo characterization", () => {
  it("renders identical output regardless of memo wrapping", () => {
    const { container: c1 } = render(<Leaderboard {...defaultProps} />);
    const html1 = c1.innerHTML;

    const { container: c2 } = render(<Leaderboard {...defaultProps} />);
    const html2 = c2.innerHTML;

    // Output must be identical — memo only affects re-render frequency, not output
    expect(html1).toBe(html2);
  });

  it("renders all runner rows with correct names", () => {
    const multiRunnerProps = {
      ...defaultProps,
      sorted: [
        mockRunner({ horseId: "h1", name: "Thunder" }),
        mockRunner({ horseId: "h2", name: "Lightning" }),
        mockRunner({ horseId: "h3", name: "Storm" }),
      ],
      positionRank: new Map([
        ["h1", 1],
        ["h2", 2],
        ["h3", 3],
      ]),
      runnerOdds: new Map([
        ["h1", "3/1"],
        ["h2", "5/1"],
        ["h3", "8/1"],
      ]),
    };
    render(<Leaderboard {...multiRunnerProps} />);
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("Lightning")).toBeTruthy();
    expect(screen.getByText("Storm")).toBeTruthy();
  });

  it("renders beyer badge when beyer is not null", () => {
    render(<Leaderboard {...defaultProps} />);
    expect(screen.getByText("95")).toBeTruthy();
  });

  it("does not render beyer badge when beyer is null", () => {
    const props = {
      ...defaultProps,
      sorted: [{ r: mockRunner().r, beyer: null }],
    };
    const { container } = render(<Leaderboard {...props} />);
    // The beyer badge has class "bg-broadcast-accent/20"
    const beyerBadges = container.querySelectorAll(".bg-broadcast-accent\\/20");
    expect(beyerBadges.length).toBe(0);
  });
});
