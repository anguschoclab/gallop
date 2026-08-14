import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeedBreakdownChart } from "@/components/race/SpeedBreakdownChart";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

vi.mock("recharts", () => {
  const Line = (props: Record<string, unknown>) => (
    <div
      data-testid="line"
      data-horseId={String(props.dataKey)}
      data-strokeWidth={String(props.strokeWidth)}
      data-strokeOpacity={String(props.strokeOpacity)}
      data-strokeDasharray={String(props.strokeDasharray ?? "")}
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

const snapshots: RaceSnapshot[] = Array.from({ length: 10 }, (_, i) => ({
  t: i,
  horses: [
    {
      horseId: "h1",
      position: 1600 - i * 160,
      lane: 0,
      velocity: 16,
      seekContribution: 0.3,
      spurtContribution: 0.5,
    },
    {
      horseId: "h2",
      position: 1600 - i * 150,
      lane: 1,
      velocity: 15,
      seekContribution: 0.2,
      spurtContribution: 0.4,
    },
    {
      horseId: "h3",
      position: 1600 - i * 140,
      lane: 2,
      velocity: 14,
      seekContribution: 0.1,
      spurtContribution: 0.3,
    },
  ],
}));

function getLine(horseId: string) {
  return screen.getAllByTestId("line").find((el) => el.dataset.horseId === horseId)!;
}

describe("SpeedBreakdownChart — highlight logic", () => {
  it("renders without crashing for valid snapshots + runners", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    // 3 runners × 2 lines (seek + spurt) = 6 lines
    expect(screen.getAllByTestId("line")).toHaveLength(6);
  });

  it("returns null when snapshots is empty", () => {
    const { container } = render(
      <SpeedBreakdownChart snapshots={[]} runners={runners} distance={1600} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when runners is empty", () => {
    const { container } = render(
      <SpeedBreakdownChart snapshots={snapshots} runners={[]} distance={1600} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("owned runner seek line gets strokeWidth=2 (highlighted, pinned)", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const seekLine = getLine("h1_seek");
    expect(seekLine.dataset.strokeWidth).toBe("2");
  });

  it("owned runner spurt line gets strokeWidth=2.5 (highlighted, pinned)", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const spurtLine = getLine("h1_spurt");
    expect(spurtLine.dataset.strokeWidth).toBe("2.5");
  });

  it("non-owned, non-pinned runner seek line gets strokeWidth=1 when dimmed", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const seekLine = getLine("h2_seek");
    expect(seekLine.dataset.strokeWidth).toBe("1");
  });

  it("non-owned, non-pinned runner spurt line gets strokeWidth=1.25 when dimmed", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const spurtLine = getLine("h2_spurt");
    expect(spurtLine.dataset.strokeWidth).toBe("1.25");
  });

  it("non-owned seek line gets strokeOpacity=0.12 when dimmed", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const seekLine = getLine("h2_seek");
    expect(seekLine.dataset.strokeOpacity).toBe("0.12");
  });

  it("non-owned spurt line gets strokeOpacity=0.18 when dimmed", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const spurtLine = getLine("h2_spurt");
    expect(spurtLine.dataset.strokeOpacity).toBe("0.18");
  });

  it("seek line has dashed strokeDasharray", () => {
    render(<SpeedBreakdownChart snapshots={snapshots} runners={runners} distance={1600} />);
    const seekLine = getLine("h1_seek");
    expect(seekLine.dataset.strokeDasharray).toBe("4 4");
  });
});
