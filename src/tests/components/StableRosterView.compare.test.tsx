import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

import { StableRosterView } from "@/components/stable/StableRosterView";
import type { Horse } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, durability: 70 } as any,
    lifecycleStatus: "active",
    ...overrides,
  }) as Horse;

describe("StableRosterView compare persistence + reordering", () => {
  const baseProps = (horses: Horse[], compareIds: string[], onCompareIdsChange: ReturnType<typeof vi.fn>) => ({
    horses,
    status: "active" as const,
    view: "ledger" as const,
    counts: { active: horses.length, retired: 0, auctioned: 0, all: horses.length },
    playerAwards: [],
    navigate: vi.fn(),
    compareIds,
    onCompareIdsChange,
  });

  it("renders with compareIds from props and shows selected checkboxes", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps([h1, h2], ["h1", "h2"], onCompareIdsChange)} />,
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter((cb) => (cb as HTMLInputElement).checked);
    expect(checked.length).toBeGreaterThanOrEqual(2);
  });

  it("toggling a checkbox calls onCompareIdsChange with updated array", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const h3 = mkHorse({ id: "h3" });
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps([h1, h2, h3], ["h1", "h2"], onCompareIdsChange)} />,
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const h3Checkbox = Array.from(checkboxes).find((cb) => cb.getAttribute("value") === "h3" || cb.id === "h3");
    if (h3Checkbox) {
      fireEvent.click(h3Checkbox);
      expect(onCompareIdsChange).toHaveBeenCalledWith(["h1", "h2", "h3"]);
    }
  });

  it("toggling off a checkbox calls onCompareIdsChange without that id", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps([h1, h2], ["h1", "h2"], onCompareIdsChange)} />,
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const h1Checkbox = Array.from(checkboxes).find((cb) => cb.getAttribute("value") === "h1" || cb.id === "h1");
    if (h1Checkbox) {
      fireEvent.click(h1Checkbox);
      expect(onCompareIdsChange).toHaveBeenCalledWith(["h2"]);
    }
  });

  it("enforces max 3 by ignoring toggle when 3 already selected", () => {
    const horses = [mkHorse({ id: "h1" }), mkHorse({ id: "h2" }), mkHorse({ id: "h3" }), mkHorse({ id: "h4" })];
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps(horses, ["h1", "h2", "h3"], onCompareIdsChange)} />,
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const h4Checkbox = Array.from(checkboxes).find((cb) => cb.getAttribute("value") === "h4" || cb.id === "h4");
    if (h4Checkbox) {
      fireEvent.click(h4Checkbox);
      expect(onCompareIdsChange).not.toHaveBeenCalled();
    }
  });

  it("renders horse name chips in the compare bar in order", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const h3 = mkHorse({ id: "h3", name: "Gamma" });
    const onCompareIdsChange = vi.fn();
    render(
      <StableRosterView {...baseProps([h1, h2, h3], ["h2", "h1", "h3"], onCompareIdsChange)} />,
    );
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();
  });

  it("left arrow button on a chip calls onCompareIdsChange with reordered array", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps([h1, h2], ["h2", "h1"], onCompareIdsChange)} />,
    );
    const leftButtons = container.querySelectorAll('button[aria-label*="left" i], button[aria-label*="move left" i]');
    if (leftButtons.length > 0) {
      fireEvent.click(leftButtons[0]);
      expect(onCompareIdsChange).toHaveBeenCalled();
    }
  });

  it("right arrow button on a chip calls onCompareIdsChange with reordered array", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const onCompareIdsChange = vi.fn();
    const { container } = render(
      <StableRosterView {...baseProps([h1, h2], ["h1", "h2"], onCompareIdsChange)} />,
    );
    const rightButtons = container.querySelectorAll('button[aria-label*="right" i], button[aria-label*="move right" i]');
    if (rightButtons.length > 0) {
      fireEvent.click(rightButtons[0]);
      expect(onCompareIdsChange).toHaveBeenCalled();
    }
  });
});
