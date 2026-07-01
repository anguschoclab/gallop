import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockPathname = "/";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  useRouterState: ({ select }: { select?: (s: any) => any } = {}) =>
    select
      ? select({ location: { pathname: mockPathname } })
      : { location: { pathname: mockPathname } },
}));

import { NavSection } from "@/components/NavSection";
import { SidebarNav } from "@/components/SidebarNav";
import { STORAGE_PREFIX, clearAllSidebarStorage } from "@/components/NavSection";

const icon = () => createElement("span", { "data-testid": "icon" });

const sectionItems = [
  { to: "/stable", label: "Stables", icon, exact: false },
  { to: "/breeding", label: "Breeding", icon, exact: false },
];

const defaultProps = {
  label: "My Stable",
  items: sectionItems,
  unreadCount: 0,
  defaultCollapsed: true,
};

const sidebarProps = {
  day: 1,
  cash: 50000,
  horseCount: 5,
  unreadCount: 0,
  onAdvanceDay: vi.fn(),
  onAdvanceWeek: vi.fn(),
  onAdvanceMonth: vi.fn(),
  onOpenAutoSim: vi.fn(),
  onSkipToAuction: vi.fn(),
  onSkipToRace: vi.fn(),
  onStartNewGame: vi.fn(),
};

describe("NavSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // Group 1 — localStorage persistence
  describe("localStorage persistence", () => {
    it("T1.1: opening a collapsed section writes '1' to localStorage", () => {
      render(<NavSection {...defaultProps} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      fireEvent.click(btn);
      expect(localStorage.getItem(STORAGE_PREFIX + "My Stable")).toBe("1");
    });

    it("T1.2: closing an open section writes '0' to localStorage", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      fireEvent.click(btn);
      expect(localStorage.getItem(STORAGE_PREFIX + "My Stable")).toBe("0");
    });

    it("T1.3: pre-seeded localStorage '1' makes section start open", () => {
      localStorage.setItem(STORAGE_PREFIX + "My Stable", "1");
      render(<NavSection {...defaultProps} />);
      expect(screen.getByText("Stables")).toBeTruthy();
    });

    it("T1.4: pre-seeded localStorage '0' makes section start collapsed", () => {
      localStorage.setItem(STORAGE_PREFIX + "My Stable", "0");
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      expect(screen.queryByText("Stables")).toBeNull();
    });

    it("T1.5: route change to a path inside a collapsed section auto-opens it", () => {
      mockPathname = "/";
      const { rerender } = render(<NavSection {...defaultProps} />);
      expect(screen.queryByText("Stables")).toBeNull();
      mockPathname = "/stable";
      rerender(<NavSection {...defaultProps} />);
      expect(screen.getByText("Stables")).toBeTruthy();
    });

    it("T1.6: open state persists across unmount + remount with same localStorage", () => {
      localStorage.setItem(STORAGE_PREFIX + "My Stable", "1");
      const { unmount } = render(<NavSection {...defaultProps} />);
      expect(screen.getByText("Stables")).toBeTruthy();
      unmount();
      render(<NavSection {...defaultProps} />);
      expect(screen.getByText("Stables")).toBeTruthy();
    });
  });

  // Group 2 — localStorage unavailability
  describe("localStorage unavailability", () => {
    it("T2.1: getItem throws → falls back to default state, still renders and toggles", () => {
      const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      expect(screen.getByText("Stables")).toBeTruthy();
      const btn = screen.getByText("My Stable").closest("button")!;
      fireEvent.click(btn);
      expect(screen.queryByText("Stables")).toBeNull();
      spy.mockRestore();
    });

    it("T2.2: setItem throws → toggle still works in-memory, no crash", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      render(<NavSection {...defaultProps} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      expect(() => fireEvent.click(btn)).not.toThrow();
      expect(screen.getByText("Stables")).toBeTruthy();
      spy.mockRestore();
    });

    it("T2.3: removeItem throws → reset still works, no crash", () => {
      localStorage.setItem(STORAGE_PREFIX + "My Stable", "1");
      const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      expect(() => clearAllSidebarStorage()).not.toThrow();
      spy.mockRestore();
    });
  });

  // Group 3 — ARIA attributes
  describe("ARIA attributes", () => {
    it("T3.1: button has aria-expanded='true' when open", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      expect(btn.getAttribute("aria-expanded")).toBe("true");
    });

    it("T3.2: button has aria-expanded='false' when collapsed", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={true} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });

    it("T3.3: button has aria-controls pointing to content region id", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      const controlsId = btn.getAttribute("aria-controls");
      expect(controlsId).toBeTruthy();
      const region = document.getElementById(controlsId!);
      expect(region).toBeTruthy();
    });

    it("T3.4: content region has role='region'", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const region = screen.getByRole("region");
      expect(region).toBeTruthy();
    });

    it("T3.5: content region has aria-labelledby pointing to button id", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const region = screen.getByRole("region");
      const labelledBy = region.getAttribute("aria-labelledby");
      expect(labelledBy).toBeTruthy();
      const btn = document.getElementById(labelledBy!);
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe("BUTTON");
    });

    it("T3.6: button id is section-header-{label}", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      expect(btn.id).toBe("section-header-My Stable");
    });

    it("T3.7: content region id is section-content-{label}", () => {
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const region = screen.getByRole("region");
      expect(region.id).toBe("section-content-My Stable");
    });
  });

  // Group 4 — Keyboard navigation
  describe("keyboard navigation", () => {
    function renderMultipleSections() {
      const container = createElement(
        "div",
        { "data-accordion-container": true },
        createElement(NavSection, { ...defaultProps, label: "Section A", defaultCollapsed: false }),
        createElement(NavSection, { ...defaultProps, label: "Section B", defaultCollapsed: true }),
        createElement(NavSection, { ...defaultProps, label: "Section C", defaultCollapsed: true }),
      );
      return render(container);
    }

    it("T4.1: Enter on collapsed header opens it", async () => {
      const user = userEvent.setup();
      render(<NavSection {...defaultProps} defaultCollapsed={true} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      btn.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByText("Stables")).toBeTruthy();
    });

    it("T4.2: Enter on expanded header closes it", async () => {
      const user = userEvent.setup();
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      btn.focus();
      await user.keyboard("{Enter}");
      expect(screen.queryByText("Stables")).toBeNull();
    });

    it("T4.3: Space on collapsed header opens it", async () => {
      const user = userEvent.setup();
      render(<NavSection {...defaultProps} defaultCollapsed={true} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      btn.focus();
      await user.keyboard(" ");
      expect(screen.getByText("Stables")).toBeTruthy();
    });

    it("T4.4: Escape on expanded header collapses it", async () => {
      const user = userEvent.setup();
      render(<NavSection {...defaultProps} defaultCollapsed={false} />);
      const btn = screen.getByText("My Stable").closest("button")!;
      btn.focus();
      await user.keyboard("{Escape}");
      expect(screen.queryByText("Stables")).toBeNull();
    });

    it("T4.5: ArrowDown moves focus to next header", async () => {
      const user = userEvent.setup();
      renderMultipleSections();
      const headers = screen.getAllByText(/Section [ABC]/).map((el) => el.closest("button")!);
      headers[0].focus();
      expect(document.activeElement).toBe(headers[0]);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(headers[1]);
    });

    it("T4.6: ArrowUp moves focus to previous header", async () => {
      const user = userEvent.setup();
      renderMultipleSections();
      const headers = screen.getAllByText(/Section [ABC]/).map((el) => el.closest("button")!);
      headers[1].focus();
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(headers[0]);
    });

    it("T4.7: ArrowDown on last header wraps to first", async () => {
      const user = userEvent.setup();
      renderMultipleSections();
      const headers = screen.getAllByText(/Section [ABC]/).map((el) => el.closest("button")!);
      headers[2].focus();
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(headers[0]);
    });

    it("T4.8: ArrowUp on first header wraps to last", async () => {
      const user = userEvent.setup();
      renderMultipleSections();
      const headers = screen.getAllByText(/Section [ABC]/).map((el) => el.closest("button")!);
      headers[0].focus();
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(headers[2]);
    });
  });

  // Group 5 — Reset sidebar layout
  describe("reset sidebar layout", () => {
    it("T5.1: 'Reset sidebar layout' button exists in the Configuration section", () => {
      render(<SidebarNav {...sidebarProps} />);
      // Open Configuration section (collapsed by default)
      fireEvent.click(screen.getByText("Configuration").closest("button")!);
      const btn = screen.getByLabelText("Reset sidebar layout");
      expect(btn).toBeTruthy();
    });

    it("T5.2: clicking it clears all gallop_sidebar_section:* keys from localStorage", () => {
      localStorage.setItem(STORAGE_PREFIX + "Headquarters", "0");
      localStorage.setItem(STORAGE_PREFIX + "My Stable", "1");
      render(<SidebarNav {...sidebarProps} />);
      fireEvent.click(screen.getByText("Configuration").closest("button")!);
      const btn = screen.getByLabelText("Reset sidebar layout");
      fireEvent.click(btn);
      // After reset, persist effect writes defaults: Headquarters open ("1"), My Stable collapsed ("0")
      expect(localStorage.getItem(STORAGE_PREFIX + "Headquarters")).toBe("1");
      expect(localStorage.getItem(STORAGE_PREFIX + "My Stable")).toBe("0");
    });

    it("T5.3: after reset, first section (Headquarters) is open, rest are collapsed", () => {
      render(<SidebarNav {...sidebarProps} />);
      // Expand My Stable manually
      const myStableBtn = screen.getByText("My Stable").closest("button")!;
      fireEvent.click(myStableBtn);
      expect(screen.getByText("Stables")).toBeTruthy();
      // Open Configuration to access reset button
      fireEvent.click(screen.getByText("Configuration").closest("button")!);
      const resetBtn = screen.getByLabelText("Reset sidebar layout");
      fireEvent.click(resetBtn);
      // Headquarters should be open (contains Dashboard at "/")
      expect(screen.getByText("Dashboard")).toBeTruthy();
      // My Stable should be collapsed
      expect(screen.queryByText("Stables")).toBeNull();
    });

    it("T5.4: after reset, previously user-expanded sections are collapsed back to defaults", () => {
      render(<SidebarNav {...sidebarProps} />);
      // Expand The World
      const worldBtn = screen.getByText("The World").closest("button")!;
      fireEvent.click(worldBtn);
      expect(screen.getByText("Racing")).toBeTruthy();
      // Open Configuration to access reset button
      fireEvent.click(screen.getByText("Configuration").closest("button")!);
      const resetBtn = screen.getByLabelText("Reset sidebar layout");
      fireEvent.click(resetBtn);
      // The World should be collapsed again
      expect(screen.queryByText("Racing")).toBeNull();
    });
  });
});
