/**
 * useStoreHydration.ts - React hook for tracking persisted game-store hydration.
 *
 * The zustand store rehydrates asynchronously from IndexedDB on first load. Components
 * that render on cold navigation should wait until hydration is finished before
 * deciding that data is missing.
 */
import { useEffect, useState } from "react";
import { hydrationComplete } from "@/game/store/storage";

export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(hydrationComplete.value);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (hydrationComplete.value) {
        setHydrated(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  return hydrated;
}
