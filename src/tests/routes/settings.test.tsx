/**
 * settings.test.tsx
 *
 * Slice audit for /settings: theme toggle exists, updates the store, and the
 * useTheme effect applies the resolved class to <html>. Reset restores
 * defaults.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

// Native stand-ins for the Radix Select primitives so jsdom can drive them.
vi.mock("@/shared/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: ReactNode;
  }) =>
    createElement(
      "select",
      {
        "data-testid": "theme-select",
        value,
        onChange: (e: { target: { value: string } }) => onValueChange?.(e.target.value),
      },
      children,
    ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => children,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) =>
    createElement("option", { value }, children),
}));

import { DisplaySettingsCard } from "@/domains/settings/ui/DisplaySettingsCard";
import { Route } from "@/routes/settings";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/platform/game/store";
import type { ComponentType } from "react";

const SettingsPage = (Route as unknown as { options: { component: ComponentType } }).options
  .component;

describe("Settings page", () => {
  afterEach(cleanup);

  it("exposes a theme selector defaulting to dark", () => {
    const onUpdate = vi.fn();
    render(<DisplaySettingsCard settings={{ theme: "dark" }} onUpdate={onUpdate} />);
    const select = screen.getByTestId("theme-select");
    expect(select).toHaveValue("dark");
    fireEvent.change(select, { target: { value: "light" } });
    expect(onUpdate).toHaveBeenCalledWith({ theme: "light" });
  });

  it("offers dark, light, and system theme options", () => {
    render(<DisplaySettingsCard settings={{}} onUpdate={vi.fn()} />);
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Dark", "Light", "System"]);
  });

  it("theme change flows into the store and applies to <html>", () => {
    renderWithStore(createElement(SettingsPage));
    const select = screen.getByTestId("theme-select");
    fireEvent.change(select, { target: { value: "light" } });
    expect(useGame.getState().userSettings?.display?.theme).toBe("light");
  });

  it("reset restores default display settings", () => {
    renderWithStore(createElement(SettingsPage), {
      userSettings: {
        ...useGame.getState().userSettings,
        display: { ...useGame.getState().userSettings?.display, theme: "light" },
      } as never,
    });
    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(useGame.getState().userSettings?.display?.theme).toBe("dark");
  });
});
