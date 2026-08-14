import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaceGraph } from "@/components/race/PaceGraph";
import type { SectionalSplit } from "@/core/race/types";

vi.mock("recharts", () => {
  const Line = (props: Record<string, unknown>) => (
    <div
      data-testid="line"
      data-horse-id={String(props.dataKey)}
      data-stroke-width={String(props.strokeWidth)}
      data-stroke-opacity={String(props.strokeOpacity)}
      data-dot={JSON.stringify(props.dot)}
    />
  );
  const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  );
  const LineChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart">{children}</div>
  );
  const XAxis = () => <div data-testid="xaxis" />;
  const YAxis = () => <div data-testid="yaxis" />;
  const CartesianGrid = () => <div data-testid="grid" />;
  const Tooltip = () => <div data-testid="tooltip" />;
  const ReferenceLine = () => <div data-testid="refline" />;
  return {
    Line,
    ResponsiveContainer,
    LineChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
  };
});

vi.mock("@/components/SilkDot", () => ({
  SilkDot: () => <div data-testid="silk-dot" />,
}));

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => String(args.filter(Boolean).join(" ")),
}));

const runners = [
  { horseId: "h1", name: "Thunder", silk: "#ff0000", owned: true },
  { horseId: "h2", name: "Lightning", silk: "#00ff00", owned: false },
  { horseId: "h3", name: "Storm", silk: "#0000ff", owned: false },
];

const splits: SectionalSplit[] = [
  {
    label: "¼",
    distanceMeters: 400,
    entries: [
      { horseId: "h1", splitTime: 24, cumulativeTime: 24, rank: 1, velocityMs: 16.7 },
      { horseId: "h2", splitTime: 25, cumulativeTime: 25, rank: 2, velocityMs: 16.0 },
      { horseId: "h3", splitTime: 26, cumulativeTime: 26, rank: 3, velocityMs: 15.4 },
    ],
  },
  {
    label: "Fin",
    distanceMeters: 1600,
    entries: [
      { horseId: "h1", splitTime: 96, cumulativeTime: 96, rank: 1, velocityMs: 16.7 },
      { horseId: "h2", splitTime: 98, cumulativeTime: 98, rank: 2, velocityMs: 16.3 },
      { horseId: "h3", splitTime: 100, cumulativeTime: 100, rank: 3, velocityMs: 16.0 },
    ],
  },
];

function getLine(horseId: string) {
  return screen.getAllByTestId("line").find((el) => el.dataset.horseId === horseId)!;
}

describe("PaceGraph — highlight logic", () => {
  it("renders without crashing for valid splits + runners", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    expect(screen.getAllByTestId("line")).toHaveLength(3);
  });

  it("returns null when splits is empty", () => {
    const { container } = render(<PaceGraph splits={[]} runners={runners} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when runners is empty", () => {
    const { container } = render(<PaceGraph splits={splits} runners={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("owned runner gets strokeWidth=2 (pinned by default, highlighted)", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    const line = getLine("h1");
    expect(line.dataset.strokeWidth).toBe("2.5");
  });

  it("non-owned, non-pinned runner gets strokeWidth=1.25 when another runner is highlighted", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    const line = getLine("h2");
    expect(line.dataset.strokeWidth).toBe("1.25");
  });

  it("non-owned, non-pinned runner gets strokeOpacity=0.18 when another runner is highlighted (dimmed)", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    const line = getLine("h2");
    expect(line.dataset.strokeOpacity).toBe("0.18");
  });

  it("highlighted runner gets dot prop with silk color", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    const line = getLine("h1");
    expect(JSON.parse(line.dataset.dot!)).toEqual({ r: 3, fill: "#ff0000" });
  });

  it("non-highlighted runner gets dot=false", () => {
    render(<PaceGraph splits={splits} runners={runners} />);
    const line = getLine("h2");
    expect(JSON.parse(line.dataset.dot!)).toBe(false);
  });
});
