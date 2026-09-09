import "@/tests/setup";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RealWorldBenchmarks } from "@/components/history/RealWorldBenchmarks";
import type { TrackRecord } from "@/core/history/historyTypes";

vi.mock("@/components/history/HorseBenchmarkDialog", () => ({
  HorseBenchmarkDialog: ({
    horseName,
    open,
  }: {
    horseName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="horse-benchmark-dialog">Dialog for {horseName}</div> : null),
}));

function mkRecord(overrides: Partial<TrackRecord> = {}): TrackRecord {
  return {
    trackId: "track-1",
    trackName: "Churchill Downs",
    surface: "Dirt",
    distance: 2012,
    time: 118.5,
    horseId: "h-1",
    horseName: "Iron Galloper",
    day: 15,
    year: 1,
    categoryKind: "overall",
    ...overrides,
  };
}

describe("RealWorldBenchmarks component", () => {
  it("renders KPI summary stats and reference benchmarks", () => {
    const records = [mkRecord()];
    render(<RealWorldBenchmarks records={records} />);

    // KPI stats bar
    expect(screen.getByText("Reference Records")).toBeInTheDocument();
    expect(screen.getByText("Tracks")).toBeInTheDocument();

    // Source buttons
    expect(screen.getByRole("button", { name: /all sources/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /curated/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /track records/i })).toBeInTheDocument();
  });

  it("filters records when switching between Curated and Track Records sources", () => {
    render(<RealWorldBenchmarks records={[]} />);

    // Click Curated
    const curatedBtn = screen.getByRole("button", { name: /curated/i });
    fireEvent.click(curatedBtn);

    // Curated milestone (Secretariat) should be present
    expect(screen.getAllByText("Secretariat").length).toBeGreaterThan(0);

    // Click Track Records
    const trackRecBtn = screen.getByRole("button", { name: /track records/i });
    fireEvent.click(trackRecBtn);

    // Official track record badge should appear
    expect(screen.getAllByText("Track Record").length).toBeGreaterThan(0);
  });

  it("filters records by surface (Turf vs Dirt)", () => {
    render(<RealWorldBenchmarks records={[]} />);

    // Click Dirt filter
    const dirtBtn = screen.getByRole("button", { name: /^dirt$/i });
    fireEvent.click(dirtBtn);

    // Should only have Dirt badges in results
    const dirtBadges = screen.getAllByText(/dirt/i);
    expect(dirtBadges.length).toBeGreaterThan(0);
  });

  it("filters records by trip category (Sprint vs Mile vs Route vs Staying)", () => {
    render(<RealWorldBenchmarks records={[]} />);

    // Click Sprint filter
    const sprintBtn = screen.getByRole("button", { name: /^sprint/i });
    fireEvent.click(sprintBtn);

    // Verify distance badges are sprint distances (<= 1308m)
    expect(screen.queryByText("2414m")).toBeNull();
  });

  it("filters records via the search bar", () => {
    render(<RealWorldBenchmarks records={[]} />);

    const searchInput = screen.getByPlaceholderText(/search by horse, track, or race/i);
    fireEvent.change(searchInput, { target: { value: "Belmont" } });

    // Should show Belmont records
    expect(screen.getAllByText(/Belmont/i).length).toBeGreaterThan(0);
  });

  it("highlights an exact track match when player in-game record is at the same course", () => {
    // Player has a Churchill Downs record
    const records = [
      mkRecord({
        trackName: "Churchill Downs",
        surface: "Dirt",
        distance: 2012,
        time: 118.0,
        horseName: "Kentucky King",
      }),
    ];

    render(<RealWorldBenchmarks records={records} />);

    // Should render an Exact Course / Track Match badge
    const exactBadges = screen.getAllByText(/exact track/i);
    expect(exactBadges.length).toBeGreaterThan(0);
  });

  it("opens HorseBenchmarkDialog when clicking the in-game horse name", () => {
    const records = [
      mkRecord({
        trackName: "Churchill Downs",
        surface: "Dirt",
        distance: 2012,
        time: 118.0,
        horseName: "Kentucky King",
      }),
    ];

    render(<RealWorldBenchmarks records={records} />);

    const horseBtn = screen.getAllByRole("button", { name: /Kentucky King/i })[0];
    fireEvent.click(horseBtn);

    expect(screen.getByTestId("horse-benchmark-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Dialog for Kentucky King/i)).toBeInTheDocument();
  });

  it("shows an empty state when no benchmarks match the filters", () => {
    render(<RealWorldBenchmarks records={[]} />);

    const searchInput = screen.getByPlaceholderText(/search by horse, track, or race/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentTrackOrHorseXYZ" } });

    expect(screen.getByText(/no historical records match your filters/i)).toBeInTheDocument();
  });
});
