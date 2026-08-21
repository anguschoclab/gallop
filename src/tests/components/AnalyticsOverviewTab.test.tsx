import { describe, it, expect, afterEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { AnalyticsOverviewTab } from "@/components/analytics/AnalyticsOverviewTab";
import { h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";

describe("AnalyticsOverviewTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders overview header and key chart titles", () => {
    const h1 = createTestHorse({
      id: "h1",
      name: "Thunder",
      ownership: { type: "player" },
      lifecycleStatus: "active",
    });
    renderWithStore(<AnalyticsOverviewTab />, {
      day: 100,
      cash: 50000,
      horses: h2r([h1]),
      transactions: [],
    } as any);

    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Cash on hand")).toBeTruthy();
    expect(screen.getByText("Win rate")).toBeTruthy();
    expect(screen.getByText("ITM rate")).toBeTruthy();
    expect(screen.getByText("Active horses")).toBeTruthy();
  });
});
