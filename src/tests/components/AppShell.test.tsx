import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, cleanup } from "@testing-library/react";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: "/dashboard" }),
  Outlet: () => createElement("div", { "data-testid": "outlet" }),
}));

vi.mock("@/platform/game/hooks/useAutoSave", () => ({
  useAutoSave: () => ({}),
}));

vi.mock("@/platform/game/hooks/useCoreState", () => ({
  useDay: () => 1,
  useCash: () => 50000,
  useHorses: () => [],
}));

vi.mock("@/platform/game/hooks/useSystemsState", () => ({
  useAwards: () => [],
}));

vi.mock("@/platform/game/hooks/useSkipToNext", () => ({
  useSkipToNext: () => () => {},
}));

vi.mock("@/domains/awards/application/hooks/useAwardCeremony", () => ({
  useAwardCeremony: () => ({
    showCeremony: false,
    setShowCeremony: () => {},
    pendingCeremonies: [],
    clearPendingCeremonies: () => {},
  }),
}));

vi.mock("@/domains/race/ui/PlayerRacePrompt", () => ({
  PlayerRacePrompt: () => null,
}));

vi.mock("@/domains/race/ui/AutoSimPanel", () => ({
  AutoSimPanel: () => null,
}));

vi.mock("@/domains/awards/ui", () => ({
  AwardCeremony: () => null,
}));

vi.mock("@/domains/shell/ui/SidebarNav", () => ({
  SidebarNav: (props: Record<string, unknown>) =>
    createElement(
      "div",
      { "data-testid": "sidebar" },
      createElement(
        "button",
        { onClick: props.onStartNewGame as () => void, "data-testid": "start-new-game" },
        "Start new game",
      ),
    ),
}));

import { useGame } from "@/platform/game/store";
import { createDefaultGameState } from "@/platform/game/store/state";
import { AppShell } from "@/domains/shell/ui/AppShell";

describe("AppShell navigation", () => {
  beforeEach(() => {
    navigate.mockClear();
    useGame.setState({
      ...createDefaultGameState(),
      playerProfile: {
        stableName: "Test Stable",
        ownerName: "Test Owner",
        silk: { primary: "#000", secondary: "#fff", cap: "#000", pattern: "solid" },
        backstoryId: "rags",
        founded: 1,
      } as any,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("Start new game button calls navigate({ to: '/new-game' })", () => {
    const { container } = render(createElement(AppShell));
    const btn = container.querySelector('[data-testid="start-new-game"]') as HTMLElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(navigate).toHaveBeenCalledWith({ to: "/new-game" });
  });

  it("does NOT assign to window.location.href", () => {
    const originalHref = window.location.href;
    const { container } = render(createElement(AppShell));
    const btn = container.querySelector('[data-testid="start-new-game"]') as HTMLElement;
    btn.click();
    expect(window.location.href).toBe(originalHref);
  });
});
