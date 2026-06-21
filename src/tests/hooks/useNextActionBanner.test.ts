import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNextActionBanner } from "@/hooks/dashboard/useNextActionBanner";
import { useGame, type StoreType } from "@/game/store";

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

describe("useNextActionBanner", () => {
  let mockState: Partial<StoreType>;
  let updateDisplaySettings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateDisplaySettings = vi.fn();
    mockState = {
      userSettings: {
        display: {
          nextActionBannerDismissedAt: null,
          nextActionBannerDismissedKind: null,
        } as any,
      } as any,
      updateDisplaySettings,
    };
    (useGame as any).mockImplementation((selector: any) => selector(mockState));
  });

  it("returns isDismissed=false when dismissedAt is null", () => {
    const { result } = renderHook(() => useNextActionBanner());
    expect(result.current.isDismissed).toBe(false);
  });

  it("returns isDismissed=true when dismissedAt is set", () => {
    mockState.userSettings!.display!.nextActionBannerDismissedAt = Date.now();
    const { result } = renderHook(() => useNextActionBanner());
    expect(result.current.isDismissed).toBe(true);
  });

  it("dismiss writes timestamp and kind to display settings", () => {
    const { result } = renderHook(() => useNextActionBanner());
    act(() => {
      result.current.dismiss("race");
    });
    expect(updateDisplaySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        nextActionBannerDismissedAt: expect.any(Number),
        nextActionBannerDismissedKind: "race",
      }),
    );
  });

  it("restore clears timestamp and kind", () => {
    mockState.userSettings!.display!.nextActionBannerDismissedAt = Date.now();
    mockState.userSettings!.display!.nextActionBannerDismissedKind = "auction";
    const { result } = renderHook(() => useNextActionBanner());
    act(() => {
      result.current.restore();
    });
    expect(updateDisplaySettings).toHaveBeenCalledWith({
      nextActionBannerDismissedAt: null,
      nextActionBannerDismissedKind: null,
    });
  });
});
