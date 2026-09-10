import "@/tests/setup";

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseBenchmarkDialog } from "@/components/history/HorseBenchmarkDialog";
import type { Race } from "@/core/race/types";

describe("HorseBenchmarkDialog", () => {
  beforeEach(() => {
    // Setup clean state
  });

  it("renders empty state message when the horse has no recorded race times", () => {
    renderWithStore(
      <HorseBenchmarkDialog
        horseId="h-none"
        horseName="Unraced Hope"
        open={true}
        onOpenChange={() => {}}
      />,
      { races: {} as any },
    );

    expect(screen.getByText("No recorded race times for this horse yet.")).toBeInTheDocument();
  });

  it("renders at-a-glance KPI cards and percentile meter when horse has race times", () => {
    const mockRaces: Record<string, Race> = {
      r1: {
        id: "r1",
        name: "Derby Trial",
        day: 10,
        distance: 2000,
        surface: "Dirt",
        result: [
          {
            horseId: "h-star" as any,
            time: 118.0, // fast pace
            position: 1,
          },
        ],
      } as Race,
    };

    renderWithStore(
      <HorseBenchmarkDialog
        horseId="h-star"
        horseName="Star Galloper"
        open={true}
        onOpenChange={() => {}}
      />,
      { races: mockRaces },
    );

    // Verify dialog header
    expect(screen.getByText("Star Galloper vs reference times")).toBeInTheDocument();

    // Verify summary cards
    expect(screen.getByText("Field Rank")).toBeInTheDocument();
    expect(screen.getByText("Field Percentile")).toBeInTheDocument();
    expect(screen.getByText("Outpaced")).toBeInTheDocument();
    expect(screen.getByText("Avg Pace Delta")).toBeInTheDocument();

    // Verify visual meter role and attributes
    const meter = screen.getByRole("meter");
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuenow");

    // Verify table headers
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Benchmark")).toBeInTheDocument();
    expect(screen.getByText("Their / mi")).toBeInTheDocument();
    expect(screen.getByText("Star Galloper / mi")).toBeInTheDocument();
    expect(screen.getByText("Standing")).toBeInTheDocument();
    expect(screen.getByText("Delta")).toBeInTheDocument();

    // Verify filter and sort controls
    expect(screen.getByText("All (15)")).toBeInTheDocument();
    expect(screen.getByText("Turf")).toBeInTheDocument();
    expect(screen.getByText("Dirt")).toBeInTheDocument();
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("Curated")).toBeInTheDocument();
    expect(screen.getByText("Distance")).toBeInTheDocument();

    // Verify matchup rank and standing badge render
    expect(screen.getAllByText("#1").length).toBeGreaterThan(0);
    const aheadBadges = screen.getAllByText("Ahead");
    expect(aheadBadges.length).toBeGreaterThan(0);
  });

  it("filters benchmark rows when clicking surface filter buttons", async () => {
    const mockRaces: Record<string, Race> = {
      r1: {
        id: "r1",
        name: "Derby Trial",
        day: 10,
        distance: 2000,
        surface: "Dirt",
        result: [
          {
            horseId: "h-star" as any,
            time: 118.0,
            position: 1,
          },
        ],
      } as Race,
    };

    const { fireEvent } = await import("@testing-library/react");

    renderWithStore(
      <HorseBenchmarkDialog
        horseId="h-star"
        horseName="Star Galloper"
        open={true}
        onOpenChange={() => {}}
      />,
      { races: mockRaces },
    );

    // Click Turf filter
    const turfBtn = screen.getByRole("button", { name: "Turf" });
    fireEvent.click(turfBtn);

    // Black Caviar (Turf) should be visible, Secretariat Belmont (Dirt) should not
    expect(screen.getByText("Black Caviar")).toBeInTheDocument();
    expect(screen.queryByText("Secretariat")).toBeNull();

    // Click Dirt filter
    const dirtBtn = screen.getByRole("button", { name: "Dirt" });
    fireEvent.click(dirtBtn);

    // Secretariat should now be visible, Black Caviar should not
    expect(screen.getAllByText("Secretariat").length).toBeGreaterThan(0);
    expect(screen.queryByText("Black Caviar")).toBeNull();
  });
});
