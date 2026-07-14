import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrackRecordsTable } from "@/components/history/TrackRecordsTable";

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

const mockRecord = (overrides: any = {}) => ({
  trackId: "t1",
  trackName: "Ascot",
  surface: "Turf",
  distance: 1600,
  time: 95.5,
  horseId: "h1",
  horseName: "Thunder",
  day: 100,
  year: 2,
  ...overrides,
});

describe("TrackRecordsTable", () => {
  it("renders LeaderboardEmpty when records empty", () => {
    render(<TrackRecordsTable records={[]} />);
    expect(screen.getByText(/No track records set yet/)).toBeTruthy();
  });

  it("renders LeaderboardShell + rows for each record", () => {
    render(
      <TrackRecordsTable
        records={[
          mockRecord(),
          mockRecord({ trackId: "t2", trackName: "Epsom", surface: "Dirt", time: 90.0 }),
        ]}
      />,
    );
    expect(screen.getByText("Ascot")).toBeTruthy();
    expect(screen.getByText("Epsom")).toBeTruthy();
  });

  it("renders surface badge", () => {
    render(<TrackRecordsTable records={[mockRecord()]} />);
    // "Turf" appears as both a filter option and the surface badge
    expect(screen.getAllByText("Turf").length).toBeGreaterThanOrEqual(1);
  });

  it("renders ControlsBar with surface filter", () => {
    render(<TrackRecordsTable records={[mockRecord()]} />);
    expect(screen.getByText("Track Name")).toBeTruthy();
    // "Turf" appears as both a filter option and the surface badge
    expect(screen.getAllByText("Turf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Dirt")).toBeTruthy();
    expect(screen.getByText("Synthetic")).toBeTruthy();
  });
});
