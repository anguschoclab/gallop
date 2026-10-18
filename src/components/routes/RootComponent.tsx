import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "../AppShell";
import { useCallback, useEffect, useState } from "react";
import { rehydrateStore, useGame, initEngineWorker, initInitializationWorker } from "@/game/store";
import { saveExists, hydrationComplete } from "@/game/store/storage";

export function RootComponent() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [rehydrateError, setRehydrateError] = useState<Error | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const navigate = useNavigate();

  const doRehydrate = useCallback(() => {
    setRehydrateError(null);
    setTimedOut(false);
    setIsHydrated(false);

    const timeout = setTimeout(() => {
      if (!hydrationComplete.value) setTimedOut(true);
    }, 5000);

    rehydrateStore(useGame)
      .then(() => {
        setIsHydrated(true);
      })
      .catch((error) => {
        setRehydrateError(error);
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    // Initialize workers early so they're ready when the user advances days
    initEngineWorker()?.catch(() => {});
    initInitializationWorker()?.catch(() => {});
  }, []);

  useEffect(() => {
    doRehydrate();
  }, [doRehydrate]);

  const runEnded = useGame((s) => s.runEnded ?? false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!saveExists.value) {
      navigate({ to: "/start" }).catch((error) => {
        console.error("Navigation error:", error);
      });
      return;
    }
    if (runEnded && typeof window !== "undefined" && window.location.pathname !== "/epilogue") {
      navigate({ to: "/epilogue" }).catch(() => {});
    }
  }, [isHydrated, saveExists, runEnded, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (rehydrateError || timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-cream font-[family-name:var(--font-display)] mb-4">
            {timedOut ? "Loading timed out" : "Failed to load"}
          </h2>
          <p className="text-sm text-cream-muted font-[family-name:var(--font-body)] mb-6">
            {rehydrateError
              ? rehydrateError.message
              : "The game took too long to load. This might be a storage issue."}
          </p>
          <button
            onClick={doRehydrate}
            className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-gold/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">Loading...</p>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
