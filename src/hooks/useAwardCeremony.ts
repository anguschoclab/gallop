import { useState, useEffect } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";

export function useAwardCeremony() {
  const pendingCeremonies = useGameWithShallow(
    (s: StoreType) => s.pendingAwardCeremonies,
  );
  const clearPendingCeremonies = useGame((s: StoreType) => s.clearPendingCeremonies);
  const [showCeremony, setShowCeremony] = useState(false);

  useEffect(() => {
    if (pendingCeremonies && pendingCeremonies.length > 0) {
      setShowCeremony(true);
    }
  }, [pendingCeremonies]);

  return {
    showCeremony,
    setShowCeremony,
    pendingCeremonies,
    clearPendingCeremonies,
  };
}
