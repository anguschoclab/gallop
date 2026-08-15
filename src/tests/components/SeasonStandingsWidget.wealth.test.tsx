import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { SeasonStandingsWidget } from "@/components/dashboard/SeasonStandingsWidget";
import { createTestHorse, createTestStable } from "@/tests/helpers";

async function clickTab(name: string) {
  const tab = screen.getByRole("tab", { name: new RegExp(name, "i") });
  await userEvent.click(tab);
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("SeasonStandingsWidget — Wealth tab", () => {
  it("renders both Earnings and Wealth tab triggers", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    expect(screen.getByText("Earnings")).toBeTruthy();
    expect(screen.getByText("Wealth")).toBeTruthy();
  });

  it("default tab is Earnings (range buttons visible on mount)", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    expect(screen.getByText("7D")).toBeTruthy();
    expect(screen.getByText("30D")).toBeTruthy();
    expect(screen.getByText("90D")).toBeTruthy();
  });

  it("clicking Wealth tab shows wealth table with Cash / Horse Assets / Total Wealth columns", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    seedStore({
      ...createDefaultGameState(),
      cash: 500000,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    expect(screen.getByText("Cash")).toBeTruthy();
    expect(screen.getByText("Horse Assets")).toBeTruthy();
    expect(screen.getByText("Total Wealth")).toBeTruthy();
  });

  it("Wealth tab renders player stable name", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    seedStore({
      ...createDefaultGameState(),
      cash: 500000,
      horses: { h1 },
      playerProfile: {
        stableName: "Thunder Ranch",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    expect(screen.getByText("Thunder Ranch")).toBeTruthy();
  });

  it("Wealth tab renders NPC stable names as Links to /npc-stables/$stableId", async () => {
    const stable = createTestStable({ id: "npc1", name: "Rival Stable", cash: 800000 });
    seedStore({
      ...createDefaultGameState(),
      npcStables: [stable],
    });
    const { container } = render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Rival Stable");
  });

  it("Wealth tab shows formatCurrency values in rows", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    seedStore({
      ...createDefaultGameState(),
      cash: 500000,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    // formatCurrency(500000) = "$500,000"
    expect(screen.getByText("$500,000")).toBeTruthy();
  });

  it("clicking a wealth row opens the WealthDetailsPanel", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    seedStore({
      ...createDefaultGameState(),
      cash: 500000,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    fireEvent.click(screen.getByText("My Stable"));
    // WealthDetailsPanel should show "Horse Breakdown" heading
    expect(screen.getByText("Horse Breakdown")).toBeTruthy();
  });

  it("Wealth tab does NOT show range buttons (7D/30D/90D)", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    seedStore({
      ...createDefaultGameState(),
      cash: 500000,
      horses: { h1 },
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    // Range buttons are inside the earnings TabsContent which Radix hides with hidden=""
    const rangeBtn = screen.queryByText("7D");
    // 7D may still be in DOM but should be hidden (inside inactive tab content)
    if (rangeBtn) {
      const content = rangeBtn.closest("[data-state]");
      expect(content?.getAttribute("data-state")).toBe("inactive");
    }
    // Wealth tab trigger should be active
    const wealthTrigger = screen.getByRole("tab", { name: /wealth/i });
    expect(wealthTrigger.getAttribute("data-state")).toBe("active");
  });

  it("existing earnings tests still pass (backward compatibility)", () => {
    const h1 = createTestHorse({
      id: "h1",
      owned: true,
      name: "Thunder",
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test",
          position: 1,
          day: 55,
          beyer: 80,
          purse: 100000,
          purseEarned: 60000,
          surface: "Turf",
          distance: 1600,
        } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    // Earnings tab is default, should show "My Stable"
    expect(screen.getByText("My Stable")).toBeTruthy();
    // Range buttons visible
    expect(screen.getByText("7D")).toBeTruthy();
  });

  it("rank badge shows earnings rank on earnings tab and wealth rank on wealth tab", async () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "My Horse" });
    const stable = createTestStable({ id: "npc1", name: "Rich Stable", cash: 10000000 });
    seedStore({
      ...createDefaultGameState(),
      cash: 50000,
      horses: { h1 },
      npcStables: [stable],
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    // On earnings tab (default), badge shows earnings rank
    const badge = screen.getByText(/You: #/);
    expect(badge.textContent).toMatch(/You: #/);

    // Switch to wealth tab — badge should update to wealth rank
    await clickTab("Wealth");
    const wealthBadge = screen.getByText(/You: #/);
    expect(wealthBadge).toBeTruthy();
    // Player should be rank 2 (NPC has 10M cash vs player 50K + 1 horse)
    expect(wealthBadge.textContent).toBe("You: #2");
  });

  it("wealth tab limits rows to top N and appends player row when outside top N", async () => {
    // Create 12 NPC stables with more cash than player to push player outside top 10
    const npcStables = Array.from({ length: 12 }, (_, i) =>
      createTestStable({
        id: `npc${i}`,
        name: `Stable ${i}`,
        cash: 1000000 + i * 100000,
      }),
    );
    seedStore({
      ...createDefaultGameState(),
      cash: 1000,
      npcStables,
      playerProfile: {
        stableName: "Poor Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    render(<SeasonStandingsWidget />);
    await clickTab("Wealth");
    // Player should still be visible (appended after top N)
    expect(screen.getByText("Poor Stable")).toBeTruthy();
    // Player rank should be 13 (12 NPC stables + player)
    const badge = screen.getByText(/You: #/);
    expect(badge.textContent).toBe("You: #13");
  });
});
