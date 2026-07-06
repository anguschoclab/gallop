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
  it("icon-only button has aria-label", () => {
    const { container } = renderWithStore(<CircuitWidget />);
    const ariaButtons = container.querySelectorAll('button[aria-label]');
    expect(ariaButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<CircuitWidget />);
    const titledButtons = container.querySelectorAll('button[title]');
    expect(titledButtons).toHaveLength(0);
  });
});

describe("HQOpsWidget — tooltip accessibility", () => {
  it("icon-only button has aria-label", () => {
    const { container } = renderWithStore(<HQOpsWidget />);
    const ariaButtons = container.querySelectorAll('button[aria-label]');
    expect(ariaButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<HQOpsWidget />);
    const titledButtons = container.querySelectorAll('button[title]');
    expect(titledButtons).toHaveLength(0);
  });
});

describe("StableRosterWidget — tooltip accessibility", () => {
  it("icon-only button has aria-label", () => {
    const { container } = renderWithStore(<StableRosterWidget />);
    const ariaButtons = container.querySelectorAll('button[aria-label]');
    expect(ariaButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<StableRosterWidget />);
    const titledButtons = container.querySelectorAll('button[title]');
    expect(titledButtons).toHaveLength(0);
  });
});

describe("ImperialOutpostManager — tooltip accessibility", () => {
  it("icon-only button has aria-label", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />);
    const ariaButtons = container.querySelectorAll('button[aria-label]');
    expect(ariaButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("no native title attributes on buttons", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />);
    const titledButtons = container.querySelectorAll('button[title]');
    expect(titledButtons).toHaveLength(0);
  });
});
