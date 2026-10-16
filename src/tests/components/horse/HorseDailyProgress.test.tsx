import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { HorseDailyProgress } from "@/components/horse/HorseDailyProgress";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { HorseDailySnapshot } from "@/core/horse/dailyProgress";

const snap = (day: number, netWorth?: number): HorseDailySnapshot => ({
  day,
  speed: 50,
  stamina: 50,
  acceleration: 50,
  consistency: 50,
  ovr: 60,
  form: 50,
  energy: 90,
  price: 10000,
  ...(netWorth === undefined ? {} : { netWorth }),
});

describe("HorseDailyProgress", () => {
  it("renders a Net worth line from the snapshot", () => {
    const horse = createTestHorse({ id: "h1" });
    renderWithStore(<HorseDailyProgress horseId="h1" />, {
      horses: { h1: horse },
      horseDailyProgress: { h1: [snap(4, 20000), snap(5, 25700)] },
    });

    expect(screen.getAllByText("Net worth").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$25,700").length).toBeGreaterThan(0);
  });

  it("renders — for legacy snapshots without a netWorth value", () => {
    const horse = createTestHorse({ id: "h1" });
    renderWithStore(<HorseDailyProgress horseId="h1" />, {
      horses: { h1: horse },
      horseDailyProgress: { h1: [snap(4), snap(5)] },
    });

    // Card still renders; the Net worth row falls back to a dash.
    expect(screen.getByText("Daily Progress")).toBeDefined();
    expect(screen.getAllByText("Net worth").length).toBeGreaterThan(0);
    expect(screen.queryByText("$25,700")).toBeNull();
  });

  it("shows each day's prize money in the day table", () => {
    const horse = createTestHorse({
      id: "h1",
      raceHistory: [
        { raceId: "r1", raceName: "Maiden", position: 1, day: 5, purseEarned: 3000 },
        { raceId: "r2", raceName: "Claimer", position: 2, day: 5, purseEarned: 500 },
      ],
    });
    renderWithStore(<HorseDailyProgress horseId="h1" />, {
      horses: { h1: horse },
      horseDailyProgress: { h1: [snap(4, 20000), snap(5, 25700)] },
    });

    expect(screen.getAllByText("Prize").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$3,500").length).toBeGreaterThan(0);
  });
});
