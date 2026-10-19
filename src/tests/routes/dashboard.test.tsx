/**
 * dashboard.test.tsx
 *
 * Route-level test for the dashboard ("Welcome" heading, single next-action
 * CTA contract). Renders the real route component against the real store.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ComponentType } from "react";
import { cleanup } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { Route } from "@/routes/index";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultTutorialState } from "@/domains/tutorial/model/tutorialTypes";

const Dashboard = (Route as unknown as { options: { component: ComponentType } }).options.component;

describe("Dashboard route", () => {
  afterEach(cleanup);

  it("greets a new player with 'Welcome to your stable.' when they own no horses", () => {
    const { getByRole } = renderWithStore(createElement(Dashboard), {
      tutorial: { ...createDefaultTutorialState(), tutorialActive: false },
    });
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Welcome to your stable.");
  });

  it("greets a returning player with 'Welcome back' when they own horses", () => {
    const horse = createTestHorse({ id: "h1" });
    const { getByRole } = renderWithStore(createElement(Dashboard), {
      horses: { h1: horse },
      tutorial: { ...createDefaultTutorialState(), tutorialActive: false },
    });
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Welcome back");
  });

  it("renders exactly one next-action CTA in the banner region", () => {
    const { container } = renderWithStore(createElement(Dashboard), {
      tutorial: { ...createDefaultTutorialState(), tutorialActive: false },
    });
    const banner = container.querySelector('[aria-label="Next action"]');
    expect(banner).not.toBeNull();
    expect(banner!.querySelectorAll("a").length).toBe(1);
  });
});
