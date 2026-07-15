import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/game/store/storage", () => ({
  saveExists: { value: false },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => createElement("button", props, children),
}));

vi.mock("@/assets/hero-racetrack-dashboard.jpg", () => ({ default: "hero1" }));
vi.mock("@/assets/hero-racetrack-races.jpg", () => ({ default: "hero2" }));
vi.mock("@/assets/hero-stable.jpg", () => ({ default: "hero3" }));
vi.mock("@/assets/hero-grandstand.jpg", () => ({ default: "hero4" }));

import { StartScreen } from "@/routes/start";
import { useGame } from "@/game/store";
import { saveExists } from "@/game/store/storage";

function setupStore(overrides: Record<string, unknown> = {}) {
  (useGame as any).mockImplementation((selector: any) =>
    selector({
      playerProfile: null,
      day: 1,
      horses: {},
      ...overrides,
    }),
  );
}

describe("StartScreen save detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveExists.value = false;
    setupStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows Begin Your Stable when saveExists is false", () => {
    saveExists.value = false;
    setupStore({ playerProfile: null });

    render(<StartScreen />);
    expect(screen.getByText("Begin Your Stable")).toBeTruthy();
    expect(screen.queryByText("Continue")).toBeNull();
  });

  it("shows Continue when saveExists is true", () => {
    saveExists.value = true;
    setupStore({
      playerProfile: { stableName: "Test Stable", ownerName: "Test Owner" },
    });

    render(<StartScreen />);
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("shows Continue even when playerProfile is missing but saveExists is true", () => {
    saveExists.value = true;
    setupStore({ playerProfile: null });

    render(<StartScreen />);
    expect(screen.getByText("Continue")).toBeTruthy();
    expect(screen.queryByText("Begin Your Stable")).toBeNull();
  });
});
