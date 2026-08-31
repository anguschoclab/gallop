import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  createRootRoute: (opts: any) => opts,
  Outlet: () => createElement("div"),
  HeadContent: () => null,
  Scripts: () => null,
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: () => createElement("div", { "data-testid": "app-shell" }),
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/game/store", () => ({
  rehydrateStore: vi.fn(),
  useGame: vi.fn(() => null),
  initEngineWorker: vi.fn(),
  initInitializationWorker: vi.fn(),
}));

vi.mock("@/game/store/storage", () => ({
  saveExists: { value: false },
  hydrationComplete: { value: false },
}));

import { RootComponent } from "@/routes/__root";
import { rehydrateStore } from "@/game/store";
import { saveExists, hydrationComplete } from "@/game/store/storage";

describe("RootComponent redirect and error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    saveExists.value = false;
    hydrationComplete.value = false;
    (rehydrateStore as any).mockResolvedValue(undefined);
    navigate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows loading spinner while not hydrated", () => {
    (rehydrateStore as any).mockImplementation(() => new Promise(() => {}));

    render(<RootComponent />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("redirects to /start when saveExists is false and hydrated", async () => {
    (rehydrateStore as any).mockImplementation(async () => {
      hydrationComplete.value = true;
    });

    render(<RootComponent />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(navigate).toHaveBeenCalledWith({ to: "/start" });
  });

  it("does NOT redirect when saveExists is true but playerProfile is missing", async () => {
    saveExists.value = true;
    (rehydrateStore as any).mockImplementation(async () => {
      hydrationComplete.value = true;
    });

    render(<RootComponent />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows error UI when rehydrateStore throws", async () => {
    (rehydrateStore as any).mockRejectedValue(new Error("Storage corrupted"));

    render(<RootComponent />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText("Failed to load")).toBeTruthy();
    expect(screen.getByText("Storage corrupted")).toBeTruthy();
  });

  it("shows timeout UI after 5s if not hydrated", async () => {
    (rehydrateStore as any).mockImplementation(() => new Promise(() => {}));

    render(<RootComponent />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText("Loading timed out")).toBeTruthy();
  });

  it("retry button re-calls rehydrateStore and clears error", async () => {
    let firstCall = true;
    (rehydrateStore as any).mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return Promise.reject(new Error("First fail"));
      }
      hydrationComplete.value = true;
      return Promise.resolve();
    });

    render(<RootComponent />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText("Failed to load")).toBeTruthy();

    fireEvent.click(screen.getByText("Retry"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect((rehydrateStore as any).mock.calls.length).toBe(2);
  });
});
