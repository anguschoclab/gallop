/**
 * Tests for dashboard widget tooltip accessibility (Palette-2 branch).
 *
 * Validates that icon-only buttons in dashboard widgets have aria-labels
 * and no native title attributes (which would be replaced by Tooltip components).
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { CircuitWidget } from "@/components/dashboard/CircuitWidget";
import { HQOpsWidget } from "@/components/dashboard/HQOpsWidget";
import { StableRosterWidget } from "@/components/dashboard/StableRosterWidget";
import { ImperialOutpostManager } from "@/components/facilities/ImperialOutpostManager";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("CircuitWidget — tooltip accessibility", () => {
  it("icon-only button has aria-label on wrapping element", () => {
    const { container } = renderWithStore(<CircuitWidget />);
    const ariaElements = container.querySelectorAll("[aria-label]");
    expect(ariaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<CircuitWidget />);
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });
});

describe("HQOpsWidget — tooltip accessibility", () => {
  it("icon-only button has aria-label on wrapping element", () => {
    const { container } = renderWithStore(<HQOpsWidget />);
    const ariaElements = container.querySelectorAll("[aria-label]");
    expect(ariaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<HQOpsWidget />);
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });
});

describe("StableRosterWidget — tooltip accessibility", () => {
  it("icon-only button has aria-label on wrapping element", () => {
    const { container } = renderWithStore(<StableRosterWidget />);
    const ariaElements = container.querySelectorAll("[aria-label]");
    expect(ariaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<StableRosterWidget />);
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });
});

describe("ImperialOutpostManager — tooltip accessibility", () => {
  it("icon-only button has aria-label on wrapping element", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />, {
      outposts: [
        {
          id: "op1",
          name: "Test Outpost",
          region: "eu",
          totalSlots: 10,
          facilities: {
            0: { id: "f1", type: "main_track", level: "basic", condition: 100 },
          },
        },
      ],
    });
    const ariaElements = container.querySelectorAll("[aria-label]");
    expect(ariaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />, {
      outposts: [
        {
          id: "op1",
          name: "Test Outpost",
          region: "eu",
          totalSlots: 10,
          facilities: {
            0: { id: "f1", type: "main_track", level: "basic", condition: 100 },
          },
        },
      ],
    });
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });
});
