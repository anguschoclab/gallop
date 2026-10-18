import { useGame, type StoreType } from "@/platform/game/store";
import type { NextActionKind } from "@/domains/dashboard/simulation/nextAction";

export function useNextActionBanner() {
  const dismissedAt = useGame(
    (s: StoreType) => s.userSettings?.display?.nextActionBannerDismissedAt ?? null,
  );
  const updateDisplaySettings = useGame((s: StoreType) => s.updateDisplaySettings);

  const isDismissed = dismissedAt !== null;

  function dismiss(kind?: NextActionKind) {
    updateDisplaySettings({
      nextActionBannerDismissedAt: Date.now(),
      nextActionBannerDismissedKind: kind ?? null,
    });
  }

  function restore() {
    updateDisplaySettings({
      nextActionBannerDismissedAt: null,
      nextActionBannerDismissedKind: null,
    });
  }

  return { isDismissed, dismiss, restore };
}
